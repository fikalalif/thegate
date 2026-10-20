# MASTER IMPLEMENTATION PLAN — THEGATE (MVP)

**Document Status:** Ready for Review  
**Strategy:** Phased, Test-Driven, Milestone-Based Execution  
**Source of Truth:** `docs/PRD.md`, `docs/TECHNICAL_DESIGN.md`, `docs/ARCHITECTURE_DECISIONS.md`  

---

## 1. Executive Summary & Architectural Pre-Conditions

This document defines the sequential implementation plan for the **TheGate** Minimum Viable Product (MVP). It breaks down the engineering effort into 15 small, independently verifiable milestones.

### 1.1 Architectural Decisions Finalized
The following decisions from `docs/ARCHITECTURE_DECISIONS.md` are locked:
- **ADR-001 (Modular Monolith):** FastAPI + SQLAlchemy 2.0 (asyncio) + PostgreSQL 16 + Next.js 14. No microservices, Kafka, or Redis.
- **ADR-002 (Provider Adapter Pattern):** Strict abstraction (`BaseProviderAdapter`) isolating the core engine from 9Router.
- **ADR-003 (Rule-Based Routing First):** Deterministic heuristic strategy for MVP (< 5ms latency). RouteLLM is deferred to Phase 3.
- **ADR-004 (Privacy by Default):** Zero persistence of prompt or completion text. Metadata-only logging.
- **ADR-005 (Cost Accounting Integrity):** Explicit states (`PROVIDER_REPORTED`, `ESTIMATED`, `UNKNOWN`). Unknown pricing never defaults to $0.00.
- **ADR-006 (Streaming Semantics):** Zero-buffering passthrough. Strictly NO fallback once streaming bytes have been dispatched to the client.
- **ADR-007 (API Key Security):** SHA-256 key hashing with plaintext prefix identification.
- **ADR-008 (Non-Blocking Logging):** Persistence handled via FastAPI `BackgroundTasks`.
- **ADR-009 (In-Process Mock Upstream):** Deterministic mock adapter for CI and automated testing.

### 1.2 Unresolved Assumptions & Blockers Requiring Explicit Verification
1. **9Router Streaming Usage Payload:** Does 9Router return the final token count chunk when `stream_options.include_usage = true`?
   - *Mitigation Plan:* Milestone 5 verifies this. If omitted, Milestone 10 implements a deterministic `tiktoken` fallback marked as `cost_type = 'ESTIMATED'`.
2. **Upstream Network Availability:** Is 9Router accessible locally or remotely during testing?
   - *Mitigation Plan:* Milestone 4 & 5 provide a hermetic in-process mock server so development and automated tests run with zero external network dependencies.

### 1.3 External Dependency Compatibility Matrix

| Dependency | Purpose | Target Version | Compatibility Risk & Verification Method |
| :--- | :--- | :--- | :--- |
| **Python** | Runtime | 3.11+ | Verify asyncio support and Pydantic v2 compatibility. |
| **FastAPI** | Web Framework | ^0.110.0 | High performance ASGI gateway with native streaming response support. |
| **Pydantic** | Schema & Settings | ^2.6.0 | Strict type validation and settings management. |
| **SQLAlchemy** | Database ORM | ^2.0.28 | Async engine (`asyncpg`) with strict typed query definitions. |
| **Alembic** | DB Migrations | ^1.13.0 | Schema migration tracking and rollback validation. |
| **HTTPX** | Async HTTP Client | ^0.27.0 | Upstream connection pooling, streaming SSE consumption, and timeout controls. |
| **PostgreSQL** | Relational DB | 16-alpine | ACID transactional consistency, UUIDv4, JSONB indexing. |
| **Next.js** | Frontend UI | ^14.2.0 | App router, Server components, Tailwind CSS integration. |

---

## 2. Milestone Breakdown

```
M01: Scaffolding & Configuration
  │
M02: Database Schema & Migrations
  │
M03: Authentication & Security Engine
  │
M04: Provider Adapter Contract & Domain Models
  │
M05: 9Router Integration & Upstream Client
  │
M06: Streaming & Client Cancellation Handling
  │
M07: OpenAI-Compatible Inference API
  │
M08: Routing Policy Engine & Rule-Based Strategy
  │
M09: Request Attempts & Decision Audit Logging
  │
M10: Cost Accounting & Baseline Comparison
  │
M11: Analytics API & Log Explorer
  │
M12: Frontend Developer Analytics Dashboard
  │
M13: Security Testing & Guardrails Hardening
  │
M14: Docker Compose Deployment & Operational Readiness
  │
M15: Reproducible Cost & Quality Benchmarks
```

---

### Milestone 1: Project Scaffolding, Configuration & Health Engine

- **Goal:** Establish a clean, typed Python backend workspace with centralized configuration management, structured logging, dependency management, and basic health probe endpoints.
- **Prerequisites:** None.
- **Tasks:**
  1. Initialize `backend/pyproject.toml` with pinned dependencies (`fastapi`, `uvicorn`, `pydantic-settings`, `httpx`, `pytest`, `ruff`).
  2. Implement `backend/app/core/config.py` using `pydantic-settings` to validate `.env` variables with strict defaults.
  3. Implement centralized JSON/structured logging in `backend/app/core/logging.py` ensuring secret redaction.
  4. Create `backend/app/main.py` mounting the FastAPI application with CORS and basic middleware.
  5. Implement `GET /health` (liveness probe) and `GET /ready` (readiness probe stub).
