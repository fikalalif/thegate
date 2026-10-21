"""Database initial seeding utilities for zero-config CLI setup."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_api_key
from app.db.models.api_keys import ApiKey
from app.db.models.routing_policies import RoutingPolicy

DEFAULT_DEV_KEYS = [
    ("Developer Admin Key", "thegate_dev_key"),
    ("Local CLI Key", "sk-thegate-local"),
    ("Live Dev Key", "tg_live_dev_test_key_1234567890abcdef"),
]

DEFAULT_ROUTING_POLICIES = [
    (
        "Auto Balanced",
        "balanced",
        {"description": "Balanced latency-cost heuristic optimization"},
    ),
    (
        "Cost Saver Economy",
        "economy",
        {"description": "Lowest cost model routing policy"},
    ),
    (
        "Top Tier Quality",
        "quality",
        {"description": "Highest quality capability tier policy"},
    ),
]


async def seed_initial_defaults(session: AsyncSession) -> dict[str, int]:
    """Seed initial API keys and routing policies if tables are empty."""
    stats = {"keys_seeded": 0, "policies_seeded": 0}

    # 1. API Keys
    key_exists = (await session.execute(select(ApiKey.id).limit(1))).scalar_one_or_none()
    if key_exists is None:
        for name, raw_k in DEFAULT_DEV_KEYS:
            session.add(
                ApiKey(
                    name=name,
                    key_prefix=raw_k[:10],
                    key_hash=hash_api_key(raw_k),
                    status="active",
                )
            )
            stats["keys_seeded"] += 1

    # 2. Routing Policies
    policy_exists = (
        await session.execute(select(RoutingPolicy.id).limit(1))
    ).scalar_one_or_none()
    if policy_exists is None:
        for name, mode, cfg in DEFAULT_ROUTING_POLICIES:
            session.add(
                RoutingPolicy(
                    name=name,
                    mode=mode,
                    configuration=cfg,
                    is_active=True,
                    version=1,
                )
            )
            stats["policies_seeded"] += 1

    if stats["keys_seeded"] > 0 or stats["policies_seeded"] > 0:
        await session.commit()

    return stats
