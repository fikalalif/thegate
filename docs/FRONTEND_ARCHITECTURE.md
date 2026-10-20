# TheGate — Frontend Architecture Specification
## The Control Plane for AI (Obsidian Telemetry)

**Version:** 1.0  
**Status:** Approved Architecture  
**Framework:** Next.js 14 (App Router) + TypeScript 5.4 + Tailwind CSS 3.4  
**Design System:** Obsidian Telemetry (`#0B0D10` base, `#151920` surface, `#2A303A` borders, `#FFB71B` brand amber)

---

## 1. Architectural Overview & Design Tenet

The frontend for **TheGate** serves as the mission-critical operations cockpit for AI platform architects, infrastructure engineers, SREs, and FinOps directors. 

### Core Architectural Tenet: *Zero Magic, Complete Visibility*
Every autonomous decision made by the gateway (arbitrage routing, ephemeral prompt caching, speculative decoding, fallback cascades, and canary draining) must be inspectable down to:
- Sub-millisecond execution waterfalls.
- Concrete AST diff breakpoints (`cache_control: {type: 'ephemeral'}`).
- Auditable counterfactual financial accounting vs reference baselines (`gpt-4o`).
- Zero Prompt Persistence privacy verification.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 14 App Router                          │
│                                                                        │
│  ┌─────────────────────────┐           ┌────────────────────────────┐  │
│  │     Global Shell        │           │     Feature Modules        │  │
│  │  - Fixed Sidebar (64)   │           │  - Command Center (/)      │  │
│  │  - Cluster Top Header   │           │  - AI Workloads            │  │
│  │  - Obsidian Theme Base  │           │  - Live Activity Traces    │  │
│  │  - Telemetry Beacon     │           │  - Routing & Policies      │  │
│  └───────────┬─────────────┘           │  - Models & Providers      │  │
│              │                         │  - Cost Intelligence       │  │
│              ▼                         │  - Optimization Lab        │  │
│  ┌─────────────────────────┐           │  - Interactive Playground  │  │
│  │ Reusable Design System  │           └─────────────┬──────────────┘  │
│  │  - Metric KPI Cards     │                         │                 │
│  │  - Dense Data Tables    │◄────────────────────────┘                 │
│  │  - AST Diff Inspectors  │                                           │
│  │  - Slide-Over Drawers   │                                           │
│  │  - Modal Dialogs        │                                           │
│  └───────────┬─────────────┘                                           │
│              │                                                         │
│              ▼                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                  Typed Data Layer (lib/api.ts)                   │  │
│  │  ┌──────────────────────────────┐ ┌───────────────────────────┐  │  │
│  │  │    Live FastAPI Backend      │ │   Explicit Mock Adapter   │  │  │
│  │  │   (http://127.0.0.1:8001)    │ │   (Canary Soak, AST Diffs,│  │  │
│  │  │  /analytics, /requests,      │ │    Synthetic Replay, etc) │  │  │
│  │  │  /policies, /models, /chat   │ │   Labeled "PROTOTYPE/SIM" │  │  │
│  │  └──────────────────────────────┘ └───────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Layout & Module Boundaries

The frontend repository is structured cleanly into distinct layers:

```
frontend/
├── package.json               # Next.js 14, React 18, Tailwind, Lucide icons
├── tsconfig.json              # Strict TypeScript path aliases (@/* -> src/*)
├── tailwind.config.ts         # Obsidian Telemetry color tokens, font stacks, shadows
├── postcss.config.js          # Autoprefixer & Tailwind
├── next.config.mjs            # Production build optimizations & rewrites
├── .env.local                 # NEXT_PUBLIC_API_URL & default dev key
└── src/
    ├── app/
    │   ├── layout.tsx         # Root layout with Sidebar and Header shell
    │   ├── globals.css        # Telemetry scrollbars, radar-pulse animations
    │   ├── page.tsx           # Screen 01: Command Center & Ingress Topology
    │   ├── workloads/         # Screen 02: AI Workloads Multi-Tenant Registry
    │   ├── requests/          # Screen 03: Live Activity Trace Explorer & Drawer
    │   ├── policies/          # Screen 04: Routing & Policies Builder + Simulator
    │   ├── providers/         # Screen 05: Models & Providers Connection Manager
    │   ├── costs/             # Screen 06: Cost Intelligence & FinOps Tripwires
    │   ├── optimization/      # Screen 07: Optimization Lab + 5 Sub-State Modals
    │   └── playground/        # Interactive Playground & Streaming Inference
    ├── components/
    │   ├── Sidebar.tsx        # Persistent left navigation shell (64 width)
    │   ├── Header.tsx         # Top cluster status bar & tenant selector
    │   └── Navbar.tsx         # Legacy / mobile responsive bar
    └── lib/
        └── api.ts             # Typed API client, schemas, and live fetchers
```