- **Files Expected to Change:**
  - `backend/pyproject.toml`
  - `backend/app/core/config.py`
  - `backend/app/core/logging.py`
  - `backend/app/api/v1/health.py`
  - `backend/app/main.py`
  - `tests/unit/test_config.py`
  - `tests/unit/test_health.py`
- **Acceptance Criteria:**
  - `uvicorn app.main:app` boots without warnings or errors.
  - `GET /health` returns HTTP 200 with `{"status": "ok", "app": "TheGate"}`.
  - Missing critical environment variables fail fast with human-readable validation errors.
  - Code passes `ruff check .` with zero errors.
- **Required Tests:**
  - `test_config_loads_defaults`: Asserts default values when env vars are omitted.
  - `test_config_rejects_invalid_types`: Asserts error when port is not an integer.
  - `test_health_endpoint`: Asserts HTTP 200 and schema response.
- **Failure Conditions:**
  - Application starts with unvalidated configuration or crashes on startup.
- **Definition of Done:**
  - Unit tests pass; linting clean; health probes respond correctly.

---

### Milestone 2: Database Schema, Entities & Alembic Migrations

- **Goal:** Define all PostgreSQL database models using SQLAlchemy 2.0 (asyncio) and establish repeatable Alembic migrations for all MVP entities.
- **Prerequisites:** Milestone 1.
- **Tasks:**
  1. Setup `backend/app/db/session.py` with `create_async_engine` and async session maker.
  2. Define `backend/app/db/base.py` declarative base.
  3. Implement SQLAlchemy models:
     - `ApiKey`: id, name, key_prefix, key_hash, status, created_at, last_used_at, revoked_at.
     - `RoutingPolicy`: id, name, mode, configuration, version, is_active, created_at, updated_at.
     - `ModelRegistry`: id, internal_name, backend_model_id, provider_adapter, capabilities, context_limit, enabled.
     - `ModelPricing`: id, model_id, input_price_per_million, output_price_per_million, currency, effective_from, effective_until, source.
     - `Request`: id, api_key_id, routing_policy_id, timestamp, status, selected_model_id, input_tokens, output_tokens, cost_amount, cost_type, baseline_cost_amount, estimated_savings_percent, latencies.
     - `RoutingDecision`: id, request_id, strategy_name, strategy_version, selected_model_id, decision_reason, candidate_summary, decision_latency_ms.
     - `RequestAttempt`: id, request_id, attempt_number, model_id, status, error_category, started_at, completed_at, usage_metadata.
  4. Initialize Alembic with `asyncpg` support and generate migration `001_initial_schema.py`.
  5. Update `GET /ready` to verify database connectivity.
- **Files Expected to Change:**
  - `backend/app/db/session.py`
  - `backend/app/db/base.py`
  - `backend/app/db/models/*.py`
  - `backend/alembic.ini`
  - `backend/migrations/env.py`
  - `backend/migrations/versions/001_initial_schema.py`
  - `backend/app/api/v1/health.py`
  - `tests/integration/test_db_migrations.py`
- **Acceptance Criteria:**
  - `alembic upgrade head` runs cleanly on PostgreSQL.
  - `alembic downgrade base` executes cleanly without orphan constraints.
  - `GET /ready` returns HTTP 200 when DB is reachable, HTTP 503 when DB is down.
  - UUIDv4 primary keys and UTC timezone enforcement verified on all models.
- **Required Tests:**
  - `test_migration_upgrade_and_downgrade`: Verifies migration roundtrip.
  - `test_db_entity_crud`: Creates and reads back records for each model.
  - `test_readiness_probe_with_db`: Verifies `/ready` status toggles based on DB connectivity.
- **Failure Conditions:**
  - Alembic migration fails; models lack foreign key constraints; prompt content columns exist in schema.
- **Definition of Done:**
  - Migrations validated against real PostgreSQL test instance; tests pass.

---

### Milestone 3: Authentication & Security Engine

- **Goal:** Implement secure API key generation, verification, and revocation mechanisms with constant-time cryptographic operations.
- **Prerequisites:** Milestone 2.
- **Tasks:**
  1. Implement `backend/app/core/security.py` with:
     - `generate_api_key()`: Creates `tg_live_<32_random_bytes>`.
     - `hash_api_key(raw_key)`: Computes SHA-256 hash.
     - `verify_api_key(raw_key, stored_hash)`: Constant-time comparison (`secrets.compare_digest`).
     - Key prefix extraction (first 10 chars).
  2. Implement FastAPI dependency `get_current_api_key` in `backend/app/api/deps.py`:
     - Reads `Authorization: Bearer <key>`.
     - Queries `api_keys` where `key_hash = hash(raw_key)` and `status = 'active'`.
     - Returns 401 if missing, invalid, or revoked.
     - Updates `last_used_at` asynchronously.
  3. Implement API Key administrative endpoints:
     - `POST /api/v1/keys`: Create key (returns plaintext key once).
     - `GET /api/v1/keys`: List keys (metadata and prefix only).
     - `DELETE /api/v1/keys/{id}`: Revoke key.
