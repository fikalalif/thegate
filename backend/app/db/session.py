"""Database engine and asynchronous session management."""

from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Return singleton async database engine."""
    global _engine
    if _engine is None:
        settings = get_settings()
        engine_kwargs: dict[str, object] = {"echo": settings.debug}
        if "sqlite" in settings.database_url:
            engine_kwargs["connect_args"] = {
                "check_same_thread": False,
                "timeout": 30.0,
            }
        else:
            engine_kwargs["pool_pre_ping"] = True

        _engine = create_async_engine(settings.database_url, **engine_kwargs)

        if "sqlite" in settings.database_url:
            from sqlalchemy import event

            @event.listens_for(_engine.sync_engine, "connect")
            def set_sqlite_pragma(dbapi_connection: object, _connection_record: object) -> None:
                cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.close()

    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    """Return singleton async sessionmaker."""
    global _sessionmaker
    if _sessionmaker is None:
        engine = get_engine()
        _sessionmaker = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _sessionmaker


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async database session."""
    session_factory = get_sessionmaker()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def check_db_connectivity() -> bool:
    """Verify live connectivity by running a lightweight query."""
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception:
        return False
