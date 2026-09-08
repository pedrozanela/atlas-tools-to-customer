"""
Camada de acesso ao Postgres.

Em MOCK_MODE não há conexão — os repositórios usam o seed em memória.
Em produção a senha do Postgres é resolvida nesta ordem:
  1. PGPASSWORD ............... role nativo (deploy Atlas / dev / hosts legados)
  2. RDS_IAM_AUTH=true ........ token IAM de curta duração (AWS RDS, via boto3)
  3. LAKEBASE_ENDPOINT_NAME ... OAuth do Lakebase Autoscaling (w.postgres)

Deploy Atlas: Databricks Apps + Lakebase com role nativo (caminho 1). Quando não
há password nativo, o app usa OAuth do Lakebase Autoscaling (caminho 3).
"""
import logging
import time
from contextlib import contextmanager
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)

# cache da credencial de curta duração (Lakebase OAuth ~1h / RDS IAM ~15min).
_pw_cache: dict = {"token": None, "exp": 0.0}


def _db_password(s) -> Optional[str]:
    """Resolve a senha do Postgres conforme a estratégia configurada."""
    # O Atlas pode anexar o endpoint Lakebase e, ao mesmo tempo, configurar um
    # role PG nativo (PGUSER + PGPASSWORD). O token OAuth seria emitido para a
    # identidade do app e não autenticaria esse role; por isso o password
    # explícito tem precedência.
    if s.PGPASSWORD:
        return s.PGPASSWORD

    now = time.time()
    if _pw_cache["token"] and _pw_cache["exp"] - now > 120:
        return _pw_cache["token"]

    # Databricks Lakebase Autoscaling — gera uma credencial OAuth para o
    # endpoint anexado ao app. O token dura cerca de uma hora.
    if s.LAKEBASE_ENDPOINT_NAME:
        from app.auth.workspace_client import get_workspace_client

        cred = get_workspace_client().postgres.generate_database_credential(
            endpoint=s.LAKEBASE_ENDPOINT_NAME,
        )
        _pw_cache["token"] = cred.token
        _pw_cache["exp"] = now + 2700
        return cred.token

    # AWS RDS — token IAM via boto3
    if s.RDS_IAM_AUTH:
        import boto3
        client = boto3.client("rds", region_name=s.AWS_REGION)
        token = client.generate_db_auth_token(
            DBHostname=s.PGHOST, Port=s.PGPORT, DBUsername=s.PGUSER, Region=s.AWS_REGION,
        )
        _pw_cache["token"] = token
        _pw_cache["exp"] = now + 780          # 13 min
        return token

    return None


def _db_user(s) -> Optional[str]:
    """Usuário do Postgres. Com Lakebase OAuth (sem PGUSER explícito), a identidade
    é o service principal do app — o PG role é o client_id (DATABRICKS_CLIENT_ID)."""
    if s.LAKEBASE_ENDPOINT_NAME and not s.PGPASSWORD and s.DATABRICKS_CLIENT_ID:
        return s.DATABRICKS_CLIENT_ID
    if s.PGUSER:
        return s.PGUSER
    return s.PGUSER


@contextmanager
def get_conn():
    """Conexão Postgres de curta duração (gera credencial fresca quando necessário)."""
    import psycopg
    from psycopg import sql

    s = get_settings()
    conn = psycopg.connect(
        host=s.PGHOST, port=s.PGPORT, dbname=s.PGDATABASE,
        user=_db_user(s), password=_db_password(s) or "",
        sslmode=s.PGSSLMODE, autocommit=True, connect_timeout=15,
    )
    try:
        # O pooler do Lakebase rejeita ``options=-c search_path=...`` como
        # parâmetro de startup. Configure a sessão depois da conexão para que
        # o mesmo caminho funcione tanto no host pooler quanto no host direto.
        conn.execute(
            sql.SQL("SET search_path TO {}").format(sql.Identifier(s.PGSCHEMA)),
        )
        yield conn
    finally:
        conn.close()


def is_db_ready() -> bool:
    s = get_settings()
    if s.MOCK_MODE:
        return False
    try:
        with get_conn() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:  # pragma: no cover
        logger.warning(f"Postgres indisponível: {e}")
        return False
