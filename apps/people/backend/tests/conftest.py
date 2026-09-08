"""
Fixtures comuns dos testes. Força MOCK_MODE + auth antes de importar a app.
"""
import os
os.environ["MOCK_MODE"] = "true"
os.environ["ENABLE_JWT_AUTH"] = "true"
os.environ["JWT_SECRET"] = "test-secret-key-with-enough-length-1234567890"
os.environ["SUPERADMIN_EMAILS"] = "admin@example.com,sso-collision@example.com"
os.environ["DEFAULT_TENANT_SLUG"] = "atlas"
os.environ["DEFAULT_TENANT_NAME"] = "Atlas"
os.environ["DATABRICKS_SSO_ENABLED"] = "true"

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.auth import security
from app.main import app
from app.services.store import get_store
from app.services import tenants as tenants_svc, users as users_svc

ASSOC = "machine_learning_associate"
PROF = "machine_learning_professional"
BASE = "/people/api"


@pytest.fixture(scope="session", autouse=True)
def _force_mock():
    get_settings.cache_clear()
    s = get_settings()
    assert s.MOCK_MODE is True, "Testes devem rodar em MOCK_MODE"
    assert s.ENABLE_JWT_AUTH is True
    if not tenants_svc.get_tenant_by_slug("atlas"):
        tenants_svc.create_tenant("atlas", "Atlas")
    yield


@pytest.fixture()
def client():
    """Cliente sem autenticação."""
    return TestClient(app)


def _auth_client(email: str, name: str, password: str,
                 *, is_admin: bool = False) -> TestClient:
    c = TestClient(app)
    tenant = tenants_svc.get_tenant_by_slug("atlas")
    assert tenant
    if is_admin and not users_svc.get_user(tenant["id"], email):
        users_svc.create_user(
            tenant["id"], email, name, security.hash_password(password),
            is_admin=True,
        )
    # registra (idempotente: se já existe, faz login)
    payload = {
        "tenant_slug": "atlas",
        "name": name,
        "email": email,
        "password": password,
    }
    r = c.post(f"{BASE}/auth/register", json=payload) if not is_admin else None
    if r is None or r.status_code == 409:
        r = c.post(f"{BASE}/auth/login", json={
            "tenant_slug": "atlas", "email": email, "password": password,
        })
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    c.headers.update({"X-App-Auth": f"Bearer {token}"})
    return c


@pytest.fixture()
def auth_client():
    """Cliente autenticado como usuário comum."""
    return _auth_client("trainee@example.com", "Trainee", "senha123")


@pytest.fixture()
def admin_client():
    """Cliente autenticado como admin (ADMIN_EMAIL)."""
    return _auth_client("admin@example.com", "Admin", "admin123", is_admin=True)


@pytest.fixture()
def store():
    return get_store()