- **Files Expected to Change:**
  - `backend/app/core/security.py`
  - `backend/app/api/deps.py`
  - `backend/app/api/v1/keys.py`
  - `backend/app/schemas/keys.py`
  - `tests/unit/test_security.py`
  - `tests/integration/test_keys_api.py`
- **Acceptance Criteria:**
  - Plaintext key is returned only during creation. Database stores only `key_hash` and `key_prefix`.
  - Revoked key (`status = 'revoked'`) immediately returns HTTP 401.
  - Missing or malformed `Authorization` header returns HTTP 401 with standard error format.
- **Required Tests:**
  - `test_api_key_hashing_and_verification`: Verifies constant-time verification.
  - `test_revoked_key_rejected`: Verifies revoked key cannot authenticate.
  - `test_key_creation_returns_plaintext_once`: Verifies database inspection does not reveal plaintext key.
- **Failure Conditions:**
  - Plaintext key saved in database; timing attacks possible via standard string equality (`==`).
- **Definition of Done:**
  - All security unit tests pass; key management API endpoints operational.

---

### Milestone 4: Provider Adapter Contract & Domain Models

- **Goal:** Define the provider-agnostic domain models and the abstract provider adapter contract (`BaseProviderAdapter`), ensuring complete decoupling from any specific provider.
- **Prerequisites:** Milestone 1.
- **Tasks:**
  1. Define unified domain schemas in `backend/app/schemas/provider.py`:
     - `UnifiedChatRequest`: messages, model, temperature, max_tokens, stream, tools, response_format.
     - `UnifiedChatResponse`: id, model, choices (message, finish_reason), usage (prompt_tokens, completion_tokens, total_tokens).
     - `StreamChunk`: id, model, delta (content, role), finish_reason, usage.
     - `ModelCandidate`: id, internal_name, backend_model_id, capabilities, context_limit.
  2. Define abstract contract `backend/app/adapters/base.py`:
     ```python
     class BaseProviderAdapter(ABC):
         @abstractmethod
         async def execute(self, request: UnifiedChatRequest) -> UnifiedChatResponse: ...
         @abstractmethod
         async def stream(self, request: UnifiedChatRequest) -> AsyncIterator[StreamChunk]: ...
         @abstractmethod
         async def check_health(self) -> bool: ...
     ```
  3. Implement `MockProviderAdapter` in `backend/app/adapters/mock.py` for deterministic testing.
- **Files Expected to Change:**
  - `backend/app/schemas/provider.py`
  - `backend/app/adapters/base.py`
  - `backend/app/adapters/mock.py`
  - `tests/unit/test_mock_adapter.py`
- **Acceptance Criteria:**
  - `MockProviderAdapter` implements all abstract methods without error.
  - Streaming method yields valid `StreamChunk` objects matching domain schema.
  - Domain schemas reject invalid payload structures.
- **Required Tests:**
  - `test_mock_adapter_execute`: Verifies synchronous return of `UnifiedChatResponse`.
  - `test_mock_adapter_stream`: Verifies async iterator yields expected chunks and final finish reason.
- **Failure Conditions:**
  - Adapter interface depends directly on external provider library or 9Router-specific types.
- **Definition of Done:**
  - Abstract interface complete; mock adapter passes unit tests.

---

### Milestone 5: 9Router Integration & Upstream HTTP Client

- **Goal:** Implement `NineRouterAdapter` using an asynchronous HTTP client (`httpx.AsyncClient`) with connection pooling, timeout bounds, model ID mapping, and upstream error translation.
- **Prerequisites:** Milestone 4.
- **Tasks:**
  1. Implement `backend/app/adapters/ninerouter.py` implementing `BaseProviderAdapter`.
  2. Implement model identifier translation (internal model name -> 9Router backend model ID).
  3. Implement non-streaming `execute()` method:
     - Serializes `UnifiedChatRequest` into 9Router POST payload.
     - Attaches `Authorization: Bearer <NINEROUTER_API_KEY>`.
     - Enforces timeout bounds (connect: 5s, read: 60s).
     - Deserializes upstream JSON response into `UnifiedChatResponse`.
  4. Implement domain error translation in `backend/app/core/exceptions.py`:
     - 401/403 -> `ProviderAuthenticationError`
     - 429 -> `ProviderRateLimitError`
     - 500/502/503 -> `ProviderUnavailableError`
     - Timeout -> `ProviderTimeoutError`
- **Files Expected to Change:**
  - `backend/app/adapters/ninerouter.py`
  - `backend/app/core/exceptions.py`
  - `tests/unit/test_adapter_ninerouter.py`
- **Acceptance Criteria:**
  - Correct model ID mapping applied to upstream requests.
  - Upstream 429, 500, and timeouts mapped to internal exceptions without leaking credentials.
  - Responses cleanly parsed into `UnifiedChatResponse`.
