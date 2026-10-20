"""TheGate API Application Entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import (
    analytics,
    auth,
    completions,
    health,
    keys,
    models,
    policies,
    providers,
    requests,
    roles,
)
from app.core.config import get_settings
from app.core.exceptions import TheGateError
from app.core.logging import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan manager for startup and shutdown hooks."""
    settings = get_settings()
    setup_logging(log_level=settings.log_level, environment=settings.environment)

    # Auto-initialize SQLite database schema on startup for zero-config CLI usage
    if "sqlite" in settings.database_url:
        from app.db.base import Base
        from app.db.session import get_engine

        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    yield
    # Clean shutdown hooks can be placed here


def create_app() -> FastAPI:
    """FastAPI application factory."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description="TheGate — Intelligent LLM Routing & AI Cost Optimization Platform",
        version="0.1.0",
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url="/redoc" if settings.environment != "production" else None,
        lifespan=lifespan,
    )

    # Global Exception Handlers conforming to OpenAI error envelope
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        err_msg = "; ".join(
            f"{'.'.join(str(loc) for loc in err['loc'])}: {err['msg']}" for err in exc.errors()
        )
        first_loc = str(exc.errors()[0]["loc"][-1]) if exc.errors() else None
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "message": err_msg,
                    "type": "invalid_request_error",
                    "param": first_loc,
                    "code": "invalid_payload",
                },
                "detail": exc.errors(),
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
        err_type = "authentication_error" if exc.status_code == 401 else "invalid_request_error"
        code = "invalid_api_key" if exc.status_code == 401 else None
        return JSONResponse(
            status_code=exc.status_code,
            headers=exc.headers,
            content={
                "error": {
                    "message": str(exc.detail),
                    "type": err_type,
                    "code": code,
                },
                "detail": exc.detail,
            },
        )

    @app.exception_handler(TheGateError)
    async def thegate_exception_handler(_request: Request, exc: TheGateError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "message": exc.message,
                    "type": exc.error_type,
                    "code": exc.code,
                },
                "detail": exc.message,
            },
        )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health & Readiness endpoints (available at root /health and /ready per PRD 10.2)
    app.include_router(health.router, tags=["Health"])

    # OpenAI-Compatible Inference API
    app.include_router(completions.router, prefix="/v1", tags=["Inference"])

    # API Key Administration endpoints
    app.include_router(keys.router, prefix="/api/v1", tags=["API Keys"])

    # Routing Policy Administration endpoints
    app.include_router(policies.router, prefix="/api/v1", tags=["Routing Policies"])

    # Model Registry & Pricing Administration endpoints
    app.include_router(models.router, prefix="/api/v1", tags=["Models & Pricing"])

    # Developer Analytics endpoints
    app.include_router(analytics.router, prefix="/api/v1", tags=["Analytics"])

    # Request Log Explorer endpoints
    app.include_router(requests.router, prefix="/api/v1", tags=["Requests Explorer"])

    # Providers & Router Connection endpoints
    app.include_router(providers.router, prefix="/api/v1", tags=["Providers & Router Connection"])

    # Team Roles & Autonomous AI Workforce
    app.include_router(roles.router, prefix="/api/v1", tags=["Team Roles & AI Workforce"])

    # Authentication & Access Control (Password-Protected Web Console)
    app.include_router(auth.router, prefix="/api/v1", tags=["Authentication"])

    return app


app = create_app()
