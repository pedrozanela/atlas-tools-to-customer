"""Configuracao e deteccao de ambiente (dual-mode: Databricks App x local)."""

from __future__ import annotations

import os

# Detecta execucao dentro de um Databricks App.
IS_DATABRICKS_APP = bool(os.environ.get("DATABRICKS_APP_NAME"))

# Modo do app: "internal" (SA - mostra recursos internos go/*) ou "client" (cliente -
# roda no proprio ambiente, mostra apenas documentacao publica oficial). Default: internal.
APP_MODE = (os.environ.get("APP_MODE") or "internal").strip().lower()
IS_CLIENT = APP_MODE == "client"

# Persistencia no lakehouse (Unity Catalog / Delta) via SQL warehouse.
UC_CATALOG = os.environ.get("UC_CATALOG", "")
UC_SCHEMA = os.environ.get("UC_SCHEMA", "")
WAREHOUSE_ID = (os.environ.get("DATABRICKS_WAREHOUSE_ID")
                or os.environ.get("WAREHOUSE_ID", ""))

# Ha backend lakehouse quando temos catalogo, schema e warehouse. Caso contrario,
# usa SQLite local (util para rodar/replicar sem depender do workspace).
HAS_LAKEHOUSE = bool(UC_CATALOG and UC_SCHEMA and WAREHOUSE_ID)


_ws_client = None


def get_workspace_client():
    """WorkspaceClient autenticado (SP no app, perfil CLI localmente).

    Memoizado: reusa a mesma instancia entre chamadas (criar um WorkspaceClient
    reinicializa auth/config do SDK e custa latencia a cada query)."""
    global _ws_client
    if _ws_client is None:
        from databricks.sdk import WorkspaceClient
        if IS_DATABRICKS_APP:
            _ws_client = WorkspaceClient()
        else:
            profile = os.environ.get("DATABRICKS_PROFILE", "DEFAULT")
            _ws_client = WorkspaceClient(profile=profile)
    return _ws_client