- **Required Tests:**
  - `test_ninerouter_execute_success`: Verifies successful request parsing via mocked HTTP response.
  - `test_ninerouter_error_mapping`: Asserts HTTP 429 maps to `ProviderRateLimitError`.
  - `test_ninerouter_timeout_handling`: Asserts timeout triggers `ProviderTimeoutError`.
  - `test_ninerouter_redacts_auth_header`: Asserts exception logs do not contain upstream API key.
- **Failure Conditions:**
  - Unhandled upstream HTTP errors cause unhandled 500 crashes; API keys exposed in error text.
- **Definition of Done:**
  - Unit tests pass against mock upstream server with 100% error scenario coverage.

---

### Milestone 6: Streaming & Client Cancellation Handling

- **Goal:** Implement robust Server-Sent Events (SSE) streaming in `NineRouterAdapter` with zero-buffering passthrough, client disconnect handling, and strict fallback boundaries (ADR-006).
- **Prerequisites:** Milestone 5.
- **Tasks:**
  1. Implement `stream()` in `NineRouterAdapter`:
     - Consumes upstream SSE lines using `httpx.AsyncClient.stream("POST", ...)`.
     - Parses `data: {...}` JSON chunks and yields `StreamChunk`.
     - Detects terminal `data: [DONE]`.
     - Captures `usage` object if present in the final chunk.
  2. Implement client cancellation detection (via `request.is_disconnected()`).
  3. Ensure zero-buffering: chunks are yielded to the caller immediately as bytes arrive.
  4. Enforce ADR-006 rule: once the first chunk has been yielded, no model fallback can be attempted.
- **Files Expected to Change:**
  - `backend/app/adapters/ninerouter.py`
  - `backend/app/core/streaming.py`
  - `tests/unit/test_streaming_adapter.py`
- **Acceptance Criteria:**
  - Streaming yields individual `StreamChunk` objects as received without buffering entire response.
  - Disconnect terminates upstream HTTP connection cleanly without orphan tasks.
  - Final chunk properly delivers finish reason and usage metadata if supplied.
- **Required Tests:**
  - `test_stream_chunk_passthrough`: Verifies sequential chunk delivery from mock SSE stream.
  - `test_stream_client_disconnect`: Simulates client disconnect and verifies upstream stream cleanup.
  - `test_stream_midstream_error_aborts_without_fallback`: Simulates error after chunk 2; verifies immediate error termination.
- **Failure Conditions:**
  - Entire stream is buffered in memory before returning; orphan upstream connections persist after client disconnect.
- **Definition of Done:**
  - Streaming tests pass; memory usage remains constant regardless of stream length.

---

### Milestone 7: OpenAI-Compatible Inference API

- **Goal:** Expose the public endpoint `POST /v1/chat/completions` accepting standard OpenAI requests and returning compliant streaming and non-streaming responses.
- **Prerequisites:** Milestone 3, 5, 6.
- **Tasks:**
  1. Define OpenAI request/response schemas in `backend/app/schemas/openai.py`:
     - `ChatCompletionRequest`: model, messages, stream, temperature, max_tokens, tools, etc.
     - `ChatCompletionResponse`: OpenAI-compliant JSON payload.
  2. Implement `POST /v1/chat/completions` in `backend/app/api/v1/completions.py`:
     - Validates incoming API key via `get_current_api_key`.
     - Generates unique `request_id` (UUIDv4) and injects `X-Request-ID` header.
     - Translates OpenAI request to `UnifiedChatRequest`.
     - Dispatches to adapter.
     - Returns `JSONResponse` (for `stream=False`) or `StreamingResponse(media_type="text/event-stream")` (for `stream=True`).
  3. Standardize error responses to match OpenAI error envelope:
     ```json
     { "error": { "message": "...", "type": "invalid_request_error", "code": "..." } }
     ```
- **Files Expected to Change:**
  - `backend/app/schemas/openai.py`
  - `backend/app/api/v1/completions.py`
  - `backend/app/main.py`
  - `tests/integration/test_completions_api.py`
- **Acceptance Criteria:**
  - Official OpenAI Python SDK (`openai.OpenAI(base_url="http://localhost:8000/v1")`) works seamlessly against TheGate for non-streaming and streaming calls.
  - `X-Request-ID` present on all responses.
  - Malformed payload returns HTTP 422 with OpenAI-compatible error schema.
- **Required Tests:**
  - `test_completions_non_streaming`: Invokes `/v1/chat/completions` and validates JSON structure.
  - `test_completions_streaming_sse`: Consumes SSE stream and validates `data: ` formatting and `[DONE]`.
  - `test_completions_unauthorized`: Requests without API key receive HTTP 401.
- **Failure Conditions:**
  - Response structure violates OpenAI spec; client SDK throws parsing exceptions.
- **Definition of Done:**
  - Integration tests pass using standard HTTP requests and official client patterns.

---

### Milestone 8: Routing Policy Engine & Deterministic Rule-Based Strategy

