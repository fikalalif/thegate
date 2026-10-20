"""API endpoints for team roles and autonomous agent personas."""

import re
import uuid
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.core.config import get_settings
from app.db.models.models_registry import ModelRegistry
from app.db.models.roles import Role
from app.schemas.roles import (
    GenerateContextRequest,
    GenerateContextResponse,
    RoleCreate,
    RoleResponse,
    RoleUpdate,
)

router = APIRouter(prefix="/roles", tags=["Team Roles & AI Workforce"])

DEFAULT_FULLSTACK_ROLE: dict[str, Any] = {
    "name": "Lead Fullstack Engineer",
    "role_key": "fullstack-engineer",
    "department": "Core Systems & Fullstack Architecture",
    "context_behavior": (
        "Experienced, pragmatic Fullstack Systems Architect who builds robust, end-to-end architectures "
        "from scratch without AI fluff, hallucinations, or unverified shortcuts. Highly intolerant to fake "
        "simulations, unauthenticated bypasses, or broken contracts. Prioritizes real live telemetry, "
        "privacy-by-default, and auditable metrics. When selecting models: prefers ultra-fast, high-context "
        "workhorses (like Gemini 3.8 Flash High with 1,048k token window) for deep AST analysis and multi-file "
        "refactoring; switches to deep reasoning models only when resolving critical CVE security audits or complex "
        "state machines. Cost, latency, and TTFT conscious—never burns tokens on wasteful prompts."
    ),
    "preferred_model_id": "ag/gemini-3.8-flash-high",
    "hair_color": "#4B2E1E",
    "shirt_color": "#2B5278",
    "tie_color": "#E53E3E",
    "has_glasses": True,
    "has_headset": False,
    "is_default": True,
    "current_activity": "idle",
}


def slugify(text: str) -> str:
    """Generate clean URL-friendly slug from role name."""
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    return re.sub(r"[-\s]+", "-", s)


async def ensure_default_role_seeded(session: AsyncSession) -> None:
    """Ensure at least the default Fullstack Engineer role exists in the database."""
    count_stmt = select(func.count(Role.id))
    res = await session.execute(count_stmt)
    count = res.scalar() or 0

    if count == 0:
        default_role = Role(
            id=uuid.uuid4(),
            name=DEFAULT_FULLSTACK_ROLE["name"],
            role_key=DEFAULT_FULLSTACK_ROLE["role_key"],
            department=DEFAULT_FULLSTACK_ROLE["department"],
            context_behavior=DEFAULT_FULLSTACK_ROLE["context_behavior"],
            preferred_model_id=DEFAULT_FULLSTACK_ROLE["preferred_model_id"],
            hair_color=DEFAULT_FULLSTACK_ROLE["hair_color"],
            shirt_color=DEFAULT_FULLSTACK_ROLE["shirt_color"],
            tie_color=DEFAULT_FULLSTACK_ROLE["tie_color"],
            has_glasses=DEFAULT_FULLSTACK_ROLE["has_glasses"],
            has_headset=DEFAULT_FULLSTACK_ROLE["has_headset"],
            is_default=True,
            current_activity="idle",
        )
        session.add(default_role)
        await session.commit()


@router.get("", response_model=list[RoleResponse])
async def list_roles(session: AsyncSession = Depends(get_db_session)) -> list[Role]:
    """List all team roles. Seeds default Fullstack Engineer role if empty."""
    await ensure_default_role_seeded(session)

    stmt = select(Role).order_by(Role.is_default.desc(), Role.created_at.asc())
    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    payload: RoleCreate,
    session: AsyncSession = Depends(get_db_session),
) -> Role:
    """Create a new custom team role with specialized behavior context."""
    base_slug = slugify(payload.role_key if payload.role_key else payload.name)
    role_key = base_slug

    # Ensure uniqueness
    counter = 1
    while True:
        stmt = select(Role).where(Role.role_key == role_key)
        res = await session.execute(stmt)
        if not res.scalars().first():
            break
        counter += 1
        role_key = f"{base_slug}-{counter}"

    role = Role(
        id=uuid.uuid4(),
        name=payload.name.strip(),
        role_key=role_key,
        department=payload.department.strip(),
        context_behavior=payload.context_behavior.strip(),
        preferred_model_id=payload.preferred_model_id.strip() if payload.preferred_model_id else None,
        hair_color=payload.hair_color.strip() if payload.hair_color else "#4B2E1E",
        shirt_color=payload.shirt_color.strip() if payload.shirt_color else "#2B5278",
        tie_color=payload.tie_color.strip() if payload.tie_color else None,
        has_glasses=payload.has_glasses,
        has_headset=payload.has_headset,
        is_default=payload.is_default,
        current_activity="idle",
    )
    if payload.is_default:
        from sqlalchemy import update
        await session.execute(update(Role).values(is_default=False))
    session.add(role)
    await session.commit()
    await session.refresh(role)
    return role


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> Role:
    """Retrieve details for a specific role."""
    stmt = select(Role).where(Role.id == role_id)
    res = await session.execute(stmt)
    role = res.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: uuid.UUID,
    payload: RoleUpdate,
    session: AsyncSession = Depends(get_db_session),
) -> Role:
    """Update role attributes, appearance, or behavioral context."""
    stmt = select(Role).where(Role.id == role_id)
    res = await session.execute(stmt)
    role = res.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if payload.name is not None:
        role.name = payload.name.strip()
    if payload.department is not None:
        role.department = payload.department.strip()
    if payload.context_behavior is not None:
        role.context_behavior = payload.context_behavior.strip()
    if payload.preferred_model_id is not None:
        role.preferred_model_id = payload.preferred_model_id.strip() if payload.preferred_model_id else None
    if payload.hair_color is not None:
        role.hair_color = payload.hair_color.strip()
    if payload.shirt_color is not None:
        role.shirt_color = payload.shirt_color.strip()
    if payload.tie_color is not None:
        role.tie_color = payload.tie_color.strip() if payload.tie_color else None
    if payload.has_glasses is not None:
        role.has_glasses = payload.has_glasses
    if payload.has_headset is not None:
        role.has_headset = payload.has_headset
    if payload.is_default is not None:
        if payload.is_default:
            from sqlalchemy import update
            await session.execute(update(Role).values(is_default=False))
        role.is_default = payload.is_default
    if payload.current_activity is not None:
        role.current_activity = payload.current_activity.strip()

    await session.commit()
    await session.refresh(role)
    return role


