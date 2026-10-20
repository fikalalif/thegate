# ARCHITECTURE DECISION RECORDS (ADR) — THEGATE

This document records foundational architectural decisions for **TheGate**, their technical context, evaluated alternatives, decision rationale, and consequences.

---

## ADR-001: Modular Monolith Architecture for MVP

### Status
**Accepted**

### Context
TheGate is an open-source, self-hosted LLM routing and AI cost optimization platform. The initial target personas are AI application developers, indie hackers, and small startups. Deployability must be minimal (single-node Docker Compose). Microservices, distributed message brokers (Kafka/RabbitMQ), and distributed caches (Redis) would impose significant operational overhead and hardware resource burdens.

### Decision
Adopt a **Modular Monolith** architecture:
- **Backend**: Python 3.11+ using FastAPI, Pydantic v2, SQLAlchemy 2.0 (asyncio), and Alembic.
- **Frontend**: Next.js 14+ (App Router, TypeScript, Tailwind CSS).
- **Database**: PostgreSQL 16.
- **Orchestration**: Docker Compose.

Reject microservices, distributed queues, and Redis for the initial MVP release. Background tasks (e.g. metadata persistence and cost accounting) are processed in-process via FastAPI `BackgroundTasks` or async worker loops.

### Consequences
**Positive:**
- Zero distributed system overhead; single command launch (`docker compose up -d`).
- ACID transactions, atomic schema migrations, and simple local debugging.
- Low memory footprint (<500MB total idle RAM).

**Trade-offs / Mitigations:**
- Scaling is vertical for MVP. As traffic grows, backend and database can be horizontally decoupled without architectural redesign.

---

## ADR-002: Provider Adapter Pattern for Backend Decoupling

### Status
**Accepted**

### Context
TheGate acts as an optimization layer in front of model gateways and providers. While **9Router** is the initial backend integration, core routing logic, policy evaluations, and data models must never couple directly to 9Router-specific endpoints or schemas.

### Decision
Introduce a strict **Provider Adapter Abstraction** (`BaseProviderAdapter`). The core routing engine and API endpoints interact solely with unified internal domain models (`UnifiedChatRequest`, `ModelCandidate`, `UnifiedChatResponse`, `StreamChunk`).

The `NineRouterAdapter` encapsulates:
- Translating unified domain requests into 9Router-specific HTTP requests.
- Normalizing 9Router HTTP status codes, headers, and error bodies into unified domain exceptions.
- Consuming Server-Sent Events (SSE) from 9Router and yielding unified stream chunks.
- Extracting upstream token usage metadata.

### Consequences
**Positive:**
- Provider independence: supporting direct OpenAI, Anthropic, LiteLLM, or Ollama in future phases requires only adding a new adapter class without touching the policy engine.
- Unit testing can mock `BaseProviderAdapter` deterministically without real network calls.

---

## ADR-003: Deterministic Rule-Based Strategy for MVP Routing Engine

### Status
**Accepted**

### Context
Intelligent model routing can range from simple deterministic heuristics (context size, price thresholds, model capabilities) to complex ML models (RouteLLM matrix factorization, BERT classifiers). RouteLLM introduces significant dependencies (PyTorch, transformers, HuggingFace weights >2GB), slow Docker builds, and CPU inference latency (>150ms). NFR-001 mandates a routing decision latency p95 < 100ms.

### Decision
1. Define a clean `BaseRoutingStrategy` interface.
2. Implement **`RuleBasedStrategy`** as the core routing engine for the MVP:
   - Zero machine learning dependencies.
   - Decision latency < 5ms on standard CPU.
   - Deterministic policy enforcement (`Economy`, `Balanced`, `Quality`).
3. Defer **RouteLLM** to Phase 3 / post-MVP evaluation as an optional experimental plugin.

### Consequences
**Positive:**
- Fast, predictable, auditable routing decisions.
- Backend Docker image stays lightweight (~150MB).
- Establishes a transparent baseline against which ML-based routers can be objectively compared later.

---

## ADR-004: Privacy by Default (Zero Prompt & Completion Persistence)

### Status
**Accepted**

### Context
Developers routing proprietary, sensitive, or user-facing prompts through TheGate must trust that the gateway does not leak confidential data or violate privacy compliance (GDPR, HIPAA, SOC 2).

### Decision
- **Never persist prompt text or completion text by default.**
- The `requests` table schema omits prompt text and completion text columns entirely.
- The system logs exclusively metadata: request ID, API key ID, policy mode, selected model, input tokens, output tokens, cost calculations, latency timestamps, and sanitized error categories.
- Never log `Authorization` headers, provider secrets, or bearer tokens in application logs.