- **Goal:** Implement the Request Analyzer, Model Registry, and deterministic `RuleBasedStrategy` supporting `Economy`, `Balanced`, and `Quality` routing modes.
- **Prerequisites:** Milestone 7.
- **Tasks:**
  1. Implement `backend/app/engine/analyzer.py`:
     - Estimates context length (character and token estimation).
     - Identifies technical constraints (e.g. `tools` present, `response_format={"type": "json_object"}`).
  2. Implement `backend/app/engine/policy.py`:
     - Evaluates model eligibility against hard constraints (model enabled, context limit >= input length, tool support).
     - Resolves routing policy (`Economy`, `Balanced`, `Quality`).
  3. Implement `backend/app/engine/strategy/base.py` and `rule_based.py`:
     - `Economy`: Selects lowest token cost eligible model.
     - `Quality`: Selects highest tier benchmarked model.
     - `Balanced`: Selects the optimal trade-off model.
  4. Integrate routing engine into `POST /v1/chat/completions`:
     - If client specifies a registered model name directly, honor explicit selection.
     - If client specifies a policy or virtual model (e.g., `thegate-auto`), execute policy router.
  5. Implement Policy CRUD endpoints in `backend/app/api/v1/policies.py`.
- **Files Expected to Change:**
  - `backend/app/engine/analyzer.py`
  - `backend/app/engine/policy.py`
  - `backend/app/engine/strategy/base.py`
  - `backend/app/engine/strategy/rule_based.py`
  - `backend/app/api/v1/policies.py`
  - `backend/app/api/v1/completions.py`
  - `tests/unit/test_routing_engine.py`
  - `tests/integration/test_routed_completions.py`
- **Acceptance Criteria:**
  - Context limit violation eliminates ineligible candidate.
  - Request with `tools` filters out models lacking function calling capability.
  - `Economy` mode accurately selects the lowest price model.
  - Routing decision executes in < 5ms on CPU.
- **Required Tests:**
  - `test_analyzer_detects_tools_and_context`: Asserts feature detection.
  - `test_eligibility_filter_excludes_ineligible`: Models with insufficient context are rejected.
  - `test_economy_mode_picks_cheapest`: Asserts lowest-cost model selection.
  - `test_quality_mode_picks_top_tier`: Asserts top-tier model selection.
- **Failure Conditions:**
  - Model without tool capability selected for tool-based request; router takes > 50ms.
- **Definition of Done:**
  - Unit and integration tests verify deterministic routing across all policy modes.

---

### Milestone 9: Request Attempts & Decision Audit Logging

- **Goal:** Implement non-blocking persistence for routing decisions, request attempts, and overall request metadata (ADR-004, ADR-008).
- **Prerequisites:** Milestone 2, 8.
- **Tasks:**
  1. Implement `backend/app/engine/persistence.py`:
     - Inserts record into `requests` (request ID, model selected, timestamps, status).
     - Inserts record into `routing_decisions` (strategy name, version, decision reason, candidates considered, decision latency).
     - Inserts record into `request_attempts` (attempt number, model ID, status, usage metadata).
  2. Wire persistence routine into FastAPI `BackgroundTasks` in `POST /v1/chat/completions`.
  3. Ensure complete privacy enforcement: prompt text and completion text are strictly excluded from all insert payloads.
  4. Track latency breakdown: `routing_latency_ms`, `provider_latency_ms`, `total_duration_ms`.
- **Files Expected to Change:**
  - `backend/app/engine/persistence.py`
  - `backend/app/api/v1/completions.py`
  - `tests/integration/test_audit_logging.py`
- **Acceptance Criteria:**
  - Every completed completion request creates records in `requests`, `routing_decisions`, and `request_attempts`.
  - Background database write does not add latency to client response.
  - Database verification proves zero prompt or completion text is written.
- **Required Tests:**
  - `test_request_persistence_creates_records`: Verifies all three tables populated.
  - `test_privacy_enforcement_no_prompt_stored`: Directly queries DB to assert prompt text is absent.
  - `test_latency_metrics_recorded`: Verifies latency breakdown is populated and non-negative.
- **Failure Conditions:**
  - Background persistence blocks HTTP response; prompt text written to database; database failure crashes client connection.
- **Definition of Done:**
  - Audit logging integration tests pass; privacy compliance verified.

---

### Milestone 10: Cost Accounting & Baseline Comparison Engine

- **Goal:** Implement the versioned pricing catalog, token usage parsing, financial cost calculation, and counterfactual baseline comparison engine (ADR-005).
- **Prerequisites:** Milestone 2, 9.
- **Tasks:**
  1. Implement `backend/app/engine/accounting.py`:
     - Fetches active pricing record from `model_pricing` for selected model.
     - Computes:
       $$\text{input\_cost} = \frac{\text{input\_tokens} \times \text{input\_price\_per\_million}}{1,000,000}$$
       $$\text{output\_cost} = \frac{\text{output\_tokens} \times \text{output\_price\_per\_million}}{1,000,000}$$
       $$\text{total\_cost} = \text{input\_cost} + \text{output\_cost}$$
     - Marks `cost_type` as `PROVIDER_REPORTED`, `ESTIMATED`, or `UNKNOWN`.
     - Never defaults missing pricing to zero (cost remains `NULL` with `UNKNOWN` status).
  2. Implement Counterfactual Baseline Comparison:
     - Fetches pricing for configured baseline model (e.g. `gpt-4o`).
     - Computes baseline cost using actual request tokens.
     - Computes savings percentage:
       $$\text{savings\_percent} = \frac{\text{baseline\_cost} - \text{actual\_cost}}{\text{baseline\_cost}} \times 100$$
     - If baseline cost or actual cost is `UNKNOWN` or 0, savings is marked `NULL`.
  3. Implement Model Registry and Pricing CRUD endpoints in `backend/app/api/v1/models.py`.
