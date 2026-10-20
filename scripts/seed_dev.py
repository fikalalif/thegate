"""Development database initialization and seed script for manual testing."""

import asyncio
from decimal import Decimal
from pathlib import Path
import sys

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.db.base import Base
import app.db.models  # Register all models
from app.db.models.api_keys import ApiKey
from app.db.models.models_registry import ModelRegistry
from app.db.models.model_pricing import ModelPricing
from app.db.models.routing_policies import RoutingPolicy
from app.core.security import hash_api_key

DEV_DB_URL = "sqlite+aiosqlite:///thegate_dev.db"
DEV_API_KEY = "tg_live_dev_test_key_1234567890abcdef"


async def seed() -> None:
    """Initialize SQLite database and seed default models, pricing, and policies."""
    print("🌱 Initializing local development database: thegate_dev.db ...")
    engine = create_async_engine(DEV_DB_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with session_factory() as session:
        # 1. Seed Developer API Key
        key = ApiKey(
            name="Developer Local Test Key",
            key_prefix=DEV_API_KEY[:10],
            key_hash=hash_api_key(DEV_API_KEY),
            status="active",
        )
        session.add(key)

        # 2. Model Registry is left completely empty by default.
        # Real models will be discovered dynamically upon connecting to 9Router or another AI Gateway.

        # 3. Seed Routing Policies
        policies_data = [
            {"name": "Cost Saver Economy", "mode": "economy", "configuration": {"max_price": 1.0}},
            {"name": "Auto Balanced", "mode": "balanced", "configuration": {"tier_preference": [1, 2]}},
            {"name": "Top Tier Quality", "mode": "quality", "configuration": {"min_tier": 3}},
        ]

        for p_data in policies_data:
            policy = RoutingPolicy(
                name=p_data["name"],
                mode=p_data["mode"],
                configuration=p_data["configuration"],
                is_active=True,
            )
            session.add(policy)

        await session.commit()

    await engine.dispose()
    print(" Database seeded successfully!")
    print(f"\n Active Test API Key: {DEV_API_KEY}")
    print(" SQLite Database File: thegate_dev.db\n")


if __name__ == "__main__":
    asyncio.run(seed())
