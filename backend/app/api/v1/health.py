"""Health and readiness probe API endpoints."""

from fastapi import APIRouter, Depends, Response, status

from app.core.config import Settings, get_settings
from app.db.session import check_db_connectivity
from app.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Liveness check",
    description="Returns HTTP 200 if the application process is alive and responsive.",
)
async def health_check(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Liveness probe endpoint."""
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        version="0.1.0",
        environment=settings.environment,
    )


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    status_code=status.HTTP_200_OK,
    summary="Readiness check",
    description="Returns HTTP 200 if the application and database are ready to process traffic.",
)
async def readiness_check(
    response: Response,
    settings: Settings = Depends(get_settings),
) -> ReadinessResponse:
    """Readiness probe endpoint verifying database connectivity."""
    db_connected = await check_db_connectivity()
    if not db_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadinessResponse(
            status="not_ready",
            database="disconnected",
            app=settings.app_name,
        )

    return ReadinessResponse(
        status="ready",
        database="connected",
        app=settings.app_name,
    )