@router.delete("/{role_id}", status_code=status.HTTP_200_OK)
async def delete_role(
    role_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Delete a team role and remove its corresponding NPC from the office."""
    count_stmt = select(func.count(Role.id))
    res = await session.execute(count_stmt)
    total_count = res.scalar() or 0

    if total_count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the last remaining role. The company must maintain at least one active role/NPC in the campus.",
        )

    stmt = select(Role).where(Role.id == role_id)
    res = await session.execute(stmt)
    role = res.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    await session.delete(role)
    await session.commit()
    return {"success": True, "message": f"Role '{role.name}' deleted successfully. NPC removed from campus."}


@router.post("/generate-context", response_model=GenerateContextResponse)
async def generate_role_context(
    payload: GenerateContextRequest,
    session: AsyncSession = Depends(get_db_session),
) -> GenerateContextResponse:
    """Generate rich, realistic AI context behavior guidelines for a target role."""
    settings = get_settings()
    role_name = payload.role_name.strip()
    dept = payload.department.strip()
    focus = payload.key_focus.strip() if payload.key_focus else ""

    # Check available models in registry
    model_stmt = select(ModelRegistry.internal_name).where(ModelRegistry.enabled.is_(True)).limit(10)
    m_res = await session.execute(model_stmt)
    available_models = list(m_res.scalars().all()) or ["ag/gemini-3.8-flash-high"]

    # Try live generation via downstream router if available
    prompt = (
        f"You are the Head of Engineering and Autonomous Systems Architect. Write a comprehensive, pragmatic, "
        f"and authentic behavioral context prompt (in 3-4 concise paragraphs) for an AI engineer or team member "
        f"with the role '{role_name}' in department '{dept}'. Focus areas: {focus if focus else 'General excellence'}.\n"
        f"Explain:\n"
        f"1. Their core engineering/work mindset, standards, and intolerance for low quality or fake metrics.\n"
        f"2. How they evaluate LLM models: why they prioritize specific latency (TTFT), context size, reasoning, or unit price.\n"
        f"3. Their communication and problem-solving style.\n"
        f"Do NOT include greetings or markdown headers; return only the behavioral context prompt text."
    )

    generated_text = ""
    try:
        base_url = settings.ninerouter_base_url.rstrip("/")
        headers = {"Content-Type": "application/json"}
        if settings.ninerouter_api_key:
            headers["Authorization"] = f"Bearer {settings.ninerouter_api_key}"

        body = {
            "model": "ag/gemini-3.8-flash-high",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 400,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=body)
            if resp.status_code == 200:
                resp_text = resp.text.strip()
                if "text/event-stream" in resp.headers.get("content-type", "") or resp_text.startswith("data:"):
                    import json
                    chunks = []
                    for line in resp_text.split("\n"):
                        line = line.strip()
                        if line.startswith("data:") and not line.endswith("[DONE]"):
                            try:
                                c = json.loads(line[5:].strip())
                                delta = c.get("choices", [{}])[0].get("delta", {})
                                if delta.get("content"):
                                    chunks.append(delta["content"])
                            except Exception:
                                pass
                    generated_text = "".join(chunks).strip()
                else:
                    data = resp.json()
                    generated_text = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    except Exception:
        generated_text = ""

    # High quality behavioral archetypes fallback if router was slow or offline
    if not generated_text:
        role_lower = role_name.lower()
        if "mobile" in role_lower or "ios" in role_lower or "android" in role_lower:
            generated_text = (
                f"Pragmatic Mobile Systems Engineer dedicated to crafting responsive, offline-first client architectures "
                f"across modern mobile stacks. Relentlessly focused on zero frame-drops, compact bundle sizes, and sub-100ms TTFT "
                f"for streaming edge queries. When evaluating models: demands ultra-low time-to-first-token and predictable structured "
                f"JSON outputs for local SQLite synchronization. Rejects bloated payloads and models with erratic streaming behavior. "
                f"Communicates in concise, bug-reproducing steps with trace logs and battery/network consumption profiles."
            )
            suggested_models = ["ag/gemini-3.8-flash-high", "ag/gemini-3.8-flash-low"]
            suggested_appearance = {
                "hair_color": "#1A202C",
                "shirt_color": "#1E4E52",
                "tie_color": "#38BDF8",
                "has_glasses": False,
                "has_headset": True,
            }
        elif "pm" in role_lower or "product" in role_lower:
            generated_text = (
                f"Results-oriented Product Manager who anchors all engineering efforts to auditable business ROI and user value. "
                f"Intolerant of vague PRDs, scope bloat, or unverified feature promises. When evaluating models: balances deep reasoning "
                f"accuracy for synthesis of user stories and trade-off matrices with unit token price efficiency. Selects cost-effective "
                f"balanced models for day-to-day requirements and escalates to flagship reasoning engines only for complex competitive audits. "
                f"Communicates with clear acceptance criteria, measurable KPIs, and crisp executive clarity."
            )
            suggested_models = ["ag/gemini-3.8-flash-high", "ag/gemini-3.8-flash-medium"]
            suggested_appearance = {
                "hair_color": "#2C5282",
                "shirt_color": "#92400E",
                "tie_color": "#F59E0B",
                "has_glasses": True,
                "has_headset": False,
            }
        elif "marketing" in role_lower or "growth" in role_lower:
            generated_text = (
                f"High-velocity Growth & Brand Strategist who treats copy as code with measurable conversion metrics. "
                f"Demands authentic, compelling storytelling without generic AI marketing fluff or robotic clichés. "
                f"When selecting models: prioritizes fast token generation throughput and creative adaptability for high-volume "
                f"A/B testing, email sequences, and developer documentation. Rejects stale, templated completions. "
                f"Communicates with vivid punchy narratives and data-backed CTR analysis."
            )
            suggested_models = ["ag/gemini-3.8-flash-high", "ag/gemini-3.8-flash"]
            suggested_appearance = {
                "hair_color": "#B7791F",
                "shirt_color": "#7B341E",
                "tie_color": "#FFB71B",
                "has_glasses": False,
                "has_headset": False,
            }
        elif "manager" in role_lower or "lead" in role_lower or "director" in role_lower:
            generated_text = (
                f"Strategic Engineering Leader focused on team velocity, unblocking cross-functional dependencies, and system reliability. "
                f"Maintains rigorous code standards and automated CI/CD guardrails while empowering autonomy. "
                f"When evaluating models: optimizes for cost predictability, team-wide quota governance, and high deterministic reasoning. "
                f"Ensures fallback policies are strictly armed to prevent client-facing outages. "
                f"Communicates with direct, calm authority and transparent architectural rationale."
            )
            suggested_models = ["ag/gemini-3.8-flash-high", "ag/gemini-3.8-flash-medium"]
            suggested_appearance = {
                "hair_color": "#1A202C",
                "shirt_color": "#2B5278",
                "tie_color": "#E53E3E",
                "has_glasses": True,
                "has_headset": True,
            }
        else:
            generated_text = (
                f"Dedicated {role_name} specialist within {dept}. Applies rigorous engineering discipline and proactive "
                f"problem-solving to every task. Zero tolerance for unverified assumptions, hallucinations, or opaque failures. "
                f"When selecting models: methodically benchmarks latency, context capacity, and unit token price to ensure "
                f"optimal performance for {dept} workloads. Communicates clearly with evidence-based reasoning and actionable outputs."
            )
            suggested_models = available_models[:2]
            suggested_appearance = {
                "hair_color": "#4B2E1E",
                "shirt_color": "#1E3A2F",
                "tie_color": "#38BDF8",
                "has_glasses": True,
                "has_headset": False,
            }
    else:
        suggested_models = available_models[:2]
        suggested_appearance = {
            "hair_color": "#4B2E1E",
            "shirt_color": "#2B5278",
            "tie_color": "#38BDF8",
            "has_glasses": True,
            "has_headset": False,
        }

    return GenerateContextResponse(
        role_name=role_name,
        department=dept,
        generated_context=generated_text,
        suggested_models=suggested_models,
        suggested_appearance=suggested_appearance,
    )