- **Files Expected to Change:**
  - `backend/app/engine/accounting.py`
  - `backend/app/api/v1/models.py`
  - `backend/app/schemas/models.py`
  - `tests/unit/test_cost_accounting.py`
  - `tests/integration/test_baseline_comparison.py`
- **Acceptance Criteria:**
  - Exact financial math verified using `Decimal` / `NUMERIC(12, 6)`.
  - Unregistered model pricing flagged as `UNKNOWN` without crashing.
  - Baseline comparison correctly computes savings percentage against reference model.
- **Required Tests:**
  - `test_cost_calculation_exact`: Asserts mathematical accuracy with fractional cents.
  - `test_unknown_pricing_not_zero`: Asserts missing pricing yields `cost_type = 'UNKNOWN'` and `cost_amount = None`.
  - `test_baseline_savings_calculation`: Asserts counterfactual savings percentage computation.
- **Failure Conditions:**
  - IEEE float rounding errors occur; missing price treated as $0.00; negative baseline handled incorrectly.
- **Definition of Done:**
  - Unit tests for accounting math pass; baseline engine validated.

---

### Milestone 11: Analytics API & Log Explorer Endpoints

- **Goal:** Implement the aggregation analytics endpoints and filterable request log explorer API for the dashboard.
- **Prerequisites:** Milestone 9, 10.
- **Tasks:**
  1. Implement `GET /api/v1/analytics/overview`:
     - Total requests, successful vs failed.
     - Total estimated cost and baseline cost.
     - Net cost savings ($ and %).
     - Average and p95 latencies.
  2. Implement `GET /api/v1/analytics/models`:
     - Model request distribution (percentage per model).
     - Cost breakdown by model.
  3. Implement `GET /api/v1/analytics/costs`:
     - Time-series cost aggregation (daily/hourly).
  4. Implement `GET /api/v1/requests` (Log Explorer):
     - Server-side pagination (`limit`, `offset`).
     - Filters: `model`, `status`, `policy_id`, `start_date`, `end_date`.
     - Sorting by timestamp descending.
  5. Implement `GET /api/v1/requests/{id}`:
     - Returns full metadata, routing decision rationale, and attempt breakdown.
- **Files Expected to Change:**
  - `backend/app/api/v1/analytics.py`
  - `backend/app/api/v1/requests.py`
  - `backend/app/schemas/analytics.py`
  - `tests/integration/test_analytics_api.py`
- **Acceptance Criteria:**
  - Overview endpoint returns correct aggregations across historical records.
  - Requests endpoint enforces pagination and filters efficiently without full table scans.
  - Log details endpoint provides routing decision rationale without exposing prompt text.
- **Required Tests:**
  - `test_analytics_overview_aggregation`: Validates metric totals across seeded test data.
  - `test_requests_pagination_and_filters`: Validates filtering by model and pagination limits.
  - `test_request_detail_contains_decision_reason`: Asserts decision rationale present in detail view.
- **Failure Conditions:**
  - SQL queries fail under empty database; aggregate queries return incorrect sums or SQL injection possible.
- **Definition of Done:**
  - Analytics integration tests pass; query execution times < 100ms on 10,000 seeded test records.

---

### Milestone 12: Frontend Developer Analytics Dashboard

- **Goal:** Build the developer-focused web dashboard using Next.js 14, TypeScript, and Tailwind CSS, consuming the backend analytics API.
- **Prerequisites:** Milestone 11.
- **Tasks:**
  1. Initialize Next.js project in `frontend/` with App Router, TypeScript, Tailwind CSS, Lucide icons.
  2. Implement typed API client in `frontend/src/lib/api.ts`.
  3. Build **Overview Page** (`/`):
     - Metrics cards: Total Requests, Total Spend, Baseline Savings %, p95 Latency.
     - Model distribution chart (Recharts or SVG pie/bar).
     - Recent requests preview table.
  4. Build **Requests Explorer** (`/requests`):
     - Filterable, paginated data table.
     - Slide-over drawer displaying routing decision rationale, attempt history, and token breakdown.
  5. Build **Routing Policies Page** (`/policies`):
     - View active policies and edit routing modes (`Economy`, `Balanced`, `Quality`).
  6. Build **Models & Pricing Page** (`/models`):
     - Table of models, context limits, and token pricing rates.
  7. Implement explicit component states: Loading skeleton, Empty state, Error state, Data state.
