# TheGate — Backend API Integration & Data Contracts

**Version:** 1.0  
**Target Environment:** Local Self-Hosted (`http://127.0.0.1:8001`)  
**Authentication Scheme:** `Authorization: Bearer <thegate_api_key>`  
**Privacy Enforcement:** Zero Prompt Persistence (ADR-004)

---

## 1. Live Backend Endpoints Matrix

The frontend integrates directly with the live FastAPI backend running on port 8001:

| Method | Endpoint Path | Implementation Status | Live Data Consumer | Schema / Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health`, `/ready` | ✅ Live Implemented | System status in Shell | `{"status": "ok"}` |
| `POST` | `/v1/chat/completions` | ✅ Live Implemented | Playground (`/playground`) | OpenAI ChatCompletion (JSON & SSE) |
| `GET` | `/api/v1/analytics/overview` | ✅ Live Implemented | Command Center (`/`), Costs (`/costs`) | `AnalyticsOverviewResponse` |
| `GET` | `/api/v1/analytics/models` | ✅ Live Implemented | Command Center (`/`), Costs (`/costs`) | `ModelAnalyticsResponse` |
| `GET` | `/api/v1/analytics/costs` | ✅ Live Implemented | Cost Intelligence (`/costs`) | `CostTimeSeriesResponse` |
| `GET` | `/api/v1/requests` | ✅ Live Implemented | Request Explorer (`/requests`), Overview | `RequestLogListResponse` (Paginated) |
| `GET` | `/api/v1/requests/{id}` | ✅ Live Implemented | Request Drawer (`/requests`) | `RequestDetailResponse` |
| `GET` | `/api/v1/policies` | ✅ Live Implemented | Routing & Policies (`/policies`) | `list[RoutingPolicy]` |
| `PUT` | `/api/v1/policies/{id}` | ✅ Live Implemented | Routing & Policies (`/policies`) | `RoutingPolicy` (Mode update) |
| `GET` | `/api/v1/models` | ✅ Live Implemented | Models & Providers (`/providers`) | `list[ModelRegistry]` |
| `GET` | `/api/v1/keys` | ✅ Live Implemented | Admin Key Management | `list[ApiKeyResponse]` |

---

## 2. Request & Response Schemas (OpenAI Compliant)

### 2.1 Chat Completions (`POST /v1/chat/completions`)
Supports non-streaming JSON and streaming Server-Sent Events (`text/event-stream`).

**Request Payload:**
```json
{
  "model": "thegate-auto",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Explain AI cost optimization."}
  ],
  "stream": true,
  "temperature": 0.7
}
```

**Virtual Routing Models Supported:**
- `thegate-auto`: Evaluates active policy and selects optimal model.
- `thegate-economy`: Strictly selects lowest unit cost eligible model.
- `thegate-balanced`: Evaluates context, tools, and latency boundaries.
- `thegate-quality`: Routes to flagship reasoning tiers (e.g. `claude-3-5-sonnet`, `gpt-4o`).
- Explicit Model Names (e.g. `gpt-4o-mini`, `gpt-4o`, `claude-3-5-sonnet`): Bypasses routing policy and directs request to selected model directly.

---

### 2.2 Analytics Overview (`GET /api/v1/analytics/overview`)

**Response Schema:**
```json
{
  "total_requests": 14829,
  "successful_requests": 14829,
  "failed_requests": 0,
  "total_cost": "24.814000",
  "baseline_cost": "156.420000",
  "net_savings_amount": "131.606000",
  "net_savings_percent": "84.13",
  "avg_latency_ms": 142.5,
  "p95_latency_ms": 342.0
}
```

---

### 2.3 Request Log Explorer (`GET /api/v1/requests`)

**Query Parameters:**
- `limit` (default: 20, max: 100): Page size.
- `offset` (default: 0): Pagination offset.
- `model` (optional string): Filter by selected model internal name.
- `status` (optional string): Filter by `completed`, `failed`, `cancelled`.
- `start_date` / `end_date` (optional ISO datetime): Date bounds.

**Response Schema:**
```json
{
  "items": [
    {
      "id": "bf28476b-ada7-4666-bb40-2b150e5e6d66",
      "timestamp": "2026-10-15T04:14:48Z",
      "status": "completed",
      "model_name": "gpt-4o-mini",
      "routing_policy_name": "economy-default",
      "input_tokens": 11,
      "output_tokens": 8,
      "total_duration_ms": 42,
      "cost_amount": "0.000009",
      "cost_type": "ESTIMATED",
      "baseline_cost_amount": "0.000235",
      "estimated_savings_percent": "96.17",
      "stream_enabled": true,
      "error_category": null
    }
  ],
  "total": 14829,
  "limit": 20,
  "offset": 0
}
```

---

## 3. Explicit Mock-Data Adapters for Unbacked Capabilities

In strict compliance with PRD Section 2.2 and Section 16.3, capabilities not yet supported by the underlying backend are **never fabricated as live production features**. Instead, they are explicitly decoupled into verified mock/simulation states with clear badges:

1. **AI Workloads Multi-Tenant Registry (`/workloads`)**:
   - *Backend Limitation*: TheGate backend currently records all requests under API keys without a tenant partition entity.
   - *Frontend Implementation*: Renders a curated multi-tenant registry (`finance-agent-service`, `customer-support-copilot`, `code-review-pipeline`, `analytics-rag-pipeline`) to demonstrate workload-level FinOps attribution, clearly marked as a tenant registry prototype.
2. **Ephemeral Prefix Caching AST Breakpoints (Sub-State 7A)**:
   - *Backend Limitation*: Upstream Anthropic prompt caching header insertion is scheduled for Milestone 14.
   - *Frontend Implementation*: Side-by-side AST visualizer demonstrating the exact payload transformation and breakpoint syntax (`cache_control: {type: 'ephemeral'}`).
3. **1,000-Trace Replay Simulator (Sub-State 7B)**:
   - *Frontend Implementation*: Interactive client-side simulation engine replaying 1,000 historic trace distributions with live progress bar and benchmark calculation.
4. **25% Canary Soak & Sentinel Tripwire (Sub-States 7C, 7D, 7E)**:
   - *Frontend Implementation*: Interactive rollout cockpit tracking soak countdown timers and emergency rollback draining states.
