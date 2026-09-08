"""
Testes de integração da API via TestClient (com autenticação JWT).
"""
from app.auth import security
from app.services import repo, tenants as tenants_svc, users as users_svc
from tests.conftest import ASSOC, BASE


def _complete_answers(session: dict, *, correct: bool = False) -> list[dict]:
    """Build a full payload without relying on answers exposed by the API."""
    answer_key = {
        question.id: question.correct_answers
        for question in repo.questions_for(session["certification_id"])
    }
    return [
        {
            "question_id": question["id"],
            "selected": answer_key[question["id"]] if correct else [],
        }
        for question in session["questions"]
    ]


def _auth_headers(client, email: str) -> dict[str, str]:
    password = "senha123"
    response = client.post(f"{BASE}/auth/register", json={
        "tenant_slug": "atlas", "name": "Integrity User",
        "email": email, "password": password,
    })
    if response.status_code == 409:
        response = client.post(f"{BASE}/auth/login", json={
            "tenant_slug": "atlas", "email": email, "password": password,
        })
    assert response.status_code == 200, response.text
    return {"X-App-Auth": f"Bearer {response.json()['access_token']}"}


# ── Abertos (sem auth) ────────────────────────────────────────────────────────
def test_health(client):
    r = client.get(f"{BASE}/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok" and body["mode"] == "mock"


def test_auth_status(client):
    r = client.get(f"{BASE}/auth/status")
    assert r.status_code == 200
    assert r.json()["pass_mark"] == 70
    assert r.json()["databricks_sso_enabled"] is True


def test_list_certifications_open(client):
    for path in (f"{BASE}/certifications", f"{BASE}/certifications/"):
        r = client.get(path)
        assert r.status_code == 200 and len(r.json()) == 6


def test_default_program_uses_people_and_training_brand():
    for language in ("pt", "en", "es"):
        assert tenants_svc.default_program("Customer Name", language)["title"] == "People & Training"


# ── Auth ──────────────────────────────────────────────────────────────────────
def test_register_login_me(client):
    email = "novo@example.com"
    r = client.post(f"{BASE}/auth/register", json={
        "tenant_slug": "atlas", "name": "Novo", "email": email, "password": "senha123",
    })
    assert r.status_code == 200
    tok = r.json()["access_token"]
    assert r.json()["user"]["email"] == email
    me = client.get(f"{BASE}/auth/me", headers={"X-App-Auth": f"Bearer {tok}"})
    assert me.status_code == 200 and me.json()["email"] == email


def test_register_senha_curta_422(client):
    r = client.post(f"{BASE}/auth/register", json={
        "tenant_slug": "atlas", "name": "X", "email": "x@example.com", "password": "123",
    })
    assert r.status_code == 422


def test_login_errado_401(client):
    client.post(f"{BASE}/auth/register", json={
        "tenant_slug": "atlas", "name": "Y", "email": "y@example.com", "password": "senha123",
    })
    r = client.post(f"{BASE}/auth/login", json={
        "tenant_slug": "atlas", "email": "y@example.com", "password": "errada",
    })
    assert r.status_code == 401


def test_email_duplicado_409(client):
    client.post(f"{BASE}/auth/register", json={
        "tenant_slug": "atlas", "name": "Z", "email": "z@example.com", "password": "senha123",
    })
    r = client.post(f"{BASE}/auth/register", json={
        "tenant_slug": "atlas", "name": "Z2", "email": "z@example.com", "password": "senha123",
    })
    assert r.status_code == 409


def test_allowlisted_email_cannot_escalate_via_registration(client):
    tenant = tenants_svc.get_tenant_by_slug("collision-register")
    if not tenant:
        tenant = tenants_svc.create_tenant("collision-register", "Collision Register")
    response = client.post(f"{BASE}/auth/register", json={
        "tenant_slug": tenant["slug"], "name": "Collision",
        "email": "admin@example.com", "password": "senha123",
    })
    assert response.status_code == 200
    assert response.json()["user"]["is_superadmin"] is False
    token = response.json()["access_token"]
    denied = client.get(
        f"{BASE}/platform/tenants",
        headers={"X-App-Auth": f"Bearer {token}"},
    )
    assert denied.status_code == 403


def test_allowlisted_email_cannot_escalate_via_tenant_signup(client):
    response = client.post(f"{BASE}/tenants/signup", json={
        "company": "Collision Signup", "slug": "collision-signup",
        "admin_name": "Collision", "admin_email": "admin@example.com",
        "admin_password": "senha123", "primary_color": "#2272B4",
    })
    assert response.status_code == 200
    assert response.json()["user"]["is_admin"] is True
    assert response.json()["user"]["is_superadmin"] is False
    token = response.json()["access_token"]
    denied = client.get(
        f"{BASE}/platform/tenants",
        headers={"X-App-Auth": f"Bearer {token}"},
    )
    assert denied.status_code == 403


# ── Endpoints protegidos exigem auth ──────────────────────────────────────────
def test_questions_sem_auth_401(client):
    assert client.get(f"{BASE}/certifications/{ASSOC}/questions").status_code == 401


def test_tests_sem_auth_401(client):
    payload = {"certification_id": ASSOC, "num_questions": 5}
    assert client.post(f"{BASE}/tests", json=payload).status_code == 401
    assert client.post(f"{BASE}/tests/", json=payload).status_code == 401


def test_get_questions_autenticado(auth_client):
    r = auth_client.get(f"{BASE}/certifications/{ASSOC}/questions")
    assert r.status_code == 200 and len(r.json()) > 0
    assert all("correct_answers" not in question for question in r.json())
    assert all("explanation" not in question for question in r.json())


def test_flashcards_autenticado(auth_client):
    r = auth_client.get(f"{BASE}/certifications/{ASSOC}/flashcards")
    assert r.status_code == 200 and len(r.json()) > 0


def test_criar_e_corrigir_simulado(auth_client):
    r = auth_client.post(f"{BASE}/tests", json={"certification_id": ASSOC, "num_questions": 8})
    assert r.status_code == 200
    session = r.json()
    assert len(session["questions"]) == 8
    assert all("correct_answers" not in question for question in session["questions"])
    assert all("explanation" not in question for question in session["questions"])

    answers = _complete_answers(session, correct=True)
    r2 = auth_client.post(f"{BASE}/tests/submit", json={
        "session_id": session["id"], "certification_id": ASSOC, "answers": answers, "duration_sec": 30})
    assert r2.status_code == 200
    res = r2.json()
    assert res["correct"] == 8 and res["score_pct"] == 100.0
    assert res["passed"] is True and res["pass_mark"] == 70
    assert all("correct_answers" in answer for answer in res["results"])


def test_simulado_reprovado(auth_client):
    r = auth_client.post(f"{BASE}/tests/", json={"certification_id": ASSOC, "num_questions": 10})
    assert r.status_code == 200
    session = r.json()
    response = auth_client.post(f"{BASE}/tests/submit", json={
        "session_id": session["id"], "certification_id": ASSOC,
        "answers": _complete_answers(session),
    })
    assert response.status_code == 200
    res = response.json()
    assert res["passed"] is False


def test_submit_rejeita_subset(auth_client):
    session = auth_client.post(f"{BASE}/tests/", json={
        "certification_id": ASSOC, "num_questions": 5,
    }).json()
    response = auth_client.post(f"{BASE}/tests/submit", json={
        "session_id": session["id"], "certification_id": ASSOC,
        "answers": _complete_answers(session)[:1],
    })
    assert response.status_code == 422
    assert "exatamente as questões da sessão" in response.json()["detail"]


def test_submit_rejeita_ids_forjados(auth_client):
    forged_question_session = auth_client.post(f"{BASE}/tests/", json={
        "certification_id": ASSOC, "num_questions": 5,
    }).json()
    forged_answers = _complete_answers(forged_question_session)
    forged_answers[0]["question_id"] = "forged-question-id"
    forged_question = auth_client.post(f"{BASE}/tests/submit", json={
        "session_id": forged_question_session["id"], "certification_id": ASSOC,
        "answers": forged_answers,
    })
    assert forged_question.status_code == 422
    assert "exatamente as questões da sessão" in forged_question.json()["detail"]

    forged_session = auth_client.post(f"{BASE}/tests/", json={
        "certification_id": ASSOC, "num_questions": 5,
    }).json()
    complete_answers = _complete_answers(forged_session)
    forged_session_response = auth_client.post(f"{BASE}/tests/submit", json={
        "session_id": "forged-session-id", "certification_id": ASSOC,
        "answers": complete_answers,
    })
    assert forged_session_response.status_code == 422
    assert "inválida ou expirada" in forged_session_response.json()["detail"]

    valid_response = auth_client.post(f"{BASE}/tests/submit", json={
        "session_id": forged_session["id"], "certification_id": ASSOC,
        "answers": complete_answers,
    })
    assert valid_response.status_code == 200


def test_submit_rejeita_replay(auth_client):
    session = auth_client.post(f"{BASE}/tests/", json={
        "certification_id": ASSOC, "num_questions": 5,
    }).json()
    payload = {
        "session_id": session["id"], "certification_id": ASSOC,
        "answers": _complete_answers(session),
    }
    assert auth_client.post(f"{BASE}/tests/submit", json=payload).status_code == 200
    replay = auth_client.post(f"{BASE}/tests/submit", json=payload)
    assert replay.status_code == 422
    assert "inválida ou expirada" in replay.json()["detail"]


def test_submit_rejeita_outro_usuario_sem_consumir_sessao(auth_client, client):
    session = auth_client.post(f"{BASE}/tests/", json={
        "certification_id": ASSOC, "num_questions": 5,
    }).json()
    payload = {
        "session_id": session["id"], "certification_id": ASSOC,
        "answers": _complete_answers(session),
    }
    denied = client.post(
        f"{BASE}/tests/submit", json=payload,
        headers=_auth_headers(client, "integrity-other@example.com"),
    )
    assert denied.status_code == 422
    assert "não pertence ao usuário atual" in denied.json()["detail"]

    owner_response = auth_client.post(f"{BASE}/tests/submit", json=payload)
    assert owner_response.status_code == 200


def test_num_questions_fora_do_range_422(auth_client):
    assert auth_client.post(f"{BASE}/tests/", json={"certification_id": ASSOC, "num_questions": 1}).status_code == 422
    assert auth_client.post(f"{BASE}/tests/", json={"certification_id": ASSOC, "num_questions": 999}).status_code == 422


def test_generate_autenticado_mock(auth_client):
    for path in (f"{BASE}/generate", f"{BASE}/generate/"):
        r = auth_client.post(path, json={"certification_id": ASSOC, "count": 3})
        assert r.status_code == 200
        body = r.json()
        assert body["success"] and len(body["questions"]) == 3


# ── Tracking ──────────────────────────────────────────────────────────────────
def test_my_attempts_autenticado(auth_client):
    r = auth_client.get(f"{BASE}/me/attempts")
    assert r.status_code == 200
    assert r.json()["pass_mark"] == 70 and "attempts" in r.json()


def test_admin_overview_requer_admin(auth_client, admin_client):
    assert auth_client.get(f"{BASE}/admin/overview").status_code == 403
    r = admin_client.get(f"{BASE}/admin/overview")
    assert r.status_code == 200 and "users" in r.json()


# ── SPA ───────────────────────────────────────────────────────────────────────
def test_spa_serve_index(client):
    assert client.get("/people").status_code == 200
    assert client.get("/people/").status_code == 200
    r = client.get("/people/cert/qualquer")
    assert r.status_code == 200 and "text/html" in r.headers["content-type"]
    assert client.get(f"{BASE}/rota_inexistente").status_code == 404


def test_databricks_sso_uses_only_forwarded_identity(client):
    missing = client.post(f"{BASE}/auth/databricks-sso", json={
        "email": "spoofed@example.com",
    })
    assert missing.status_code == 401

    response = client.post(f"{BASE}/auth/databricks-sso", headers={
        "x-forwarded-email": "sso.user@example.com",
        "x-forwarded-name": "SSO User",
    })
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "sso.user@example.com"
    assert response.json()["user"]["tenant_slug"] == "atlas"


def test_sso_allowlist_requires_provisioned_platform_operator(client):
    email = "sso-collision@example.com"
    headers = {"x-forwarded-email": email, "x-forwarded-name": "SSO Collision"}

    collision = client.post(f"{BASE}/auth/databricks-sso", headers=headers)
    assert collision.status_code == 200
    assert collision.json()["user"]["is_superadmin"] is False

    platform = tenants_svc.get_tenant_by_slug("platform")
    if not platform:
        platform = tenants_svc.create_tenant(
            "platform", "Platform Console", allow_self_register=False,
        )
    users_svc.create_user(
        platform["id"], email, "Provisioned Operator",
        security.hash_password("operator123"), is_admin=True,
    )

    trusted = client.post(f"{BASE}/auth/databricks-sso", headers=headers)
    assert trusted.status_code == 200
    assert trusted.json()["user"]["is_superadmin"] is True


def test_existing_token_is_revoked_when_user_is_suspended(client):
    email = "revoked-session@example.com"
    headers = _auth_headers(client, email)
    tenant = tenants_svc.get_tenant_by_slug("atlas")
    assert tenant

    users_svc.set_status(tenant["id"], email, "suspended")
    try:
        response = client.get(f"{BASE}/auth/me", headers=headers)
        assert response.status_code == 403
    finally:
        users_svc.set_status(tenant["id"], email, "active")
