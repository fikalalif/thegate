"""Provider & Downstream Router Connection API Endpoints.

Allows configuring and testing connections to 9Router, OpenRouter, LiteLLM,
Ollama, or any OpenAI-compatible router dynamically without manual .env edits.
"""

import os
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
import httpx
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db_session
from app.api.v1.models import to_model_response
from app.core.config import get_settings
from app.db.models.model_pricing import ModelPricing
from app.db.models.models_registry import ModelRegistry
from app.schemas.models import ModelResponse

router = APIRouter(prefix="/providers", tags=["Providers & Router Connection"])


class RouterConfigRequest(BaseModel):
    """Payload to update downstream router connection configuration."""

    provider_adapter: str = Field(
        default="ninerouter",
        description="Adapter type: 'ninerouter' (OpenAI-compatible) or 'mock'",
    )
    base_url: str = Field(
        default="http://localhost:8080/v1",
        description="Base HTTP URL for downstream router instance",
    )
    api_key: str | None = Field(
        default=None,
        description="API Key or Bearer Token for downstream router",
    )
    timeout_seconds: float = Field(
        default=60.0,
        ge=1.0,
        le=300.0,
        description="Request timeout in seconds",
    )


class RouterTestRequest(BaseModel):
    """Payload to test downstream router connectivity."""

    base_url: str = Field(
        default="http://localhost:8080/v1",
        description="Base HTTP URL to test",
    )
    api_key: str | None = Field(
        default=None,
        description="API Key or Bearer Token to test",
    )
    timeout_seconds: float = Field(
        default=5.0,
        ge=1.0,
        le=30.0,
        description="Test timeout in seconds",
    )


class RouterTestResponse(BaseModel):
    """Result of router connectivity test."""

    success: bool
    latency_ms: float | None = None
    status_code: int | None = None
    message: str
    detected_models: list[str] = Field(default_factory=list)


class RouterConfigResponse(BaseModel):
    """Current downstream router connection status."""

    provider_adapter: str
    base_url: str
    api_key_masked: str | None
    timeout_seconds: float
    is_connected: bool
    last_ping_ms: float | None = None
    detected_models: list[str] = Field(default_factory=list)
    message: str | None = None


def mask_key(key: str | None) -> str | None:
    """Mask sensitive API key displaying only first 3 and last 4 characters."""
    if not key or len(key) < 8:
        return "••••••••" if key else None
    return f"{key[:3]}••••••••{key[-4:]}"


