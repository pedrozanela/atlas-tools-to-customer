import asyncio
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.main import _validate_production_settings, lifespan


def test_production_startup_fails_when_database_is_unhealthy(monkeypatch):
    import app.db as db
    import app.main as main

    monkeypatch.setattr(db, "is_db_ready", lambda: False)
    monkeypatch.setattr(main, "get_settings", lambda: SimpleNamespace(
        APP_NAME="Certifica",
        MOCK_MODE=False,
        SEED_ON_STARTUP=False,
    ))

    async def start():
        async with lifespan(SimpleNamespace()):
            pass

    with pytest.raises(RuntimeError, match="Postgres não está pronto"):
        asyncio.run(start())


def test_pg_schema_rejects_unsafe_sql_identifier():
    with pytest.raises(ValidationError):
        Settings(PGSCHEMA='certifica; DROP SCHEMA public')

    assert Settings(PGSCHEMA="certifica_demo").PGSCHEMA == "certifica_demo"


@pytest.mark.parametrize("jwt_secret", [
    "dev-secret-change-me",
    "troque-isto-em-producao",
])
def test_production_rejects_default_jwt_secret(jwt_secret):
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        _validate_production_settings(SimpleNamespace(
            APP_ENV="production",
            JWT_SECRET=jwt_secret,
        ))


def test_production_sso_requires_default_tenant():
    with pytest.raises(RuntimeError, match="DEFAULT_TENANT_SLUG"):
        _validate_production_settings(SimpleNamespace(
            APP_ENV="production",
            JWT_SECRET="a-secure-secret",
            DATABRICKS_SSO_ENABLED=True,
            DEFAULT_TENANT_SLUG="",
            SEED_ON_STARTUP=False,
        ))


def test_seed_runtime_requires_explicit_admin_password(monkeypatch):
    from seed import seed_db

    monkeypatch.setattr(seed_db, "get_settings", lambda: SimpleNamespace(
        superadmin_emails_list=["admin@example.com"],
        SEED_ADMIN_PASSWORD=None,
    ))

    with pytest.raises(RuntimeError, match="SEED_ADMIN_PASSWORD"):
        seed_db.run_seed()


def test_static_path_containment_rejects_sibling_prefix(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    import app.main as main

    static_root = tmp_path / "static"
    static_root.mkdir()
    (static_root / "index.html").write_text("<h1>People SPA</h1>", encoding="utf-8")
    (tmp_path / "static-secret.txt").write_text("TOP_SECRET", encoding="utf-8")
    monkeypatch.setattr(main, "STATIC_DIR", static_root)

    with TestClient(main.create_app()) as client:
        response = client.get("/people/%2e%2e/static-secret.txt")

    assert response.status_code in (200, 404)
    assert "TOP_SECRET" not in response.text