---

## 3. Data Architecture & State Management

### 3.1 Live Data vs Explicit Mock-Data Adapter
In strict adherence to PRD Section 2.2, Section 16.3, and ADR-005:
1. **Live Production Endpoints (Port 8001)**:
   - `GET /api/v1/analytics/overview`: Real-time request volumes, costs, savings %, latencies.
   - `GET /api/v1/analytics/models`: Active model candidate traffic shares and token totals.
   - `GET /api/v1/analytics/costs`: Time-series daily cost buckets.
   - `GET /api/v1/requests`: Paginated, filterable audit records.
   - `GET /api/v1/requests/{id}`: Detailed request execution traces, routing rationale, attempts.
   - `GET /api/v1/policies` & `PUT /api/v1/policies/{id}`: Policy catalog and live mode switching.
   - `GET /api/v1/models`: Model registry, context limits, versioned pricing.
   - `POST /v1/chat/completions`: Live streaming SSE inference through TheGate router.
2. **Explicit Mock / Simulation Adapters**:
   - Workload multi-tenant burn rates (Screen 02): labeled as simulated tenant distribution until multi-tenant auth is wired.
   - AST Diff Breakpoint Inspector (Sub-State 7A): labeled as preview AST parser until upstream Anthropic ephemeral caching contract is exposed in the gateway.
   - Replay Simulator (Sub-State 7B): explicitly labeled as a synthetic 1,000-trace simulation.
   - Canary Soak Countdown & Incident Simulation (Sub-States 7C, 7D, 7E): explicitly labeled as progressive rollout cockpit simulations.

### 3.2 Error Handling & Component States
Every visual component enforces 4 distinct component states:
- **Loading State**: Monospaced animated pulse skeleton (`animate-pulse`).
- **Empty State**: Clear indicator with actionable CTA (e.g. "No traces found. Execute requests in Playground").
- **Error State**: Non-blocking alert container showing HTTP status and remediation tip without crashing React.
- **Data State**: High-density tabular layout with monospaced tabular numerals.

---

## 4. Security & Privacy Guarantees

1. **Zero Prompt Persistence (ADR-004)**:
   - The frontend never receives, stores, or displays prompt or completion text within audit tables, trace explorer, or telemetry drawers.
   - Only the Interactive Playground (`/playground`) holds prompt text locally in React state during active session execution.
2. **Credential Vault Protection**:
   - Server-side provider keys (OpenAI, Anthropic, AWS IAM roles) are never transmitted to the browser.
   - In the Providers screen, keys are masked (`sk-ant-api03-••••••••••••••98a1`) and marked as encrypted in Vault.
3. **No LocalStorage Credential Leakage**:
   - API tokens are not persisted in localStorage or sessionStorage.

---

## 5. Responsive Design & Accessibility (WCAG 2.2 AA)

1. **Breakpoints**:
   - Desktop (>= 1280px): Persistent 256px sidebar, multi-column operational telemetry grids, dense data tables.
   - Tablet (768px - 1024px): Responsive overflow tables with horizontal scroll, stacked KPI cards.
   - Mobile (< 768px): Collapsible drawer navigation, full-screen detail modals, touch-friendly tap targets (>= 44px).
2. **Accessibility**:
   - High contrast ratios exceeding 4.5:1 on all text (`#EDEDED` text on `#0B0D10` / `#151920` background).
   - Status indicators pair color with text labels and iconography (e.g. green checkmark + `200 OK`, red cross + `5xx FAILED`).
   - Monospaced tabular numerals (`font-mono`) ensure numerical columns remain aligned across re-renders.
