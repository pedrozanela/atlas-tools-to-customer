"""
Endpoints de autenticação multi-tenant: registro, login, dados do usuário, troca de senha.
O tenant é resolvido pelo slug enviado no request (o front opera dentro de /t/{slug}).
"""
import logging
import re
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import get_settings
from app.models.schemas import (
    RegisterRequest, LoginRequest, ChangePasswordRequest, TokenResponse, UserPublic,
)
from app.auth import security
from app.services import users as users_svc, tenants as tenants_svc, activity

logger = logging.getLogger(__name__)
router = APIRouter()

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _resolve_tenant(slug: str) -> dict:
    t = tenants_svc.get_tenant_by_slug(slug)
    if not t or t.get("status") != "active":
        raise HTTPException(404, "Tenant não encontrado")
    return t


def _token_and_user(tenant: dict, email: str, name: str, is_admin: bool,
                    must_change: bool, *, is_superadmin: bool = False) -> TokenResponse:
    token = security.create_token(email, name, tenant["id"], tenant["slug"],
                                  is_admin=is_admin, is_superadmin=is_superadmin,
                                  must_change=must_change)
    user = UserPublic(email=email.lower(), name=name, tenant_id=tenant["id"],
                      tenant_slug=tenant["slug"], is_admin=is_admin,
                      is_superadmin=is_superadmin,
                      must_change_password=must_change)
    return TokenResponse(access_token=token, user=user)


def _is_active_platform_operator(email: str) -> bool:
    """Prove that an identity was explicitly provisioned as a platform operator."""
    platform = tenants_svc.get_tenant_by_slug(get_settings().PLATFORM_TENANT_SLUG)
    if not platform or platform.get("status") != "active":
        return False
    operator = users_svc.get_user(platform["id"], email)
    return bool(
        operator
        and operator.get("status") == "active"
        and operator.get("is_admin")
    )


def _is_trusted_sso_superadmin(email: str) -> bool:
    """Allow SSO elevation only for an allowlisted, provisioned operator."""
    return (
        security.is_superadmin_allowlisted(email)
        and _is_active_platform_operator(email)
    )


@router.get("/status")
def status():
    s = get_settings()
    return {
        "auth_enabled": s.ENABLE_JWT_AUTH,
        "databricks_sso_enabled": s.DATABRICKS_SSO_ENABLED,
        "pass_mark": s.PASS_MARK,
    }


@router.post("/databricks-sso", response_model=TokenResponse)
def databricks_sso(request: Request):
    """Troca a identidade confiável do proxy Databricks por um JWT interno.

    A identidade nunca é aceita de query/body. Este endpoint só deve ser
    habilitado quando o app roda atrás do Databricks Apps, que sobrescreve os
    headers x-forwarded-* antes de encaminhar a requisição.
    """
    s = get_settings()
    if not s.DATABRICKS_SSO_ENABLED:
        raise HTTPException(404, "SSO do Databricks não habilitado")
    if not s.DEFAULT_TENANT_SLUG:
        raise HTTPException(503, "DEFAULT_TENANT_SLUG é obrigatório para SSO")

    email = (request.headers.get("x-forwarded-email") or "").strip().lower()
    if not _EMAIL_RE.match(email):
        raise HTTPException(401, "Identidade Databricks não disponível")

    tenant = _resolve_tenant(s.DEFAULT_TENANT_SLUG)
    user = users_svc.get_user(tenant["id"], email)
    if user and user.get("status") == "suspended":
        raise HTTPException(403, "Usuário suspenso. Contate o administrador.")

    is_platform_tenant = tenant["slug"] == s.PLATFORM_TENANT_SLUG
    if is_platform_tenant and not user:
        # A platform tenant is never an auto-provisioning target. Operators are
        # created by the seed or by an authenticated platform administrator.
        raise HTTPException(403, "Operador da plataforma não provisionado")

    forwarded_name = (
        request.headers.get("x-forwarded-name")
        or request.headers.get("x-forwarded-preferred-username")
        or request.headers.get("x-forwarded-user")
        or ""
    ).strip()
    name = forwarded_name or (user or {}).get("name") or email.split("@", 1)[0]
    if not user:
        # Senha aleatória e não divulgada mantém o login JWT tradicional como
        # fallback apenas para contas criadas explicitamente com senha.
        user = users_svc.create_user(
            tenant["id"],
            email,
            name,
            security.hash_password(secrets.token_urlsafe(32)),
            is_admin=False,
        )

    is_admin = bool(user.get("is_admin"))
    is_superadmin = (
        (is_platform_tenant and is_admin)
        or _is_trusted_sso_superadmin(email)
    )
    activity.log_event(
        tenant["id"],
        email,
        "sso_login",
        request=request,
        user_name=user.get("name") or name,
        detail={"is_admin": is_admin},
    )
    return _token_and_user(
        tenant,
        email,
        user.get("name") or name,
        is_admin=is_admin,
        must_change=bool(user.get("must_change_password", False)),
        is_superadmin=is_superadmin,
    )