def update_env_file(updates: dict[str, str], env_path: str = ".env") -> None:
    """Safely update or append key-value pairs in the .env file."""
    lines: list[str] = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

    updated_keys: set[str] = set()
    new_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key, _ = stripped.split("=", 1)
            key = key.strip()
            if key in updates:
                new_val = updates[key]
                new_lines.append(f"{key}={new_val}\n")
                updated_keys.add(key)
                continue
        new_lines.append(line)

    for key, val in updates.items():
        if key not in updated_keys:
            new_lines.append(f"{key}={val}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


async def probe_router(
    base_url: str,
    api_key: str | None,
    timeout_seconds: float = 5.0,
) -> dict[str, Any]:
    """Probe downstream router endpoint to check reachability and detected models."""
    clean_url = base_url.rstrip("/")
    headers = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    start_time = time.perf_counter()
    detected_models: list[str] = []

    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        try:
            # Standard OpenAI / 9Router /models endpoint
            resp = await client.get(f"{clean_url}/models", headers=headers)
            latency = (time.perf_counter() - start_time) * 1000

            if resp.status_code in (200, 204):
                try:
                    data = resp.json()
                    if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
                        detected_models = [
                            m.get("id", "")
                            for m in data["data"]
                            if isinstance(m, dict) and m.get("id")
                        ][:12]
                    elif isinstance(data, list):
                        detected_models = [
                            m.get("id", "")
                            for m in data
                            if isinstance(m, dict) and m.get("id")
                        ][:12]
                except Exception:
                    pass

                # CRITICAL: Verify authentication on /chat/completions!
                # 9Router and several other gateways return HTTP 200 on /models even with invalid/fake tokens.
                # Only /chat/completions checks if the API Key / Bearer Token is truly accepted.
                auth_verification_note = ""
                test_model = detected_models[0] if detected_models else "ag/gemini-3.8-flash-high"
                auth_body = {
                    "model": test_model,
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                }
                auth_headers = {"Content-Type": "application/json", **headers}

                try:
                    auth_resp = await client.post(
                        f"{clean_url}/chat/completions",
                        headers=auth_headers,
                        json=auth_body,
                        timeout=min(timeout_seconds, 6.0),
                    )
                    if auth_resp.status_code in (401, 403):
                        if api_key:
                            return {
                                "success": False,
                                "latency_ms": round(latency, 1),
                                "status_code": auth_resp.status_code,
                                "message": f"Authentication failed (HTTP {auth_resp.status_code} Unauthorized). Upstream router rejected your Bearer Token / API Key. Please verify and provide a valid key.",
                                "detected_models": detected_models,
                            }
                        else:
                            return {
                                "success": False,
                                "latency_ms": round(latency, 1),
                                "status_code": auth_resp.status_code,
                                "message": f"Authentication required (HTTP {auth_resp.status_code} Unauthorized). This router requires a valid API Key / Bearer Token to route requests.",
                                "detected_models": detected_models,
                            }
                    elif auth_resp.status_code in (200, 204):
                        auth_verification_note = " [API Key & Auth: VERIFIED]"
                except Exception:
                    pass

                model_summary = (
                    f" Detected {len(detected_models)} models."
                    if detected_models
                    else " Models endpoint returned valid response."
                )
                return {
                    "success": True,
                    "latency_ms": round(latency, 1),
                    "status_code": resp.status_code,
                    "message": f"Connection verified successfully! ({round(latency, 1)}ms).{auth_verification_note}{model_summary}",
                    "detected_models": detected_models,
                }
            elif resp.status_code == 401:
                return {
                    "success": False,
                    "latency_ms": round(latency, 1),
                    "status_code": 401,
                    "message": "Authentication failed (HTTP 401 Unauthorized). Please verify your router API key.",
                    "detected_models": [],
                }
            else:
                return {
                    "success": False,
                    "latency_ms": round(latency, 1),
                    "status_code": resp.status_code,
                    "message": f"Router responded with HTTP {resp.status_code}: {resp.text[:120]}",
                    "detected_models": [],
                }
        except httpx.ConnectError:
            return {
                "success": False,
                "latency_ms": None,
                "status_code": None,
                "message": f"Connection refused at {clean_url}. Ensure 9Router or your downstream router is active.",
                "detected_models": [],
            }
        except httpx.TimeoutException:
            return {
                "success": False,
                "latency_ms": None,
                "status_code": None,
                "message": f"Connection timed out after {timeout_seconds}s.",
                "detected_models": [],
            }
        except Exception as exc:
            return {
                "success": False,
                "latency_ms": None,
                "status_code": None,
                "message": f"Connection probe failed: {str(exc)}",
                "detected_models": [],
            }


@router.get("/config", response_model=RouterConfigResponse)
async def get_router_config() -> RouterConfigResponse:
    """Fetch current downstream router connection parameters and live health status."""
    settings = get_settings()

    is_connected = False
    last_ping_ms: float | None = None
    detected_models: list[str] = []
    msg: str | None = None

    if settings.provider_adapter.lower() == "mock":
        is_connected = True
        msg = "Local Mock Provider active. All routing decisions simulated locally."
    else:
        probe = await probe_router(
            settings.ninerouter_base_url,
            settings.ninerouter_api_key,
            timeout_seconds=3.0,
        )
        is_connected = probe["success"]
        last_ping_ms = probe["latency_ms"]
        detected_models = probe["detected_models"]
        msg = probe["message"]

    return RouterConfigResponse(
        provider_adapter=settings.provider_adapter,
        base_url=settings.ninerouter_base_url,
        api_key_masked=mask_key(settings.ninerouter_api_key),
        timeout_seconds=settings.ninerouter_timeout_seconds,
        is_connected=is_connected,
        last_ping_ms=last_ping_ms,
        detected_models=detected_models,
        message=msg,
    )


@router.post("/test", response_model=RouterTestResponse)
async def test_router_connection(payload: RouterTestRequest) -> RouterTestResponse:
    """Test connectivity to an arbitrary downstream router URL without saving."""
    result = await probe_router(
        payload.base_url,
        payload.api_key,
        timeout_seconds=payload.timeout_seconds,
    )
    return RouterTestResponse(**result)


@router.post("/config", response_model=RouterConfigResponse)
async def update_router_config(payload: RouterConfigRequest) -> RouterConfigResponse:
    """Update downstream router connection settings, persist to .env, and apply immediately."""
    env_updates: dict[str, str] = {
        "PROVIDER_ADAPTER": payload.provider_adapter.strip().lower(),
        "NINEROUTER_BASE_URL": payload.base_url.strip(),
        "NINEROUTER_TIMEOUT_SECONDS": str(payload.timeout_seconds),
    }
    if payload.api_key is not None:
        env_updates["NINEROUTER_API_KEY"] = payload.api_key.strip()

    # Update runtime environment
    for key, val in env_updates.items():
        os.environ[key] = val

    # Persist to .env file
    try:
        update_env_file(env_updates)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to persist router configuration to .env: {str(e)}",
        )

    # Invalidate settings cache
    get_settings.cache_clear()

    # Return refreshed configuration
    return await get_router_config()