- **Files Expected to Change:**
  - `frontend/package.json`
  - `frontend/src/lib/api.ts`
  - `frontend/src/app/page.tsx`
  - `frontend/src/app/requests/page.tsx`
  - `frontend/src/app/policies/page.tsx`
  - `frontend/src/app/models/page.tsx`
  - `frontend/src/components/*`
- **Acceptance Criteria:**
  - `npm run build` succeeds with zero TypeScript or linting errors.
  - Dashboard renders backend data seamlessly.
  - Unknown cost records display clear *"Unverified"* badge.
  - No secret API keys exposed in frontend code.
- **Required Tests:**
  - TypeScript type check (`tsc --noEmit`).
  - Next.js build validation (`npm run build`).
  - Component rendering smoke test for empty and data states.
- **Failure Conditions:**
  - Build failure; unhandled API errors crash React rendering; prompt content displayed anywhere in UI.
- **Definition of Done:**
  - Next.js build clean; frontend pages functional and connected to backend API.

---

### Milestone 13: Security Testing & Guardrails Hardening

- **Goal:** Verify that TheGate resists common web vulnerabilities, enforces rate limiting, respects request size limits, and protects all sensitive data.
- **Prerequisites:** Milestone 7, 11, 12.
- **Tasks:**
  1. Implement request body size limiter middleware (reject payloads > 2MB with HTTP 413).
  2. Implement in-memory token-bucket rate limiter middleware per API key (HTTP 429 when threshold exceeded).
  3. Audit log outputs to ensure no `Authorization` headers, provider secrets, or bearer tokens are printed.
  4. Verify SQL injection resistance across all filter parameters.
  5. Configure strict CORS headers and security headers (CSP, X-Content-Type-Options).
- **Files Expected to Change:**
  - `backend/app/api/middleware.py`
  - `backend/app/main.py`
  - `tests/security/test_security_guards.py`
- **Acceptance Criteria:**
  - Requests exceeding 2MB receive HTTP 413.
  - Excess requests trigger HTTP 429 with `Retry-After` header.
  - Malicious SQL filter strings (`' OR 1=1 --`) safely escaped without error.
  - Log inspection proves zero secret leakage.
- **Required Tests:**
  - `test_payload_size_limit`: Submits 3MB payload, asserts HTTP 413.
  - `test_rate_limiter`: Sends rapid burst, asserts HTTP 429.
  - `test_sql_injection_defense`: Sends injection strings into request log filter parameters.
  - `test_secret_redaction_in_logs`: Validates log output sanitization.
- **Failure Conditions:**
  - Large payload exhausts server memory; rate limits bypassed; secrets exposed in logs.
- **Definition of Done:**
  - All automated security tests pass; zero high/critical vulnerabilities.

---

### Milestone 14: Docker Compose Deployment & Operational Readiness

- **Goal:** Provide a production-grade, single-command Docker Compose deployment with health checks, persistent volumes, environment validation, and migration auto-execution.
- **Prerequisites:** Milestone 1 through 13.
- **Tasks:**
  1. Create optimized multi-stage `backend/Dockerfile` (Python 3.11 slim).
  2. Create optimized multi-stage `frontend/Dockerfile` (Node 18 alpine, standalone output).
  3. Finalize `docker-compose.yml`:
     - Service `db` (PostgreSQL 16, persistent volume `pgdata`, health check).
     - Service `backend` (depends on healthy `db`, runs `alembic upgrade head` on startup, health check on `/health`).
     - Service `frontend` (depends on `backend`, port 3000).
  4. Write comprehensive `.env.example` with clear documentation.
  5. Verify cold-start bootstrap (`docker compose down -v && docker compose up -d`).
- **Files Expected to Change:**
  - `backend/Dockerfile`
  - `frontend/Dockerfile`
  - `docker-compose.yml`
  - `.env.example`
  - `README.md`
- **Acceptance Criteria:**
  - Single command `docker compose up -d` boots entire platform from scratch.
  - All services transition to `healthy` state within 30 seconds.
  - Alembic migrations execute automatically on backend container startup.
  - Data persists across container restarts.
- **Required Tests:**
  - End-to-end smoke test executing inference and inspecting dashboard on live Docker stack.
- **Failure Conditions:**
  - Container crashes on startup; database migrations fail; services fail health checks.
- **Definition of Done:**
  - Docker Compose verified on clean environment; clean startup and teardown.

---

### Milestone 15: Reproducible Cost & Quality Benchmarks

- **Goal:** Deliver an automated benchmarking script that compares TheGate's routing decisions against fixed baseline models on a standard task dataset to prove measurable cost savings and latency compliance (NFR-001).
- **Prerequisites:** Milestone 14.
- **Tasks:**
  1. Create a representative benchmark dataset of 50 varied prompts (short queries, summarization, tool use, code tasks) in `tests/benchmark/dataset.json`.
  2. Implement benchmark execution script `tests/benchmark/run_benchmark.py`:
     - Replays dataset against:
       - Baseline A: Fixed Flagship Model (e.g. GPT-4o).
       - Baseline B: Fixed Economy Model (e.g. GPT-4o-mini).
       - TheGate: Policy-driven routing (`Economy` and `Balanced`).
     - Measures: Total cost, average latency, routing decision overhead (p95), success rate.
  3. Validate NFR-001: Assert routing decision latency p95 is < 100ms.
  4. Generate automated markdown benchmark summary report.