@router.post("/register", response_model=TokenResponse)
def register(data: RegisterRequest, request: Request):
    tenant = _resolve_tenant(data.tenant_slug)
    if not tenant.get("allow_self_register"):
        raise HTTPException(403, "Auto-registro desabilitado neste tenant.")
    email = data.email.strip().lower()
    if not _EMAIL_RE.match(email):
        raise HTTPException(422, "E-mail inválido")
    if len(data.password) < 6:
        raise HTTPException(422, "A senha deve ter ao menos 6 caracteres")
    if not data.name.strip():
        raise HTTPException(422, "Nome obrigatório")
    if users_svc.get_user(tenant["id"], email):
        raise HTTPException(409, "E-mail já cadastrado neste tenant. Faça login.")

    users_svc.create_user(tenant["id"], email, data.name.strip(),
                          security.hash_password(data.password), is_admin=False)
    activity.log_event(tenant["id"], email, "register", request=request,
                       user_name=data.name.strip())
    return _token_and_user(tenant, email, data.name.strip(), is_admin=False, must_change=False)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request):
    tenant = _resolve_tenant(data.tenant_slug)
    email = data.email.strip().lower()
    user = users_svc.get_user(tenant["id"], email)
    if not user or not security.verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "E-mail ou senha incorretos")
    if user.get("status") == "suspended":
        raise HTTPException(403, "Usuário suspenso. Contate o administrador.")
    activity.log_event(tenant["id"], email, "login", request=request,
                       user_name=user["name"],
                       detail={"is_admin": bool(user.get("is_admin"))})
    return _token_and_user(tenant, email, user["name"],
                           is_admin=bool(user.get("is_admin")),
                           must_change=user.get("must_change_password", False),
                           is_superadmin=(
                               tenant["slug"] == get_settings().PLATFORM_TENANT_SLUG
                               and bool(user.get("is_admin"))
                           ))


@router.get("/me", response_model=UserPublic)
def me(user: UserPublic = Depends(security.get_current_user)):
    return user


@router.post("/change-password", response_model=TokenResponse)
def change_password(data: ChangePasswordRequest, request: Request,
                    user: UserPublic = Depends(security.get_current_user)):
    if len(data.new_password) < 6:
        raise HTTPException(422, "A senha deve ter ao menos 6 caracteres")
    users_svc.update_password(user.tenant_id, user.email,
                              security.hash_password(data.new_password))
    activity.log_event(user.tenant_id, user.email, "password_change", request=request,
                       user_name=user.name)
    token = security.create_token(user.email, user.name, user.tenant_id, user.tenant_slug,
                                  is_admin=user.is_admin, is_superadmin=user.is_superadmin,
                                  must_change=False)
    return TokenResponse(access_token=token,
                         user=user.model_copy(update={"must_change_password": False}))