class SyncModelsRequest(BaseModel):
    """Optional payload to sync models with specific router parameters."""

    base_url: str | None = Field(default=None, description="Optional override router base URL")
    api_key: str | None = Field(default=None, description="Optional override router API key")
    provider_adapter: str | None = Field(default=None, description="Optional override adapter type")


class SyncModelsResponse(BaseModel):
    """Result of router model synchronization."""

    success: bool
    synced_count: int
    message: str
    models: list[ModelResponse] = Field(default_factory=list)


@router.post("/sync-models", response_model=SyncModelsResponse)
async def sync_router_models(
    payload: SyncModelsRequest | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> SyncModelsResponse:
    """Fetch all available models directly from the connected router AI gateway and sync to ModelRegistry."""
    settings = get_settings()
    base_url = (payload.base_url if payload and payload.base_url else settings.ninerouter_base_url).rstrip("/")
    api_key = payload.api_key if payload and payload.api_key is not None else settings.ninerouter_api_key
    adapter = (payload.provider_adapter if payload and payload.provider_adapter else settings.provider_adapter).strip().lower()

    if adapter == "mock":
        raise HTTPException(
            status_code=400,
            detail="Cannot sync models from 'mock' adapter. Please configure a real router gateway (such as 9Router, OpenRouter, or LiteLLM).",
        )

    headers = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    raw_models: list[dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(f"{base_url}/models", headers=headers)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Router returned HTTP {resp.status_code}: {resp.text[:200]}",
                )
            data = resp.json()
            if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
                raw_models = [m for m in data["data"] if isinstance(m, dict) and (m.get("id") or m.get("name"))]
            elif isinstance(data, list):
                raw_models = [m for m in data if isinstance(m, dict) and (m.get("id") or m.get("name"))]
            else:
                raise HTTPException(
                    status_code=502,
                    detail="Invalid models payload format received from router gateway",
                )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to connect to router gateway at {base_url}: {str(exc)}",
            )

    if not raw_models:
        return SyncModelsResponse(
            success=True,
            synced_count=0,
            message="Router gateway responded but returned zero models.",
            models=[],
        )

    synced_models: list[ModelRegistry] = []
    now = datetime.now(timezone.utc)

    for item in raw_models:
        raw_id = item.get("id") or item.get("name")
        if not raw_id:
            continue
        model_id = str(raw_id).strip()

        # Extract capabilities
        upstream_caps = item.get("capabilities") or {}
        ctx_len = (
            item.get("context_length")
            or item.get("max_completion_tokens")
            or upstream_caps.get("contextWindow")
            or 128000
        )
        try:
            ctx_len = int(ctx_len)
        except (ValueError, TypeError):
            ctx_len = 128000

        # Infer intelligent tier if not explicitly designated
        model_lower = model_id.lower()
        if any(kw in model_lower for kw in ["pro-max", "reasoner", "opus", "large", "70b", "glm-5", "deepseek-v4", "gpt-4o", "claude-3-5-sonnet"]):
            tier = 3
        elif any(kw in model_lower for kw in ["mini", "flash", "haiku", "8b", "small", "nano", "combo"]):
            tier = 1
        else:
            tier = 2

        caps: dict[str, Any] = {
            "tier": tier,
            "tools": upstream_caps.get("tools", True),
            "json_mode": True,
            "vision": upstream_caps.get("vision", False),
            "reasoning": upstream_caps.get("reasoning", False),
        }

        # Check existing model
        stmt = (
            select(ModelRegistry)
            .options(selectinload(ModelRegistry.pricing_entries))
            .where(
                (ModelRegistry.internal_name == model_id)
                | (ModelRegistry.backend_model_id == model_id)
            )
        )
        existing = (await session.execute(stmt)).scalar_one_or_none()

        if existing:
            existing.backend_model_id = model_id
            existing.provider_adapter = adapter
            existing.capabilities = caps
            existing.context_limit = ctx_len
            existing.enabled = True
            existing.updated_at = now
            synced_models.append(existing)
        else:
            new_model = ModelRegistry(
                internal_name=model_id,
                backend_model_id=model_id,
                provider_adapter=adapter,
                capabilities=caps,
                context_limit=ctx_len,
                enabled=True,
                created_at=now,
                updated_at=now,
            )
            session.add(new_model)
            await session.flush()
            synced_models.append(new_model)

    await session.commit()

    # Re-query synced models with selectinload to safely serialize without greenlet issues
    refreshed_stmt = (
        select(ModelRegistry)
        .options(selectinload(ModelRegistry.pricing_entries))
        .where(ModelRegistry.enabled == True)
    )
    refreshed_result = await session.execute(refreshed_stmt)
    refreshed_models = refreshed_result.scalars().all()

    return SyncModelsResponse(
        success=True,
        synced_count=len(refreshed_models),
        message=f"Successfully synchronized {len(refreshed_models)} real models from {adapter} gateway.",
        models=[to_model_response(m) for m in refreshed_models],
    )