- **Files Expected to Change:**
  - `tests/benchmark/dataset.json`
  - `tests/benchmark/run_benchmark.py`
  - `docs/BENCHMARK_RESULTS.md`
- **Acceptance Criteria:**
  - Benchmark runs deterministically against mock or live backend.
  - Routing decision latency p95 verified < 100ms.
  - Cost savings objectively demonstrated against flagship baseline.
  - Results exported to reproducible markdown report.
- **Required Tests:**
  - `test_benchmark_reproducibility`: Replays benchmark and asserts consistent metric calculation.
- **Failure Conditions:**
  - Routing latency p95 exceeds 100ms; cost calculations produce mathematical discrepancies.
- **Definition of Done:**
  - Automated benchmark passes; results documented in `docs/BENCHMARK_RESULTS.md`.

---

## 3. Milestone Summary & Dependency Map

| Milestone | Title | Focus Area | Depends On | Key Deliverable |
| :--- | :--- | :--- | :--- | :--- |
| **M01** | Scaffolding & Configuration | Project Setup | None | Working FastAPI app, Config validation, `/health` |
| **M02** | Database Schema & Migrations | Persistence | M01 | 7 SQLAlchemy models, Alembic migrations, `/ready` |
| **M03** | Authentication & Security Engine | Security | M02 | API Key hashing (SHA-256), Auth dependency, Key CRUD |
| **M04** | Provider Adapter Contract | Architecture | M01 | `BaseProviderAdapter`, Domain models, Mock adapter |
| **M05** | 9Router Integration | Provider | M04 | `NineRouterAdapter` (HTTP, error translation, pooling) |
| **M06** | Streaming & Cancellation Handling | Streaming | M05 | SSE streaming, zero-buffering, disconnect handling |
| **M07** | OpenAI-Compatible Inference API | Core API | M03, M05, M06 | `POST /v1/chat/completions` (OpenAI SDK drop-in) |
| **M08** | Routing Policy Engine | Routing | M07 | Analyzer, Eligibility filter, Rule-based strategy |
| **M09** | Request Attempts & Audit Logging | Observability | M02, M08 | Background persistence, decision rationale logging |
| **M10** | Cost Accounting & Baseline Engine | Accounting | M02, M09 | Token cost math, baseline savings %, unknown pricing handling |
| **M11** | Analytics API & Log Explorer | Analytics | M09, M10 | `/analytics/overview`, `/analytics/costs`, `/requests` log query |
| **M12** | Frontend Developer Dashboard | Frontend | M11 | Next.js UI (Overview, Requests table, Policies, Models) |
| **M13** | Security Testing & Hardening | Security | M07, M11, M12 | Rate limiting, 2MB body limit, SQL injection verification |
| **M14** | Docker Compose Deployment | Operations | M01-M13 | Single-command Docker Compose stack, health checks |
| **M15** | Reproducible Benchmarks | Verification | M14 | Latency p95 < 100ms verification, automated cost savings report |

---

## 4. Frontend Implementation Roadmap (Obsidian Telemetry)

In alignment with the **Frontend Implementation PRD v1.0**, the frontend implementation follows a strict 9-stage milestone plan (Milestones F0 through F8):

| Milestone | Title | Focus & Core Deliverables | Exit Criteria |
| :--- | :--- | :--- | :--- |
| **F0** | Repository Assessment | Audit existing frontend/backend artifacts, API contracts, dependencies, and document gaps | Assessment documented in `docs/` |
| **F1** | Shell & Design System | Obsidian Telemetry palette, Sidebar, Header, mobile drawer, typography, and contrast compliance | Navigation functional; clean responsive layout |
| **F2** | Command Center | Operational KPI bar, interactive routing flow diagram, upstream health matrix, streaming traces | Responsive Command Center connected to live API |
| **F3** | Live Activity & Workloads | Sub-millisecond trace explorer, detail drawer, zero prompt persistence, multi-tenant registry | Filterable traces and workload drawer |
| **F4** | Routing & Providers | Visual policy rule builder, mode hot-swapper, provider manager, credential vault status | Policy mode switching functional |
| **F5** | Cost Intelligence | Deep FinOps analytics, token tier distribution, baseline savings (-84.1%), budget tripwires | Accurate token attribution |
| **F6** | Optimization Lab | Advisory recommendation engine (prefix caching, speculative draft models, semantic deduping) | Advisory evidence documented |
| **F7** | Verification Sub-States | 5 deep-dive verification sub-states: AST Diff (7A), Replay (7B), 10% Canary (7C), 25% Soak (7D), Rollback (7E) | Interactive simulation modals |
| **F8** | Final Quality Assurance | Strict TypeScript check (`tsc --noEmit`), Next.js production build, accessibility audit | Zero build/lint errors |

---

*TheGate Engineering Team — Control Plane for AI*