### Consequences
**Positive:**
- Absolute developer and organizational trust.
- Minimal database storage requirements.
- Zero risk of prompt data leakage through database compromises or log exports.

---

## ADR-005: Cost Accounting Integrity & Explicit Cost States

### Status
**Accepted**

### Context
Inaccurate cost calculations erode trust. If upstream pricing is missing or upstream token usage is omitted, defaulting cost silently to $0.00 produces false cost savings claims.

### Decision
1. Cost calculations must reflect explicit audit states using an Enum: `PROVIDER_REPORTED`, `ESTIMATED`, or `UNKNOWN`.
2. Missing pricing or missing token usage **must never default silently to zero**. If pricing is unavailable, `cost_amount` is `NULL` and `cost_type` is `UNKNOWN`.
3. Model pricing is versioned in `model_pricing` with `effective_from` and `effective_until` timestamps so historical requests retain immutable pricing snapshots.
4. When calculating baseline savings, if either the actual cost or baseline cost is `UNKNOWN`, the savings percentage calculation is aborted and flagged as uncomputable.

### Consequences
**Positive:**
- Absolute measurement integrity (*Measurement before optimization* principle).
- Full auditability for engineering and finance teams.

---

## ADR-006: Streaming Semantics & Safe Fallback Boundaries

### Status
**Accepted**

### Context
In streaming chat completions (`stream: true`), tokens are streamed to the client via Server-Sent Events (SSE). If upstream fails or disconnects after tokens have already been emitted to the client, attempting a fallback to another model produces corrupted, duplicate, or contradictory text.

### Decision
1. **Fallback is strictly prohibited once streaming output has commenced.**
2. If an upstream failure occurs *before* any response bytes have been transmitted to the client, the gateway may safely attempt bounded fallback to an alternate eligible model.
3. Once the first byte/chunk is transmitted to the client, any subsequent upstream failure immediately terminates the stream with a standard SSE error event.
4. Each attempt (whether initial or fallback) is logged in `request_attempts` to ensure accurate attribution and prevent double-counting token costs.

### Consequences
**Positive:**
- Protects client applications from garbled streaming text.
- Clear, deterministic failure semantics.

---

## ADR-007: API Key Hashing Design & Authentication

### Status
**Accepted**

### Context
TheGate requires API keys for inference endpoint access. Storing plaintext API keys in the database poses a major security vulnerability if the database is exposed.

### Decision
- API keys use the format `tg_live_<random_32_chars>`.
- Only the **key prefix** (first 10 characters, e.g. `tg_live_a1b2...`) is stored in plaintext in the database to allow user identification on the dashboard.
- The full key is hashed using **SHA-256** (with constant-time comparison) and stored as `key_hash`.
- The plaintext API key is shown to the user **exactly once** upon creation and can never be retrieved again.
- Revocation is instantaneous via setting `status = 'revoked'` and timestamping `revoked_at`.

### Consequences
**Positive:**
- Industry-standard API key security (similar to Stripe, OpenAI, GitHub).
- Compromise of the database does not leak usable API keys.

---

## ADR-008: Non-Blocking Background Persistence Strategy

### Status
**Accepted**

### Context
Logging request metadata, routing decision rationales, and calculating token costs must not introduce latency to the critical response path, especially during streaming completions.

### Decision
- The API gateway dispatches client responses immediately.
- Once the response is returned (or the stream completes), a FastAPI `BackgroundTask` executes the persistence routine: parsing token usage, calculating financial costs, and inserting records into `requests`, `routing_decisions`, and `request_attempts`.
- Database write errors during background logging are captured and logged to stderr without interrupting the client connection.

### Consequences
**Positive:**
- Zero latency overhead added to the client response stream.
- Keeps deployment simple without needing Celery or Redis.

---

## ADR-009: In-Process Mock 9Router Server for Automated Testing

### Status
**Accepted**

### Context
Automated CI/CD and developer local test runs require end-to-end integration testing of the provider adapter and completions API without requiring live 9Router credentials or incurring upstream monetary costs.

### Decision
- Implement an in-process mock HTTP server (using `pytest-httpx` or an asynchronous ASGI mock app) that emulates 9Router's exact streaming SSE and non-streaming JSON responses, error codes (401, 429, 500), and latency delays.
- Real 9Router integration testing is maintained via an optional test suite enabled only when `NINEROUTER_API_KEY` is provided.

### Consequences
**Positive:**
- 100% reproducible, deterministic automated test suite that runs in seconds without internet access.
- Prevents accidental upstream costs during testing.