@router.delete("/models")
async def clear_registered_models(
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Delete all registered models and pricing entries to return to an unpopulated/empty state."""
    await session.execute(delete(ModelPricing))
    await session.execute(delete(ModelRegistry))
    await session.commit()
    return {
        "success": True,
        "message": "All registered models and pricing catalog cleared successfully.",
    }


class TestIngressRequest(BaseModel):
    model_id: str = Field(default="ag/gemini-3.8-flash-high")
    prompt: str = Field(default="Ping test to Antigravity from TheGate office simulation")


@router.post("/test-ingress-prompt")
async def test_ingress_prompt(
    payload: TestIngressRequest | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Send a real prompt through to 9Router Antigravity and record the audit request."""
    settings = get_settings()
    model = (payload.model_id if payload and payload.model_id else "ag/gemini-3.8-flash-high").strip()
    prompt_text = payload.prompt if payload and payload.prompt else "Ping test to Antigravity from TheGate office simulation"

    base_url = settings.ninerouter_base_url.rstrip("/")
    api_key = settings.ninerouter_api_key

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body = {
        "model": model,
        "messages": [{"role": "user", "content": prompt_text}],
        "max_tokens": 60,
    }

    start_time = time.perf_counter()
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=body)
            duration_ms = int((time.perf_counter() - start_time) * 1000)

            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Router returned HTTP {resp.status_code}: {resp.text[:200]}",
                )

            resp_text = resp.text.strip()
            content = ""
            in_tok = len(prompt_text.split())
            out_tok = 15

            if "text/event-stream" in resp.headers.get("content-type", "") or resp_text.startswith("data:"):
                chunks_content = []
                for raw_line in resp_text.split("\n"):
                    line = raw_line.strip()
                    if not line or line.startswith(":"):
                        continue
                    if line.startswith("data:"):
                        d_str = line[len("data:"):].strip()
                        if d_str == "[DONE]":
                            break
                        try:
                            c = json.loads(d_str)
                            if "usage" in c and c["usage"]:
                                in_tok = int(c["usage"].get("prompt_tokens") or in_tok)
                                out_tok = int(c["usage"].get("completion_tokens") or out_tok)
                            for ch in c.get("choices", []):
                                delta = ch.get("delta", {})
                                if delta.get("content"):
                                    chunks_content.append(delta["content"])
                        except Exception:
                            continue
                content = "".join(chunks_content)
            else:
                data = resp.json()
                usage = data.get("usage") or {}
                in_tok = int(usage.get("prompt_tokens") or in_tok)
                out_tok = int(usage.get("completion_tokens") or out_tok)
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            # Look up model in registry
            stmt = select(ModelRegistry).where(ModelRegistry.internal_name == model)
            res = await session.execute(stmt)
            m_record = res.scalars().first()

            from app.db.models.requests import Request as RequestModel
            req_record = RequestModel(
                status="completed",
                selected_model_id=m_record.id if m_record else None,
                input_tokens=in_tok,
                output_tokens=out_tok,
                total_duration_ms=duration_ms,
                cost_amount=0.005,
                cost_type="ESTIMATED",
                stream_enabled=False,
            )
            session.add(req_record)
            await session.commit()

            return {
                "success": True,
                "model": model,
                "provider": "antigravity",
                "input_tokens": in_tok,
                "output_tokens": out_tok,
                "duration_ms": duration_ms,
                "response_text": content,
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to route test prompt: {str(e)}")


