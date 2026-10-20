# GEMINI.MD — THEGATE MASTER PROJECT CONTEXT

## 1. PROJECT IDENTITY & PURPOSE
**TheGate** is an open-source, self-hosted intelligent LLM routing and AI cost optimization platform.
It acts as an optimization layer between AI applications and downstream model infrastructure (initially integrating with 9Router).

Core capabilities:
1. Route requests through configurable routing policies (`Economy`, `Balanced`, `Quality`).
2. Integrate with 9Router as the initial backend via a provider adapter abstraction.
3. Keep the routing engine independent of the initial backend.
4. Measure model usage and cost transparently.
5. Record routing decisions and request attempts with zero prompt persistence (*Privacy by default*).
6. Compare routing outcomes against an explicitly defined baseline.
7. Provide a developer-friendly analytics dashboard.

---

## 2. SOURCES OF TRUTH
Always inspect these documents before making design or implementation decisions:
- `docs/PRD.md` — Product Requirements Document (MVP scope & specifications).
- `docs/TECHNICAL_DESIGN.md` — Approved system architecture, ERD, and contracts.
- `docs/IMPLEMENTATION_PLAN.md` — Phased milestone plan, acceptance criteria, and test definitions.
- `docs/ARCHITECTURE_DECISIONS.md` — Architecture Decision Records (ADRs).

---

## 3. CORE ARCHITECTURAL PRINCIPLES
1. **Provider Independence:** Core routing must never directly couple to 9Router format. Use `BaseProviderAdapter`.
2. **Strategy Independence:** Routing strategies use `BaseRoutingStrategy`. Start with deterministic `RuleBasedStrategy`. Evaluate `RouteLLM` as an optional plugin.
3. **Measurement Before Optimization:** Never claim cost savings without an auditable measurement method. Distinguish `PROVIDER_REPORTED`, `ESTIMATED`, and `UNKNOWN`.
4. **Privacy by Default:** Do not persist prompt or completion text by default. Never log Authorization headers or provider credentials.
5. **Explicit Failure Handling:** Bounded retries, timeouts, and fallbacks. Strictly **NO fallback** once streaming output has commenced to the client.
6. **Progressive Complexity:** Modular monolith. No microservices, Kafka, or Redis unless explicitly required by proven benchmarks.

---

## 4. NON-NEGOTIABLE RULES
- Do not implement everything in a single uncontrolled generation.
- Do not silently change product scope.
- Do not invent upstream provider API behavior.
- Do not hardcode secrets or credentials.
- Do not treat unknown costs as zero.
- Do not double-count retries in cost accounting.
- Do not store prompt content by default.
- Do not fabricate test results.
- Do not mark incomplete features as complete.
- Do not overwrite existing project work without inspection.

---

## 5. STANDARD WORKFLOW
Execute work strictly in sequential milestones defined in `docs/IMPLEMENTATION_PLAN.md`:
1. **Inspect** existing files and dependencies.
2. **Understand** the milestone objectives.
3. **Validate** external API contracts and schemas.
4. **Implement** modular, cleanly typed code.
5. **Verify** with automated tests, linting, and contract checks.
6. **Report** changes, test results, limitations, and the next recommended step.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `antislop.md` (core) and then the skill for the task:
- UI / visual: `skills/antislop-ui/SKILL.md`
- Copy & text: `skills/antislop-copywriting/SKILL.md`
- People: `skills/antislop-human/SKILL.md`
- Mobile / responsive: `skills/antislop-layoutmobile/SKILL.md`
- Code comments: `skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: download `antislop.md` again, or run `npx antislop-ai --update` if it was installed as skill folders.
<!-- antislop:end -->
