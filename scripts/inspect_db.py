"""Inspect recorded audit logs, routing decisions, and financial costs in dev database."""

import asyncio
from pathlib import Path
import sys

backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy import select
from app.db.models.requests import Request
from app.db.models.routing_decisions import RoutingDecision
from app.db.models.request_attempts import RequestAttempt


async def inspect_db() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///backend/thegate_dev.db")
    factory = async_sessionmaker(bind=engine)
    async with factory() as session:
        # Check Requests
        reqs = (await session.execute(select(Request))).scalars().all()
        print(f"📊 Total requests recorded: {len(reqs)}")
        for r in reqs:
            print(f"\n[Request: {r.id}]")
            print(f"  Status:             {r.status}")
            print(f"  Stream Enabled:     {r.stream_enabled}")
            print(f"  Tokens (In / Out):  {r.input_tokens} / {r.output_tokens}")
            print(f"  Cost:               ${r.cost_amount} ({r.cost_type})")
            print(f"  Baseline Cost:      ${r.baseline_cost_amount}")
            print(f"  Estimated Savings:  {r.estimated_savings_percent}%")
            print(f"  Latencies:          routing={r.routing_latency_ms}ms, provider={r.provider_latency_ms}ms, total={r.total_duration_ms}ms")

        # Check Routing Decisions
        decs = (await session.execute(select(RoutingDecision))).scalars().all()
        print(f"\n🎯 Total routing decisions recorded: {len(decs)}")
        for d in decs:
            print(f"  Strategy:    {d.strategy_name} (v{d.strategy_version})")
            print(f"  Reason:      {d.decision_reason}")
            print(f"  Candidates:  {d.candidate_summary}")

        # Check Request Attempts
        atts = (await session.execute(select(RequestAttempt))).scalars().all()
        print(f"\n🔁 Total attempts recorded: {len(atts)}")
        for a in atts:
            print(f"  Attempt #{a.attempt_number}: {a.status} (Usage: {a.usage_metadata})")


if __name__ == "__main__":
    asyncio.run(inspect_db())
