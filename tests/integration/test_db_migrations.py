"""Integration tests for Alembic schema migrations."""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect


def test_alembic_upgrade_and_downgrade(tmp_path: Path) -> None:
    """Verify that Alembic migrations run cleanly up to head and down to base."""
    db_file = tmp_path / "migration_test.db"
    db_url = f"sqlite:///{db_file}"

    backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
    alembic_ini_path = backend_dir / "alembic.ini"

    alembic_cfg = Config(str(alembic_ini_path))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    # 1. Upgrade to head
    command.upgrade(alembic_cfg, "head")

    # Verify tables created
    from sqlalchemy import create_engine

    engine = create_engine(db_url)
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    expected_tables = {
        "api_keys",
        "routing_policies",
        "models_registry",
        "model_pricing",
        "requests",
        "routing_decisions",
        "request_attempts",
        "roles",
        "system_settings",
    }
    assert expected_tables.issubset(table_names), f"Missing tables: {expected_tables - table_names}"

    # 2. Downgrade to base
    command.downgrade(alembic_cfg, "base")

    # Verify tables removed
    inspector_after = inspect(engine)
    table_names_after = set(inspector_after.get_table_names())
    assert not expected_tables.intersection(table_names_after), (
        "Tables were not properly dropped on downgrade"
    )

    engine.dispose()
