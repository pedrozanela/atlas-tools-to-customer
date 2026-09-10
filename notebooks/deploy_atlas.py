# Databricks notebook source
# DBTITLE 1,Cell 1
from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    dbutils  # type: ignore[name-defined]
except NameError:  # Allows local syntax checks outside Databricks.
    dbutils = None  # type: ignore[assignment]


DEFAULTS = {
    "app_name": "atlas",
    "company_name": "Databricks",
    "company_industry": "Technology",
    "warehouse_id": "",
    "lakebase_project_id": "databricks-atlas",
    "lakebase_min_cu": "0.5",
    "lakebase_max_cu": "1.0",
    "lakebase_scale_to_zero_seconds": "300",
    "uc_catalog": "databricks_atlas",
    "uc_schema": "tap",
    "uc_table": "databricks_tap_tool_submissions",
    "certifica_pg_schema": "certifica",
    "certifica_llm_endpoint": "databricks-claude-opus-4-8",
    "certifica_sso_enabled": "true",
    "certifica_default_tenant_slug": "databricks",
    "certifica_default_tenant_name": "Databricks",
    "certifica_default_tenant_color": "#FF3621",
    "certifica_superadmin_emails": "",
    "certifica_seed_on_startup": "true",
    "prebuilt_artifact_url": "",
    "run_app": "true",
    "smoke_test": "true",
}

WIDGET_LABELS = {
    "app_name": "Databricks App name",
    "company_name": "Customer / company name",
    "company_industry": "Customer industry",
    "warehouse_id": "SQL warehouse ID (blank = auto-select)",
    "lakebase_project_id": "Lakebase project ID",
    "lakebase_min_cu": "Lakebase minimum compute units (CU)",
    "lakebase_max_cu": "Lakebase maximum compute units (CU)",
    "lakebase_scale_to_zero_seconds": "Lakebase idle seconds before scale-to-zero",
    "uc_catalog": "TAP Unity Catalog catalog",
    "uc_schema": "TAP Unity Catalog schema",
    "uc_table": "TAP submissions table",
    "certifica_pg_schema": "Certifica Lakebase schema",
    "certifica_llm_endpoint": "Certifica Foundation Model endpoint",
    "certifica_sso_enabled": "Enable Databricks SSO for Certifica",
    "certifica_default_tenant_slug": "Certifica default tenant slug",
    "certifica_default_tenant_name": "People & Training tenant display name",
    "certifica_default_tenant_color": "People & Training tenant primary color",
    "certifica_superadmin_emails": (
        "Certifica superadmin emails (blank = notebook user)"
    ),
    "certifica_seed_on_startup": "Seed Certifica demo content at app startup",
    "prebuilt_artifact_url": "Prebuilt deploy artifact URL",
    "run_app": "Start app after deploy",
    "smoke_test": "Smoke-test routes after deploy",
}

DROPDOWN_WIDGETS = {
    "certifica_sso_enabled": ["true", "false"],
    "certifica_seed_on_startup": ["true", "false"],
    "run_app": ["true", "false"],
    "smoke_test": ["true", "false"],
}

if dbutils is not None:
    for _name, _value in DEFAULTS.items():
        try:
            dbutils.widgets.get(_name)  # type: ignore[union-attr]
        except Exception:
            if _name in DROPDOWN_WIDGETS:
                dbutils.widgets.dropdown(
                    _name,
                    _value,
                    DROPDOWN_WIDGETS[_name],
                    WIDGET_LABELS[_name],
                )  # type: ignore[union-attr]
            else:
                dbutils.widgets.text(
                    _name,
                    _value,
                    WIDGET_LABELS[_name],
                )  # type: ignore[union-attr]


def widget(name: str) -> str:
    if dbutils is None:
        return DEFAULTS[name]
    value = dbutils.widgets.get(name).strip()  # type: ignore[union-attr]
    return value or DEFAULTS[name]


def as_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "y"}


def as_float(value: str, name: str) -> float:
    try:
        return float(value)
    except ValueError as exc:
        raise ValueError(f"Widget `{name}` must be a number, got {value!r}.") from exc


def as_int(value: str, name: str) -> int:
    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(f"Widget `{name}` must be an integer, got {value!r}.") from exc


def validate_lakebase_compute(min_cu: float, max_cu: float, suspend_seconds: int) -> None:
    def valid_cu(value: float) -> bool:
        return value == 0.5 or (1 <= value <= 64 and value.is_integer())

    if not valid_cu(min_cu) or not valid_cu(max_cu):
        raise ValueError(
            "Lakebase Autoscaling CU values must be 0.5 or whole numbers from 1 through 64."
        )
    if min_cu > max_cu:
        raise ValueError("`lakebase_min_cu` cannot be greater than `lakebase_max_cu`.")
    if max_cu - min_cu > 16:
        raise ValueError("Lakebase Autoscaling requires max CU - min CU <= 16.")
    if not 60 <= suspend_seconds <= 604800:
        raise ValueError(
            "`lakebase_scale_to_zero_seconds` must be between 60 and 604800 seconds."
        )


def validate_certifica_config(
    pg_schema: str,
    llm_endpoint: str,
    tenant_slug: str,
    tenant_name: str,
    tenant_color: str,
    superadmin_emails: str,
) -> None:
    if not re.fullmatch(r"[a-z_][a-z0-9_]{0,62}", pg_schema):
        raise ValueError(
            "`certifica_pg_schema` must be a safe lowercase PostgreSQL identifier."
        )
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", llm_endpoint):
        raise ValueError("`certifica_llm_endpoint` is not a safe endpoint name.")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,62}", tenant_slug):
        raise ValueError(
            "`certifica_default_tenant_slug` must contain lowercase letters, "
            "numbers, or hyphens."
        )
    if not tenant_name.strip():
        raise ValueError("`certifica_default_tenant_name` cannot be empty.")
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", tenant_color):
        raise ValueError("`certifica_default_tenant_color` must be a six-digit hex color.")
    emails = [item.strip() for item in superadmin_emails.split(",") if item.strip()]
    if any(
        not re.fullmatch(
            r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
            email,
        )
        for email in emails
    ):
        raise ValueError(
            "`certifica_superadmin_emails` must be a comma-separated email list."
        )


@dataclass(frozen=True)
class DeployConfig:
    app_name: str
    company_name: str
    company_industry: str
    warehouse_id: str
    lakebase_project_id: str
    lakebase_min_cu: float
    lakebase_max_cu: float
    lakebase_scale_to_zero_seconds: int
    uc_catalog: str
    uc_schema: str
    uc_table: str
    certifica_pg_schema: str
    certifica_llm_endpoint: str
    certifica_sso_enabled: bool
    certifica_default_tenant_slug: str
    certifica_default_tenant_name: str
    certifica_default_tenant_color: str
    certifica_superadmin_emails: str
    certifica_seed_on_startup: bool
    prebuilt_artifact_url: str
    run_app: bool
    smoke_test: bool


CONFIG = DeployConfig(
    app_name=widget("app_name"),
    company_name=widget("company_name"),
    company_industry=widget("company_industry"),
    warehouse_id=widget("warehouse_id"),
    lakebase_project_id=widget("lakebase_project_id"),
    lakebase_min_cu=as_float(widget("lakebase_min_cu"), "lakebase_min_cu"),
    lakebase_max_cu=as_float(widget("lakebase_max_cu"), "lakebase_max_cu"),
    lakebase_scale_to_zero_seconds=as_int(
        widget("lakebase_scale_to_zero_seconds"),
        "lakebase_scale_to_zero_seconds",
    ),
    uc_catalog=widget("uc_catalog"),
    uc_schema=widget("uc_schema"),
    uc_table=widget("uc_table"),
    certifica_pg_schema=widget("certifica_pg_schema"),
    certifica_llm_endpoint=widget("certifica_llm_endpoint"),
    certifica_sso_enabled=as_bool(widget("certifica_sso_enabled")),
    certifica_default_tenant_slug=widget("certifica_default_tenant_slug"),
    certifica_default_tenant_name=widget("certifica_default_tenant_name"),
    certifica_default_tenant_color=widget("certifica_default_tenant_color"),
    certifica_superadmin_emails=widget("certifica_superadmin_emails"),
    certifica_seed_on_startup=as_bool(widget("certifica_seed_on_startup")),
    prebuilt_artifact_url=widget("prebuilt_artifact_url"),
    run_app=as_bool(widget("run_app")),
    smoke_test=as_bool(widget("smoke_test")),
)

validate_lakebase_compute(
    CONFIG.lakebase_min_cu,
    CONFIG.lakebase_max_cu,
    CONFIG.lakebase_scale_to_zero_seconds,
)
validate_certifica_config(
    CONFIG.certifica_pg_schema,
    CONFIG.certifica_llm_endpoint,
    CONFIG.certifica_default_tenant_slug,
    CONFIG.certifica_default_tenant_name,
    CONFIG.certifica_default_tenant_color,
    CONFIG.certifica_superadmin_emails,
)

print(
    json.dumps(
        {
            "app_name": CONFIG.app_name,
            "company_name": CONFIG.company_name,
            "warehouse_id": CONFIG.warehouse_id or "(auto)",
            "lakebase_project_id": CONFIG.lakebase_project_id,
            "lakebase_autoscaling_cu": (
                f"{CONFIG.lakebase_min_cu:g}-{CONFIG.lakebase_max_cu:g} CU"
            ),
            "lakebase_scale_to_zero_seconds": CONFIG.lakebase_scale_to_zero_seconds,
            "uc_destination": f"{CONFIG.uc_catalog}.{CONFIG.uc_schema}.{CONFIG.uc_table}",
            "certifica_pg_schema": CONFIG.certifica_pg_schema,
            "certifica_llm_endpoint": CONFIG.certifica_llm_endpoint,
            "certifica_sso_enabled": CONFIG.certifica_sso_enabled,
            "certifica_default_tenant_slug": CONFIG.certifica_default_tenant_slug,
            "certifica_default_tenant_name": CONFIG.certifica_default_tenant_name,
            "certifica_default_tenant_color": CONFIG.certifica_default_tenant_color,
            "certifica_superadmin_emails": (
                CONFIG.certifica_superadmin_emails or "(notebook user)"
            ),
            "certifica_seed_on_startup": CONFIG.certifica_seed_on_startup,
            "prebuilt_artifact_url_set": bool(CONFIG.prebuilt_artifact_url),
            "run_app": CONFIG.run_app,
            "smoke_test": CONFIG.smoke_test,
        },
        indent=2,
    )
)

# COMMAND ----------

# DBTITLE 1,Cell 2
class DbxApiError(RuntimeError):
    def __init__(self, status: int, body: str, path: str):
        self.status = status
        self.body = body
        self.path = path
        super().__init__(f"Databricks API {path} failed ({status}): {body[:1000]}")


def fail(message: str) -> None:
    raise RuntimeError(message)


def run(
    cmd: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    timeout: int | None = None,
) -> None:
    print(f"$ {' '.join(cmd)}" + (f"  (cwd={cwd})" if cwd else ""))
    subprocess.run(cmd, cwd=cwd, env=env, timeout=timeout, check=True)


def ensure_basic_tools() -> None:
    print(
        "Serverless notebook deployment: using Databricks Workspace and Apps APIs; "
        "Databricks CLI/Bundles are not required."
    )


def notebook_context() -> tuple[str, str, str]:
    if dbutils is None:
        fail("This notebook must run inside Databricks; dbutils is unavailable.")
    ctx = dbutils.notebook.entry_point.getDbutils().notebook().getContext()  # type: ignore[union-attr]
    host = ctx.apiUrl().get().rstrip("/")
    token = ctx.apiToken().get()
    user = ctx.userName().get() if ctx.userName().isDefined() else ""
    if not host or not token:
        fail("Could not read notebook host/token from Databricks context.")
    return host, token, user


DATABRICKS_HOST, DATABRICKS_TOKEN, NOTEBOOK_USER = notebook_context()


def dbx_api(method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{DATABRICKS_HOST}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {DATABRICKS_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", errors="replace")
        raise DbxApiError(err.code, raw, path) from err


def postgres_api(method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    return dbx_api(method, f"/api/2.0/postgres/{path.lstrip('/')}", body)


def poll_postgres_operation(name: str, timeout_s: int = 900) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        op = postgres_api("GET", name)
        if op.get("done"):
            if op.get("error"):
                fail(f"Lakebase operation failed: {json.dumps(op['error'])}")
            return
        time.sleep(5)
    fail(f"Timed out waiting for Lakebase operation {name}")


def choose_warehouse(configured_id: str) -> str:
    if configured_id:
        return configured_id
    data = dbx_api("GET", "/api/2.0/sql/warehouses")
    warehouses = [w for w in data.get("warehouses", []) if w.get("state") != "DELETED"]
    if not warehouses:
        fail("No SQL warehouses found. Set widget `warehouse_id` after creating one.")
    warehouses.sort(key=lambda w: 0 if w.get("state") == "RUNNING" else 1)
    selected = warehouses[0]["id"]
    print(f"Selected SQL warehouse: {selected} ({warehouses[0].get('name', 'unnamed')})")
    return selected


def wait_statement(statement_id: str, timeout_s: int = 180) -> dict[str, Any]:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        data = dbx_api("GET", f"/api/2.0/sql/statements/{statement_id}")
        state = data.get("status", {}).get("state")
        if state in {"SUCCEEDED", "FAILED", "CANCELED", "CLOSED"}:
            return data
        time.sleep(2)
    fail(f"SQL statement timed out: {statement_id}")


def run_sql(warehouse_id: str, statement: str) -> dict[str, Any]:
    submitted = dbx_api(
        "POST",
        "/api/2.0/sql/statements",
        {"warehouse_id": warehouse_id, "statement": statement, "wait_timeout": "30s"},
    )
    statement_id = submitted.get("statement_id")
    result = wait_statement(statement_id) if statement_id else submitted
    state = result.get("status", {}).get("state")
    if state not in {None, "SUCCEEDED"}:
        error = result.get("status", {}).get("error", result)
        fail(f"SQL failed: {statement}\n{json.dumps(error, indent=2)}")
    return result


def sql_ident(name: str) -> str:
    return "`" + name.replace("`", "``") + "`"


def catalog_exists(warehouse_id: str, catalog: str) -> bool:
    # SHOW CATALOGS LIKE matches the literal name (LIKE metacharacters are not
    # present in a UC catalog identifier), so an exact-name filter is safe and
    # avoids requiring SELECT on system.information_schema.
    escaped = catalog.replace("'", "''")
    result = run_sql(warehouse_id, f"SHOW CATALOGS LIKE '{escaped}'")
    rows = (result.get("result", {}) or {}).get("data_array") or []
    return any(row and row[0] == catalog for row in rows)


def ensure_uc(warehouse_id: str, cfg: DeployConfig) -> None:
    # On accounts with Default Storage but no metastore storage root,
    # `CREATE CATALOG` (even `IF NOT EXISTS`) fails because the storage root
    # is validated before existence. Only issue CREATE CATALOG when the
    # catalog is genuinely missing; reuse an existing catalog otherwise.
    if not catalog_exists(warehouse_id, cfg.uc_catalog):
        run_sql(warehouse_id, f"CREATE CATALOG IF NOT EXISTS {sql_ident(cfg.uc_catalog)}")
    else:
        print(f"Reusing existing Unity Catalog catalog: {cfg.uc_catalog}")
    run_sql(
        warehouse_id,
        f"CREATE SCHEMA IF NOT EXISTS {sql_ident(cfg.uc_catalog)}.{sql_ident(cfg.uc_schema)}",
    )
    # MOMA persists its dm_* tables in a dedicated `moma` schema (the supervisor
    # sets UC_SCHEMA=moma for that process). Upstream deploy omits it; create it
    # so MOMA can save assessments instead of degrading to read-only.
    run_sql(
        warehouse_id,
        f"CREATE SCHEMA IF NOT EXISTS {sql_ident(cfg.uc_catalog)}.{sql_ident('moma')}",
    )


def ensure_lakebase_project(
    project_id: str,
    min_cu: float,
    max_cu: float,
    suspend_seconds: int,
) -> dict[str, Any]:
    try:
        project = postgres_api("GET", f"projects/{urllib.parse.quote(project_id, safe='')}")
        if project.get("delete_time"):
            fail(
                f"Lakebase project `{project_id}` is soft-deleted and cannot be reused. "
                f"It is scheduled for purge at {project.get('purge_time') or '(unknown)'}. "
                "Permanently purge it or choose another project ID before rerunning."
            )
        print(f"Lakebase project exists: {project_id}")
        project = dict(project)
        project["_atlas_created_by_deploy"] = False
        return project
    except DbxApiError as err:
        if err.status != 404:
            raise

    print(f"Creating Lakebase project: {project_id}")
    created = postgres_api(
        "POST",
        f"projects?project_id={urllib.parse.quote(project_id, safe='')}",
        {
            "spec": {
                "display_name": project_id,
                "pg_version": "17",
                "enable_pg_native_login": True,
            },
            "initial_endpoint_spec": {
                "autoscaling_limit_min_cu": min_cu,
                "autoscaling_limit_max_cu": max_cu,
                "suspend_timeout_duration": f"{suspend_seconds}s",
            },
        },
    )
    if created.get("name") and created.get("done") is not True:
        poll_postgres_operation(created["name"])
    project = dict(
        postgres_api("GET", f"projects/{urllib.parse.quote(project_id, safe='')}")
    )
    project["_atlas_created_by_deploy"] = True
    return project


LAKEBASE_RESOURCE_ID_PATTERN = r"[a-z][a-z0-9-]{0,62}"


def lakebase_branch_id(project_id: str, branch_name: str) -> str:
    match = re.fullmatch(
        rf"projects/(?P<project>{LAKEBASE_RESOURCE_ID_PATTERN})/"
        rf"branches/(?P<branch>{LAKEBASE_RESOURCE_ID_PATTERN})",
        branch_name,
    )
    if not match or match.group("project") != project_id:
        fail(
            "Discovered Lakebase branch does not match the configured project "
            f"or resource-name format: project={project_id!r}, branch={branch_name!r}"
        )
    return match.group("branch")


def lakebase_endpoint_ids(project_id: str, endpoint_name: str) -> tuple[str, str]:
    match = re.fullmatch(
        rf"projects/(?P<project>{LAKEBASE_RESOURCE_ID_PATTERN})/"
        rf"branches/(?P<branch>{LAKEBASE_RESOURCE_ID_PATTERN})/"
        rf"endpoints/(?P<endpoint>{LAKEBASE_RESOURCE_ID_PATTERN})",
        endpoint_name,
    )
    if not match or match.group("project") != project_id:
        fail(
            "Discovered Lakebase endpoint does not match the configured project "
            f"or resource-name format: project={project_id!r}, endpoint={endpoint_name!r}"
        )
    return match.group("branch"), match.group("endpoint")


def lakebase_database_ids(
    project_id: str,
    database_resource_name: str,
) -> tuple[str, str]:
    match = re.fullmatch(
        rf"projects/(?P<project>{LAKEBASE_RESOURCE_ID_PATTERN})/"
        rf"branches/(?P<branch>{LAKEBASE_RESOURCE_ID_PATTERN})/"
        rf"databases/(?P<database>{LAKEBASE_RESOURCE_ID_PATTERN})",
        database_resource_name,
    )
    if not match or match.group("project") != project_id:
        fail(
            "Discovered Lakebase database does not match the configured project "
            "or resource-name format: "
            f"project={project_id!r}, database={database_resource_name!r}"
        )
    return match.group("branch"), match.group("database")


def lakebase_default_branch(project_id: str, project: dict[str, Any]) -> str:
    status = project.get("status") or {}
    spec = project.get("spec") or {}
    default_branch = status.get("default_branch") or spec.get("default_branch")
    if default_branch:
        if not isinstance(default_branch, str):
            fail(f"Lakebase default branch is not a resource name: {default_branch!r}")
        lakebase_branch_id(project_id, default_branch)
        return default_branch

    project_name = f"projects/{project_id}"
    data = postgres_api("GET", f"{project_name}/branches")
    branches = data.get("branches") or data.get("items") or []
    usable: list[dict[str, Any]] = []
    for branch in branches:
        branch_status = branch.get("status") or {}
        state = str(
            branch_status.get("current_state")
            or branch_status.get("state")
            or ""
        ).upper()
        if state not in {"ARCHIVED", "DELETED", "DELETING"}:
            usable.append(branch)

    if len(usable) != 1:
        fail(
            "Lakebase project does not report a default branch and branch discovery "
            "is ambiguous: "
            + json.dumps(
                {
                    "project": project_name,
                    "branches": [row.get("name") for row in usable],
                },
                indent=2,
            )
        )
    branch_name = usable[0].get("name")
    if not isinstance(branch_name, str):
        fail(f"Lakebase branch response has no resource name: {usable[0]!r}")
    lakebase_branch_id(project_id, branch_name)
    return branch_name


def lakebase_endpoint(project_id: str, project: dict[str, Any]) -> tuple[str, str, str]:
    branch_name = lakebase_default_branch(project_id, project)

    def endpoint_type(endpoint: dict[str, Any]) -> str | None:
        status = endpoint.get("status") or {}
        spec = endpoint.get("spec") or {}
        return (
            status.get("endpoint_type")
            or status.get("type")
            or spec.get("endpoint_type")
            or spec.get("type")
        )

    endpoints: list[dict[str, Any]] = []
    endpoint: dict[str, Any] | None = None
    detail: dict[str, Any] = {}
    for attempt in range(1, 19):  # up to ~3 minutes
        try:
            data = postgres_api("GET", f"{branch_name}/endpoints")
            endpoints = data.get("endpoints") or data.get("items") or []
            read_write = [
                row
                for row in endpoints
                if endpoint_type(row) == "ENDPOINT_TYPE_READ_WRITE"
            ]
            if len(read_write) > 1:
                fail(
                    "Lakebase branch has multiple read/write endpoints; refusing to "
                    "select one implicitly: "
                    + json.dumps([row.get("name") for row in read_write], indent=2)
                )
            if len(read_write) == 1:
                endpoint = read_write[0]
            elif len(endpoints) == 1:
                endpoint = endpoints[0]
            elif endpoints:
                fail(
                    "Lakebase endpoint discovery is ambiguous and no unique read/write "
                    "endpoint was reported: "
                    + json.dumps([row.get("name") for row in endpoints], indent=2)
                )

            if endpoint is not None:
                endpoint_name = endpoint.get("name")
                if not isinstance(endpoint_name, str):
                    fail(f"Lakebase endpoint response has no resource name: {endpoint!r}")
                endpoint_branch_id, _ = lakebase_endpoint_ids(project_id, endpoint_name)
                if endpoint_branch_id != lakebase_branch_id(project_id, branch_name):
                    fail(
                        "Discovered Lakebase endpoint belongs to a different branch: "
                        f"branch={branch_name!r}, endpoint={endpoint_name!r}"
                    )
                detail = postgres_api("GET", endpoint_name)
                endpoint_status = detail.get("status") or {}
                if (endpoint_status.get("hosts") or {}).get("host") and endpoint_status.get(
                    "current_state"
                ) in {"ACTIVE", "IDLE"}:
                    break
                endpoint = None
            if attempt == 18:
                break
        except DbxApiError as err:
            if err.status != 404 or attempt == 18:
                raise
        print(f"Waiting for Lakebase endpoint to be ready (attempt {attempt}/18)...")
        time.sleep(10)
    if endpoint is None:
        fail(
            "Lakebase read/write endpoint did not become ACTIVE or IDLE with a connection host: "
            + json.dumps({"endpoints": endpoints, "last_detail": detail}, indent=2)
        )

    name = endpoint["name"]
    hosts = (detail.get("status") or {}).get("hosts") or {}
    direct_host = hosts.get("host")
    pooler_host = hosts.get("read_write_pooled_host")
    if not direct_host or not pooler_host:
        fail(
            "Lakebase endpoint did not report both direct and pooled hosts: "
            + json.dumps(detail, indent=2)
        )
    return name, direct_host, pooler_host


def lakebase_database(
    project_id: str,
    endpoint_name: str,
) -> tuple[str, str]:
    branch_id, _ = lakebase_endpoint_ids(project_id, endpoint_name)
    branch_name = f"projects/{project_id}/branches/{branch_id}"
    databases: list[dict[str, Any]] = []
    detail: dict[str, Any] = {}
    for attempt in range(1, 19):
        try:
            data = postgres_api("GET", f"{branch_name}/databases")
            databases = data.get("databases") or data.get("items") or []
            if len(databases) > 1:
                fail(
                    "Lakebase database discovery is ambiguous; refusing to select one "
                    "implicitly: "
                    + json.dumps([row.get("name") for row in databases], indent=2)
                )
            if len(databases) == 1:
                database_resource_name = databases[0].get("name")
                if not isinstance(database_resource_name, str):
                    fail(
                        "Lakebase database response has no resource name: "
                        f"{databases[0]!r}"
                    )
                database_branch_id, _ = lakebase_database_ids(
                    project_id,
                    database_resource_name,
                )
                if database_branch_id != branch_id:
                    fail(
                        "Discovered Lakebase database belongs to a different branch: "
                        f"endpoint={endpoint_name!r}, database={database_resource_name!r}"
                    )
                detail = postgres_api("GET", database_resource_name)
                database_status = detail.get("status") or {}
                database_spec = detail.get("spec") or {}
                database_name = (
                    database_status.get("postgres_database")
                    or database_spec.get("postgres_database")
                    or detail.get("postgres_database")
                )
                if isinstance(database_name, str) and database_name.strip():
                    return database_resource_name, database_name
            if attempt == 18:
                break
        except DbxApiError as err:
            if err.status != 404 or attempt == 18:
                raise
        print(f"Waiting for Lakebase database to be ready (attempt {attempt}/18)...")
        time.sleep(10)

    fail(
        "Lakebase branch did not expose one ready database with a PostgreSQL name: "
        + json.dumps({"databases": databases, "last_detail": detail}, indent=2)
    )


def configure_lakebase_endpoint(
    endpoint_name: str,
    min_cu: float,
    max_cu: float,
    suspend_seconds: int,
) -> dict[str, Any]:
    desired_duration = f"{suspend_seconds}s"
    detail = postgres_api("GET", endpoint_name)
    spec = detail.get("spec", {})
    status = detail.get("status", {})
    actual_min = status.get("autoscaling_limit_min_cu", spec.get("autoscaling_limit_min_cu"))
    actual_max = status.get("autoscaling_limit_max_cu", spec.get("autoscaling_limit_max_cu"))
    actual_duration = status.get(
        "suspend_timeout_duration",
        spec.get("suspend_timeout_duration"),
    )
    no_suspension = spec.get("no_suspension") is True
    if (
        actual_min is not None
        and actual_max is not None
        and float(actual_min) == min_cu
        and float(actual_max) == max_cu
        and actual_duration == desired_duration
        and not no_suspension
    ):
        print(
            "Lakebase endpoint already configured: "
            f"{float(actual_min):g}-{float(actual_max):g} CU, "
            f"scale-to-zero after {actual_duration}"
        )
        return detail

    update_mask = (
        "spec.autoscaling_limit_min_cu,"
        "spec.autoscaling_limit_max_cu,"
        "spec.suspension"
    )
    print(
        "Reconciling Lakebase endpoint "
        f"{endpoint_name}: autoscaling={min_cu:g}-{max_cu:g} CU, "
        f"scale-to-zero={desired_duration}"
    )
    operation = postgres_api(
        "PATCH",
        f"{endpoint_name}?update_mask={urllib.parse.quote(update_mask, safe='.,')}",
        {
            "name": endpoint_name,
            "spec": {
                "autoscaling_limit_min_cu": min_cu,
                "autoscaling_limit_max_cu": max_cu,
                # Setting the timeout enables scale-to-zero. Do not send
                # no_suspension=false: the current API rejects that value.
                "suspend_timeout_duration": desired_duration,
            },
        },
    )
    if operation.get("name") and operation.get("done") is not True:
        poll_postgres_operation(operation["name"])

    for attempt in range(1, 13):
        detail = postgres_api("GET", endpoint_name)
        spec = detail.get("spec", {})
        status = detail.get("status", {})
        actual_min = status.get("autoscaling_limit_min_cu", spec.get("autoscaling_limit_min_cu"))
        actual_max = status.get("autoscaling_limit_max_cu", spec.get("autoscaling_limit_max_cu"))
        actual_duration = status.get(
            "suspend_timeout_duration",
            spec.get("suspend_timeout_duration"),
        )
        no_suspension = spec.get("no_suspension") is True
        if (
            actual_min is not None
            and actual_max is not None
            and float(actual_min) == min_cu
            and float(actual_max) == max_cu
            and actual_duration == desired_duration
            and not no_suspension
        ):
            print(
                "Lakebase endpoint configured: "
                f"{float(actual_min):g}-{float(actual_max):g} CU, "
                f"scale-to-zero after {actual_duration}"
            )
            return detail
        if attempt < 12:
            time.sleep(5)

    fail(
        "Lakebase endpoint configuration did not converge to the requested settings: "
        + json.dumps(detail, indent=2)
    )


def current_workspace_user() -> str:
    try:
        me = dbx_api("GET", "/api/2.0/preview/scim/v2/Me")
        return me.get("userName") or me.get("displayName") or NOTEBOOK_USER
    except Exception:
        return NOTEBOOK_USER


def lakebase_credential(endpoint_name: str) -> str:
    data = postgres_api("POST", "credentials", {"endpoint": endpoint_name})
    token = data.get("token")
    if not token:
        fail(f"Lakebase credential response did not include a token: {data}")
    return token


def pg_url(user: str, password: str, host: str, database_name: str) -> str:
    return (
        "postgresql://"
        + urllib.parse.quote(user, safe="")
        + ":"
        + urllib.parse.quote(password, safe="")
        + f"@{host}/"
        + urllib.parse.quote(database_name, safe="")
        + "?sslmode=require"
    )


# Only Atlas-owned schemas may be created, granted, or have ownership reconciled.
# `public` can contain unrelated objects when an existing Lakebase project is
# reused, so touching it would make the Atlas deploy invasive.
LAKEBASE_SCHEMAS = list(
    dict.fromkeys(["forge", "waf", "mas", CONFIG.certifica_pg_schema])
)


def grant_lakebase_schema_privileges(cur: Any, schemas: list[str], role: str) -> None:
    from psycopg import sql

    role_ident = sql.Identifier(role)
    for schema in schemas:
        schema_ident = sql.Identifier(schema)
        cur.execute(sql.SQL("GRANT USAGE, CREATE ON SCHEMA {} TO {}").format(schema_ident, role_ident))
        cur.execute(
            sql.SQL(
                "GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA {} TO {}"
            ).format(schema_ident, role_ident)
        )
        cur.execute(
            sql.SQL("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA {} TO {}").format(
                schema_ident, role_ident
            )
        )
        cur.execute(
            sql.SQL(
                "ALTER DEFAULT PRIVILEGES IN SCHEMA {} "
                "GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO {}"
            ).format(schema_ident, role_ident)
        )
        cur.execute(
            sql.SQL(
                "ALTER DEFAULT PRIVILEGES IN SCHEMA {} GRANT USAGE, SELECT ON SEQUENCES TO {}"
            ).format(schema_ident, role_ident)
        )


def schema_table_count(cur: Any, schema: str) -> int:
    cur.execute(
        """
        SELECT count(*)
        FROM information_schema.tables
        WHERE table_schema = %s
          AND table_type = 'BASE TABLE'
        """,
        (schema,),
    )
    return int(cur.fetchone()[0])


def apply_lakebase_schema_bootstrap(admin_url: str, work_dir: Path, role: str) -> None:
    schema_dir = work_dir / "resources" / "lakebase-schema"
    schema_files = {
        "forge": schema_dir / "forge.sql",
        "waf": schema_dir / "waf.sql",
        "mas": schema_dir / "mas.sql",
    }
    missing = [str(path.relative_to(work_dir)) for path in schema_files.values() if not path.exists()]
    if missing:
        fail(
            "Prebuilt artifact is missing serverless Lakebase schema SQL: "
            + ", ".join(missing)
            + ". Rebuild the prebuilt artifact with the current workflow and rerun the notebook."
        )

    psycopg = ensure_psycopg()
    with psycopg.connect(admin_url, connect_timeout=30, autocommit=True) as conn:
        with conn.cursor() as cur:
            for schema, path in schema_files.items():
                count = schema_table_count(cur, schema)
                if count > 0:
                    print(f"Skipping Lakebase schema bootstrap for `{schema}`: {count} tables already exist.")
                    continue

                sql_text = path.read_text(encoding="utf-8").strip()
                if "CREATE TABLE" not in sql_text:
                    fail(f"Lakebase schema SQL file does not contain CREATE TABLE statements: {path}")

                print(f"Applying Lakebase schema bootstrap for empty schema `{schema}` from {path.name}.")
                cur.execute(sql_text)

            grant_lakebase_schema_privileges(cur, LAKEBASE_SCHEMAS, role)


def ensure_psycopg():
    try:
        import psycopg

        return psycopg
    except Exception:
        print("Installing psycopg binary package for Lakebase setup.")
        try:
            run([sys.executable, "-m", "pip", "install", "--quiet", "psycopg[binary]"], timeout=300)
            import psycopg

            return psycopg
        except Exception as exc:
            fail(
                "Could not install/import psycopg. Serverless deploy needs psycopg "
                "to configure the Lakebase native role. Allow Python package installs "
                f"or preinstall psycopg on the environment. Root error: {exc}"
            )


def configure_lakebase_role(
    admin_url: str,
    database_name: str,
    role: str,
    password: str,
) -> None:
    psycopg = ensure_psycopg()
    from psycopg import sql

    with psycopg.connect(admin_url, connect_timeout=30, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS databricks_auth")
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
            for schema in LAKEBASE_SCHEMAS:
                cur.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(sql.Identifier(schema)))

            cur.execute("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = %s)", (role,))
            exists = bool(cur.fetchone()[0])
            if exists:
                cur.execute(sql.SQL("ALTER ROLE {} WITH LOGIN").format(sql.Identifier(role)))
            else:
                cur.execute(sql.SQL("CREATE ROLE {} LOGIN").format(sql.Identifier(role)))

            cur.execute(
                sql.SQL("ALTER ROLE {} PASSWORD {}").format(
                    sql.Identifier(role),
                    sql.Literal(password),
                )
            )
            cur.execute(
                sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
                    sql.Identifier(database_name),
                    sql.Identifier(role),
                )
            )
            # Certifica's startup seed runs `CREATE SCHEMA IF NOT EXISTS`, whose
            # database CREATE-privilege check precedes the IF NOT EXISTS branch —
            # so `role` needs CREATE on the database even though the schema was
            # already created above. Without this the People module crashes at
            # boot with "permission denied for database".
            cur.execute(
                sql.SQL("GRANT CREATE ON DATABASE {} TO {}").format(
                    sql.Identifier(database_name),
                    sql.Identifier(role),
                )
            )
            try:
                cur.execute(sql.SQL("GRANT {} TO CURRENT_USER").format(sql.Identifier(role)))
            except Exception:
                pass

            # The app connects as `role` (atlas-admin) and runs idempotent DDL
            # migrations (ALTER TABLE / CREATE INDEX) on first request for the
            # waf and mas schemas. DDL requires OWNERSHIP, not just CREATE — so
            # the schemas (and anything already in them from a prior deploy)
            # must be owned by `role`, otherwise WAF/MAS 500 with
            # "must be owner of table ...". Reassign ownership to `role` and
            # make it the default owner of future objects.
            for schema in LAKEBASE_SCHEMAS:
                schema_ident = sql.Identifier(schema)
                try:
                    cur.execute(sql.SQL("ALTER SCHEMA {} OWNER TO {}").format(schema_ident, sql.Identifier(role)))
                except Exception as exc:
                    print(f"WARN: could not set owner of schema {schema}: {exc}")
                cur.execute(
                    "SELECT tablename FROM pg_tables WHERE schemaname = %s AND tableowner <> %s",
                    (schema, role),
                )
                for (tbl,) in cur.fetchall():
                    try:
                        cur.execute(
                            sql.SQL("ALTER TABLE {}.{} OWNER TO {}").format(
                                schema_ident, sql.Identifier(tbl), sql.Identifier(role)
                            )
                        )
                    except Exception as exc:
                        print(f"WARN: could not set owner of {schema}.{tbl}: {exc}")
                cur.execute(
                    "SELECT sequencename FROM pg_sequences WHERE schemaname = %s AND sequenceowner <> %s",
                    (schema, role),
                )
                for (seq,) in cur.fetchall():
                    try:
                        cur.execute(
                            sql.SQL("ALTER SEQUENCE {}.{} OWNER TO {}").format(
                                schema_ident, sql.Identifier(seq), sql.Identifier(role)
                            )
                        )
                    except Exception as exc:
                        print(f"WARN: could not set owner of sequence {schema}.{seq}: {exc}")

            grant_lakebase_schema_privileges(cur, LAKEBASE_SCHEMAS, role)
    print(f"Lakebase native role ready: {role}")


def ensure_secret(scope: str, key: str, value: str) -> None:
    try:
        dbx_api("POST", "/api/2.0/secrets/scopes/create", {"scope": scope})
    except DbxApiError as err:
        body = err.body.lower()
        if err.status != 400 or ("resource_already_exists" not in body and "already exists" not in body):
            raise
    dbx_api("POST", "/api/2.0/secrets/put", {"scope": scope, "key": key, "string_value": value})


def existing_secret(scope: str, key: str) -> str | None:
    if dbutils is None:
        return None
    try:
        value = dbutils.secrets.get(scope=scope, key=key)  # type: ignore[union-attr]
        if value:
            print(f"Reusing existing secret `{scope}/{key}`.")
            return value
    except Exception:
        pass
    return None


def secret_key_exists(scope: str, key: str) -> bool:
    try:
        encoded_scope = urllib.parse.quote(scope, safe="")
        response = dbx_api("GET", f"/api/2.0/secrets/list?scope={encoded_scope}")
        return any(item.get("key") == key for item in response.get("secrets", []))
    except DbxApiError as err:
        body = err.body.lower()
        if err.status == 404 or "resource_does_not_exist" in body or "not found" in body:
            return False
        raise


def stable_generated_secret(scope: str, key: str, token_bytes: int = 36) -> str:
    """Create a random secret once and reuse it verbatim on notebook reruns."""
    value = existing_secret(scope, key)
    if value:
        return value
    if secret_key_exists(scope, key):
        fail(
            f"Secret `{scope}/{key}` already exists but this notebook cannot read it. "
            "Grant the notebook user READ on the secret scope before rerunning; "
            "the notebook will not rotate an unreadable credential."
        )
    value = secrets.token_urlsafe(token_bytes)
    ensure_secret(scope, key, value)
    print(f"Created secret `{scope}/{key}` without exposing its value.")
    return value


def lakebase_native_password(scope: str, key: str) -> str:
    # Keep the historical helper name for notebook/test compatibility. All
    # Atlas secrets now share the same no-rotation behavior.
    return stable_generated_secret(scope, key)


def find_repo_root() -> Path | None:
    starts = [Path.cwd().resolve()]
    if dbutils is not None:
        try:
            ctx = dbutils.notebook.entry_point.getDbutils().notebook().getContext()  # type: ignore[union-attr]
            notebook_path = ctx.notebookPath().get()
            workspace_path = Path("/Workspace" + notebook_path)
            starts.extend([workspace_path.parent, workspace_path.parent.parent])
        except Exception:
            pass

    seen: set[Path] = set()
    candidates: list[Path] = []
    for start in starts:
        for candidate in [start, *start.parents]:
            if candidate not in seen:
                candidates.append(candidate)
                seen.add(candidate)

    for candidate in candidates:
        if (candidate / "databricks.yml").exists() and (candidate / "package.json").exists():
            return candidate
    return None


def ensure_deploy_root(path: Path) -> Path:
    if (path / "databricks.yml").exists() and (path / "app.yaml").exists():
        return path
    matches = [
        candidate
        for candidate in [path, *path.glob("*"), *path.glob("*/*")]
        if candidate.is_dir()
        and (candidate / "databricks.yml").exists()
        and (candidate / "app.yaml").exists()
    ]
    if not matches:
        fail(
            "Prebuilt artifact did not contain a deployable Atlas root. "
            "Expected databricks.yml and app.yaml at the artifact root or one nested directory down."
        )
    return matches[0]


def safe_archive_target(dest: Path, member_name: str) -> Path:
    if not member_name or "\x00" in member_name:
        fail(f"Unsafe empty or null path in prebuilt artifact: {member_name!r}")
    dest_resolved = dest.resolve()
    target = (dest / member_name).resolve()
    try:
        target.relative_to(dest_resolved)
    except ValueError:
        fail(f"Unsafe path in prebuilt artifact: {member_name}")
    return target


def safe_extract_zip(archive: Path, dest: Path) -> None:
    with zipfile.ZipFile(archive) as zf:
        for member in zf.infolist():
            safe_archive_target(dest, member.filename)
            unix_mode = member.external_attr >> 16
            if stat.S_ISLNK(unix_mode):
                fail(f"Symlink is not allowed in zip artifact: {member.filename}")
        zf.extractall(dest)


def safe_extract_tar(archive: Path, dest: Path) -> None:
    with tarfile.open(archive) as tf:
        members = tf.getmembers()
        for member in members:
            safe_archive_target(dest, member.name)
            if member.issym() or member.islnk():
                fail(f"Link is not allowed in tar artifact: {member.name}")
            if not member.isfile() and not member.isdir():
                fail(f"Special file is not allowed in tar artifact: {member.name}")
        tf.extractall(dest, members=members, filter="data")


def download_prebuilt_artifact(url: str) -> Path:
    if not url:
        fail(
            "No Atlas repo was found next to this notebook. Set `prebuilt_artifact_url` "
            "to a full prebuilt Atlas deploy zip/tarball, or upload the notebook inside "
            "a complete Atlas repo folder."
        )

    base_dir = Path("/local_disk0") if os.access("/local_disk0", os.W_OK) else Path(tempfile.gettempdir())
    temp_root = Path(tempfile.mkdtemp(prefix="atlas-artifact-", dir=base_dir))

    if url.startswith(("http://", "https://")):
        archive = temp_root / urllib.parse.urlparse(url).path.split("/")[-1]
        if not archive.name:
            archive = temp_root / "atlas-prebuilt-artifact"
        print(f"Downloading prebuilt Atlas artifact: {url}")
        urllib.request.urlretrieve(url, archive)
    else:
        # Local filesystem path (e.g. /Volumes/...) — copy directly
        source = Path(url)
        if not source.exists():
            fail(f"Local artifact path does not exist: {url}")
        archive = temp_root / source.name
        print(f"Copying prebuilt Atlas artifact from: {url}")
        shutil.copy(str(source), str(archive))

    extracted = temp_root / "extracted"
    extracted.mkdir()
    if zipfile.is_zipfile(archive):
        safe_extract_zip(archive, extracted)
    elif tarfile.is_tarfile(archive):
        safe_extract_tar(archive, extracted)
    else:
        fail("Unsupported prebuilt artifact format. Use .zip, .tar.gz, or .tgz.")

    # Unwrap singly-nested zip (zip-inside-zip)
    entries = list(extracted.iterdir())
    if len(entries) == 1 and entries[0].suffix == ".zip" and zipfile.is_zipfile(entries[0]):
        inner_extracted = temp_root / "extracted_inner"
        inner_extracted.mkdir()
        safe_extract_zip(entries[0], inner_extracted)
        extracted = inner_extracted

    root = ensure_deploy_root(extracted)
    print(f"Prebuilt artifact root: {root}")
    return root


def copy_repo_to_temp(source_root: Path) -> Path:
    base_dir = Path("/local_disk0") if os.access("/local_disk0", os.W_OK) else Path(tempfile.gettempdir())
    temp_root = Path(tempfile.mkdtemp(prefix="atlas-deploy-", dir=base_dir))
    work_dir = temp_root / "atlas"
    ignore = shutil.ignore_patterns(
        ".git",
        "node_modules",
        ".next",
        ".turbo",
        "dist",
        "build",
        "coverage",
        "standalone.tar.gz",
        "*.log",
        ".DS_Store",
    )
    def _safe_copy(src: str, dst: str) -> None:
        try:
            shutil.copy(src, dst)
        except OSError as exc:
            if exc.errno == 95:  # ENOTSUP — workspace-virtual file (e.g. notebook), skip
                return
            raise

    shutil.copytree(source_root, work_dir, ignore=ignore, copy_function=_safe_copy)
    print(f"Working copy: {work_dir}")
    return work_dir


def resolve_work_dir() -> Path:
    if CONFIG.prebuilt_artifact_url:
        return download_prebuilt_artifact(CONFIG.prebuilt_artifact_url)

    source_root = find_repo_root()
    if source_root is None:
        return download_prebuilt_artifact(CONFIG.prebuilt_artifact_url)
    return copy_repo_to_temp(source_root)


ATLAS_APPS = ["forge", "waf", "tap", "mas", "web"]
PEOPLE_RUNTIME_DIRS = [
    Path("apps/people/backend/app"),
    Path("apps/people/backend/seed"),
    Path("apps/people/backend/static"),
]
PEOPLE_RUNTIME_EXCLUDED_PARTS = {
    "__pycache__",
    "docs",
    "frontend",
    "raw",
    "tests",
}
PEOPLE_RUNTIME_EXCLUDED_SUFFIXES = {".pyc", ".pyo", ".map"}


def validate_prebuilt_artifacts(work_dir: Path) -> None:
    missing = [
        name
        for name in ATLAS_APPS
        if not list((work_dir / "apps" / name).glob("standalone.tar.gz.part-*"))
    ]
    if missing:
        fail(
            "Serverless notebook deploy uses `build_mode=prebuilt`, so the uploaded zip "
            "or `prebuilt_artifact_url` package must contain standalone bundle chunks. Missing chunks for: "
            + ", ".join(missing)
            + ". Use a prebuilt Atlas deploy artifact URL generated by CI or by an engineer "
            "outside the customer workspace. The customer should not need to run npm."
        )

    dst = work_dir / "scripts/forge-provision-lakebase.mjs"
    src = work_dir / "apps/forge/scripts/provision-lakebase.mjs"
    if not dst.exists() and src.exists():
        shutil.copy2(src, dst)
    print("Prebuilt standalone chunks found for all Atlas apps.")


def render_template(template: str, variables: dict[str, str]) -> str:
    missing: set[str] = set()

    def replace(match: re.Match[str]) -> str:
        name = match.group(1)
        if name not in variables:
            missing.add(name)
            return ""
        return variables[name]

    rendered = re.sub(r"\$\{var\.([a-zA-Z0-9_]+)\}", replace, template)
    if missing:
        fail(f"app.yaml references undefined variables: {', '.join(sorted(missing))}")
    return rendered


def prepare_runtime_files(work_dir: Path, variables: dict[str, str]) -> None:
    minimal_pkg = {
        "name": "atlas",
        "private": True,
        "version": "0.1.0",
        "description": "Atlas pre-built Next.js bundles with the Certifica Python runtime.",
        "engines": {"node": ">=20"},
        "scripts": {"start": "node scripts/start-databricks-app.mjs"},
    }
    (work_dir / "package.json").write_text(json.dumps(minimal_pkg, indent=2) + "\n", encoding="utf-8")
    template = (work_dir / "app.yaml").read_text(encoding="utf-8")
    (work_dir / "app.yaml").write_text(render_template(template, variables), encoding="utf-8")


MAX_APP_SOURCE_FILE_BYTES = 10 * 1024 * 1024
APP_DESCRIPTION = "Atlas — Customer mapping suite for Databricks Field Engineering"
WAF_DATABRICKS_AUTH_MODE = "obo"
WAF_USER_API_SCOPES = [
    "sql",
    "genie",
    "files",
]
ATLAS_SECRET_SCOPE = "atlas-app"
ATLAS_MANAGED_SECRET_KEYS = [
    "lakebase-atlas-admin-password",
    "certifica-jwt-secret",
    "certifica-seed-admin-password",
]
ATLAS_MANAGED_RESOURCE_NAMES = {
    *ATLAS_MANAGED_SECRET_KEYS,
    "atlas-warehouse",
    "certifica-llm-endpoint",
    "database",
}
# Upgrade-only cleanup marker. This resource is never requested by the current
# deploy, persisted in the new manifest, or exposed as a widget.
ATLAS_RETIRED_RESOURCE_NAMES = {
    "pbi-llm-endpoint",
}
WAF_GENIE_TITLE = "Forge WAF Genie"
WAF_GENIE_ALLOWED_PARENT_PATHS = [
    "/Shared/Forge Genie Spaces/",
    "/Shared/",
]
LEGACY_WAF_GENIE_DESCRIPTION = (
    "Ask questions about your Databricks workspace in WAF terms — failing controls, "
    "jobs without service principals, table comment coverage, CPU/memory utilisation. "
    "Backed by system.* tables."
)


def legacy_waf_genie_description(app_name: str) -> str:
    return (
        f'Atlas-managed WAF Genie Agent owned by Databricks App "{app_name}". '
        "Analyzes failing controls with curated WAF guidance and system-table evidence."
    )


def waf_genie_description(app_name: str) -> str:
    return (
        f'Atlas-managed WAF Genie Agent for Databricks App "{app_name}", '
        "operated with user authorization. "
        "Analyzes failing controls with curated WAF guidance and system-table evidence."
    )


def runtime_source_files(work_dir: Path) -> list[Path]:
    relative_files = [
        Path("app.yaml"),
        Path("package.json"),
        Path("requirements.txt"),
        Path("apps/people/backend/requirements.txt"),
        Path("apps/moma/backend/requirements.txt"),
        Path("apps/moma/backend/app.py"),
        Path("scripts/start-databricks-app.mjs"),
    ]
    for app_name in ATLAS_APPS:
        chunks = sorted(
            path.relative_to(work_dir)
            for path in (work_dir / "apps" / app_name).glob("standalone.tar.gz.part-*")
        )
        if not chunks:
            fail(f"Missing prebuilt runtime chunks for Atlas app `{app_name}`.")
        relative_files.extend(chunks)

    for runtime_dir in PEOPLE_RUNTIME_DIRS:
        source_dir = work_dir / runtime_dir
        if not source_dir.is_dir() or source_dir.is_symlink():
            fail(f"Missing or unsafe People runtime directory: {runtime_dir}")
        included = 0
        for source in sorted(source_dir.rglob("*")):
            relative_path = source.relative_to(work_dir)
            if source.is_symlink():
                fail(f"Symlink is not allowed in People runtime source: {relative_path}")
            relative_under_root = source.relative_to(source_dir)
            if (
                any(
                    part.lower() in PEOPLE_RUNTIME_EXCLUDED_PARTS
                    or part.startswith(".")
                    for part in relative_under_root.parts
                )
                or source.suffix.lower() in PEOPLE_RUNTIME_EXCLUDED_SUFFIXES
            ):
                continue
            if source.is_file():
                relative_files.append(relative_path)
                included += 1
        if included == 0:
            fail(f"People runtime directory has no publishable files: {runtime_dir}")

    # MOMA (Maturity & Operating Model Assessment): FastAPI + built SPA, served
    # under /moma by the supervisor. Upstream bundle_vars/publish logic omits it,
    # so pip fails on the missing apps/moma/backend/requirements.txt. Publish its
    # server package and built frontend (the "frontend" part is NOT excluded here,
    # unlike People, because MOMA ships its SPA under frontend/dist).
    for runtime_dir in [
        Path("apps/moma/backend/server"),
        Path("apps/moma/backend/frontend/dist"),
    ]:
        source_dir = work_dir / runtime_dir
        if not source_dir.is_dir() or source_dir.is_symlink():
            fail(f"Missing or unsafe MOMA runtime directory: {runtime_dir}")
        included = 0
        for source in sorted(source_dir.rglob("*")):
            relative_path = source.relative_to(work_dir)
            if source.is_symlink():
                fail(f"Symlink is not allowed in MOMA runtime source: {relative_path}")
            relative_under_root = source.relative_to(source_dir)
            if (
                any(
                    part.lower() == "__pycache__" or part.startswith(".")
                    for part in relative_under_root.parts
                )
                or source.suffix.lower() in PEOPLE_RUNTIME_EXCLUDED_SUFFIXES
            ):
                continue
            if source.is_file():
                relative_files.append(relative_path)
                included += 1
        if included == 0:
            fail(f"MOMA runtime directory has no publishable files: {runtime_dir}")

    relative_files = sorted(set(relative_files), key=lambda path: path.as_posix())

    for relative_path in relative_files:
        source = work_dir / relative_path
        if not source.is_file() or source.is_symlink():
            fail(f"Invalid runtime source file: {relative_path}")
        size = source.stat().st_size
        if size > MAX_APP_SOURCE_FILE_BYTES:
            fail(
                f"App source file exceeds the 10 MiB limit ({size} bytes): {relative_path}. "
                "Rebuild the prebuilt artifact with chunks smaller than 10 MiB."
            )
    return relative_files


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def runtime_source_manifest(work_dir: Path) -> tuple[str, list[dict[str, Any]], list[Path]]:
    relative_files = runtime_source_files(work_dir)
    manifest = [
        {
            "path": relative_path.as_posix(),
            "size": (work_dir / relative_path).stat().st_size,
            "sha256": file_sha256(work_dir / relative_path),
        }
        for relative_path in relative_files
    ]
    encoded = json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest(), manifest, relative_files


def workspace_status(path: str) -> dict[str, Any] | None:
    encoded = urllib.parse.quote(path, safe="")
    try:
        return dbx_api("GET", f"/api/2.0/workspace/get-status?path={encoded}")
    except DbxApiError as err:
        if err.status == 404:
            return None
        raise


def workspace_import_raw(path: str, content: bytes, timeout_s: int = 600) -> None:
    # Multipart preserves raw bytes. The JSON/base64 form would expand Atlas's
    # 9 MiB chunks beyond Workspace Import's 10 MiB content limit.
    boundary = f"atlas-{secrets.token_hex(16)}"
    parts: list[bytes] = []

    def field(name: str, value: str) -> None:
        parts.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                value.encode("utf-8"),
                b"\r\n",
            ]
        )

    field("path", path)
    field("format", "RAW")
    field("overwrite", "true")
    filename = Path(path).name.replace('"', "")
    parts.extend(
        [
            f"--{boundary}\r\n".encode(),
            (
                f'Content-Disposition: form-data; name="content"; '
                f'filename="{filename}"\r\n'
            ).encode(),
            b"Content-Type: application/octet-stream\r\n\r\n",
            content,
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    request = urllib.request.Request(
        f"{DATABRICKS_HOST}/api/2.0/workspace/import",
        data=b"".join(parts),
        method="POST",
        headers={
            "Authorization": f"Bearer {DATABRICKS_TOKEN}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_s):
            return
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", errors="replace")
        raise DbxApiError(err.code, raw, "/api/2.0/workspace/import") from err


def workspace_user_path_segment(user: str) -> str:
    segment = user.strip()
    if not segment or segment in {".", ".."} or "/" in segment or "\\" in segment:
        fail(f"Cannot derive a safe Workspace Users path from identity {user!r}.")
    return segment


def publish_runtime_source(
    work_dir: Path,
    workspace_user: str,
    app_name: str,
) -> tuple[str, str]:
    fingerprint, manifest, relative_files = runtime_source_manifest(work_dir)
    user_segment = workspace_user_path_segment(workspace_user)
    api_root = f"/Users/{user_segment}/.atlas/releases/{app_name}/{fingerprint[:32]}"
    marker_path = f"{api_root}/.atlas-release.json"
    deployment_source_path = f"/Workspace{api_root}"

    if workspace_status(marker_path) is not None:
        print(f"Atlas App source already published: {deployment_source_path}")
        return deployment_source_path, fingerprint

    dbx_api("POST", "/api/2.0/workspace/mkdirs", {"path": api_root})
    parent_paths = sorted(
        {
            f"{api_root}/{relative_path.parent.as_posix()}"
            for relative_path in relative_files
            if relative_path.parent != Path(".")
        }
    )
    for parent_path in parent_paths:
        dbx_api("POST", "/api/2.0/workspace/mkdirs", {"path": parent_path})

    total_bytes = sum(int(entry["size"]) for entry in manifest)
    print(
        f"Publishing {len(relative_files)} App source files "
        f"({total_bytes / (1024 * 1024):.1f} MiB) via Workspace API."
    )
    for relative_path in relative_files:
        workspace_import_raw(
            f"{api_root}/{relative_path.as_posix()}",
            (work_dir / relative_path).read_bytes(),
        )

    marker = json.dumps(
        {"fingerprint": fingerprint, "files": manifest},
        sort_keys=True,
        indent=2,
    ).encode("utf-8")
    workspace_import_raw(marker_path, marker)
    if workspace_status(marker_path) is None:
        fail(f"Workspace release marker was not created: {marker_path}")
    print(f"Atlas App source published: {deployment_source_path}")
    return deployment_source_path, fingerprint


def grant_app_source_read(source_code_path: str, service_principal_id: str) -> None:
    if source_code_path.startswith("/Workspace/"):
        api_path = source_code_path[len("/Workspace") :]
    else:
        api_path = source_code_path
    if not api_path.startswith("/Users/"):
        fail(f"App source must be published under Workspace Users: {source_code_path}")

    source_status = workspace_status(api_path)
    object_id = source_status.get("object_id") if source_status else None
    if object_id is None:
        fail(f"Could not resolve Workspace directory ID for App source: {api_path}")

    encoded_object_id = urllib.parse.quote(str(object_id), safe="")
    dbx_api(
        "PATCH",
        f"/api/2.0/permissions/directories/{encoded_object_id}",
        {
            "access_control_list": [
                {
                    "service_principal_name": service_principal_id,
                    "permission_level": "CAN_READ",
                }
            ]
        },
    )
    print(f"Granted App service principal CAN_READ on source: {source_code_path}")


def destroy_config_workspace_path(workspace_user: str, app_name: str) -> str:
    user_segment = workspace_user_path_segment(workspace_user)
    return f"/Users/{user_segment}/.atlas/configs/{app_name}.destroy.json"


def build_destroy_config(
    *,
    cfg: DeployConfig,
    workspace_user: str,
    warehouse_id: str,
    app_service_principal: str | None = None,
    oauth2_app_client_id: str | None = None,
    effective_user_api_scopes: list[str] | None = None,
    consent_status: str = "not_checked",
    legacy_agent_migration: dict[str, Any] | None = None,
    lakebase_endpoint_name: str | None = None,
    release_path: str | None = None,
    release_fingerprint: str | None = None,
    deployment_id: str | None = None,
    lakebase_project_created: bool = False,
) -> dict[str, Any]:
    user_segment = workspace_user_path_segment(workspace_user)
    config_path = destroy_config_workspace_path(workspace_user, cfg.app_name)
    return {
        "schema_version": 3,
        "kind": "atlas_destroy_config",
        "generated_at_epoch_ms": int(time.time() * 1000),
        "workspace_host": DATABRICKS_HOST.rstrip("/"),
        "workspace_user": workspace_user,
        "warehouse_id": warehouse_id,
        "app": {
            "name": cfg.app_name,
            "expected_description": APP_DESCRIPTION,
            "service_principal_client_id": app_service_principal,
            "deployment_id": deployment_id,
            "managed_resource_names": sorted(ATLAS_MANAGED_RESOURCE_NAMES),
        },
        "authorization": {
            "scope": "waf",
            "mode": WAF_DATABRICKS_AUTH_MODE,
            "requested_user_api_scopes": list(WAF_USER_API_SCOPES),
            "effective_user_api_scopes": sorted(effective_user_api_scopes or []),
            "oauth2_app_client_id": oauth2_app_client_id,
            "deployer_user_name": workspace_user,
            "consent_status_at_deploy": consent_status,
            "non_waf_app_sp_grants": "preserved",
        },
        "lakebase": {
            "project_id": cfg.lakebase_project_id,
            "project_name": f"projects/{cfg.lakebase_project_id}",
            "endpoint_name": lakebase_endpoint_name,
            "delete_mode": "soft",
            # Destruction may remove the project only when this exact deploy
            # created it. Reused/shared Lakebase projects are always retained.
            "delete_project": lakebase_project_created,
        },
        "secrets": [
            {
                "scope": ATLAS_SECRET_SCOPE,
                "key": key,
                "delete_scope_if_empty": True,
            }
            for key in ATLAS_MANAGED_SECRET_KEYS
        ],
        "genie": {
            "title": WAF_GENIE_TITLE,
            "expected_description": waf_genie_description(cfg.app_name),
            "legacy_expected_descriptions": [
                legacy_waf_genie_description(cfg.app_name),
                LEGACY_WAF_GENIE_DESCRIPTION,
            ],
            "owner_user_name": workspace_user,
            "auth_mode": WAF_DATABRICKS_AUTH_MODE,
            "allowed_parent_paths": list(WAF_GENIE_ALLOWED_PARENT_PATHS),
            "delete_matching_spaces": True,
            "max_matches": 1,
            "legacy_agent_migration": legacy_agent_migration
            or {"status": "not_checked", "deleted": 0},
        },
        "unity_catalog": {
            "catalog": cfg.uc_catalog,
            "schema": cfg.uc_schema,
            "table": cfg.uc_table,
            "drop_table": True,
            "drop_schema_if_empty": True,
            "drop_catalog_if_empty": True,
        },
        "workspace_source": {
            "release_root": (
                f"/Users/{user_segment}/.atlas/releases/{cfg.app_name}"
            ),
            "release_path": release_path,
            "fingerprint": release_fingerprint,
        },
        "destroy_config_path": config_path,
    }


def persist_destroy_config(config: dict[str, Any]) -> str:
    path = config["destroy_config_path"]
    parent = str(Path(path).parent)
    dbx_api("POST", "/api/2.0/workspace/mkdirs", {"path": parent})
    workspace_import_raw(
        path,
        (json.dumps(config, sort_keys=True, indent=2) + "\n").encode("utf-8"),
    )
    if workspace_status(path) is None:
        fail(f"Destroy config was not persisted: {path}")
    print(f"Destroy config persisted: {path}")
    return path


def lakebase_app_resource_paths(
    project_id: str,
    endpoint_name: str,
    database_resource_name: str,
) -> tuple[str, str]:
    """Validate App branch/database bindings discovered from Lakebase."""
    endpoint_branch_id, _ = lakebase_endpoint_ids(project_id, endpoint_name)
    database_branch_id, _ = lakebase_database_ids(
        project_id,
        database_resource_name,
    )
    if database_branch_id != endpoint_branch_id:
        fail(
            "Discovered Lakebase endpoint and database do not match the same branch: "
            f"endpoint={endpoint_name!r}, database={database_resource_name!r}"
        )
    return endpoint_name.rsplit("/endpoints/", 1)[0], database_resource_name


def lakebase_bundle_vars(
    project_id: str,
    endpoint_name: str,
    database_resource_name: str,
    database_name: str,
    direct_host: str,
    pooler_host: str,
) -> dict[str, str]:
    endpoint_branch_id, endpoint_id = lakebase_endpoint_ids(project_id, endpoint_name)
    database_branch_id, database_id = lakebase_database_ids(
        project_id,
        database_resource_name,
    )
    if endpoint_branch_id != database_branch_id:
        fail(
            "Discovered Lakebase endpoint and database do not match the same branch: "
            f"endpoint={endpoint_name!r}, database={database_resource_name!r}"
        )
    if not database_name or not direct_host or not pooler_host:
        fail("Lakebase bundle variables require database name and both endpoint hosts.")
    return {
        "lakebase_project_id": project_id,
        "lakebase_branch_id": endpoint_branch_id,
        "lakebase_endpoint_id": endpoint_id,
        "lakebase_database_id": database_id,
        "lakebase_database_name": database_name,
        "lakebase_direct_host": direct_host,
        "lakebase_pooler_host": pooler_host,
    }


def desired_app_resources(
    cfg: DeployConfig,
    warehouse_id: str,
    lakebase_endpoint_name: str,
    lakebase_database_resource_name: str,
) -> list[dict[str, Any]]:
    # Resource descriptions are intentionally omitted: the Apps API limits
    # them to 50 characters and the bindings are self-describing.
    lakebase_branch, lakebase_database = lakebase_app_resource_paths(
        cfg.lakebase_project_id,
        lakebase_endpoint_name,
        lakebase_database_resource_name,
    )
    return [
        {
            "name": "lakebase-atlas-admin-password",
            "secret": {
                "scope": ATLAS_SECRET_SCOPE,
                "key": "lakebase-atlas-admin-password",
                "permission": "READ",
            },
        },
        {
            "name": "certifica-jwt-secret",
            "secret": {
                "scope": ATLAS_SECRET_SCOPE,
                "key": "certifica-jwt-secret",
                "permission": "READ",
            },
        },
        {
            "name": "certifica-seed-admin-password",
            "secret": {
                "scope": ATLAS_SECRET_SCOPE,
                "key": "certifica-seed-admin-password",
                "permission": "READ",
            },
        },
        {
            "name": "atlas-warehouse",
            "sql_warehouse": {
                "id": warehouse_id,
                "permission": "CAN_USE",
            },
        },
        {
            "name": "certifica-llm-endpoint",
            "serving_endpoint": {
                "name": cfg.certifica_llm_endpoint,
                "permission": "CAN_QUERY",
            },
        },
        {
            "name": "database",
            "postgres": {
                "branch": lakebase_branch,
                "database": lakebase_database,
                "permission": "CAN_CONNECT_AND_CREATE",
            },
        },
    ]


def compact_json(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: compact_json(item)
            for key, item in sorted(value.items())
            if item is not None
        }
    if isinstance(value, list):
        compacted = [compact_json(item) for item in value]
        if all(isinstance(item, dict) and "name" in item for item in compacted):
            compacted.sort(key=lambda item: item["name"])
        return compacted
    return value


def merge_app_resources(
    current: list[dict[str, Any]],
    desired: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    reconciled_names = ATLAS_MANAGED_RESOURCE_NAMES | ATLAS_RETIRED_RESOURCE_NAMES
    preserved = [
        resource
        for resource in current
        if resource.get("name") not in reconciled_names
    ]
    return sorted([*preserved, *desired], key=lambda resource: resource.get("name", ""))


def normalized_scopes(value: Any) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(scope, str) for scope in value):
        return []
    return sorted(set(value))


def preflight_user_authorization_scopes() -> list[str]:
    """User authorization scopes are GA — no preflight validation needed."""
    print("WAF User authorization scopes (GA): " + ", ".join(WAF_USER_API_SCOPES))
    return list(WAF_USER_API_SCOPES)


def wait_app_compute_state(
    app_name: str,
    expected_state: str,
    timeout_s: int = 1200,
) -> dict[str, Any]:
    encoded_name = urllib.parse.quote(app_name, safe="")
    deadline = time.time() + timeout_s
    last_status: dict[str, Any] = {}
    while time.time() < deadline:
        meta = dbx_api("GET", f"/api/2.0/apps/{encoded_name}")
        last_status = meta.get("compute_status", {})
        state = last_status.get("state")
        if state == expected_state:
            return meta
        if state == "ERROR":
            fail(
                f"Databricks App compute entered ERROR while waiting for "
                f"{expected_state}: {json.dumps(last_status, indent=2)}"
            )
        time.sleep(5)
    fail(
        f"Timed out waiting for Databricks App compute state {expected_state}: "
        + json.dumps(last_status, indent=2)
    )


def stop_app_compute(app_name: str) -> dict[str, Any]:
    encoded_name = urllib.parse.quote(app_name, safe="")
    meta = dbx_api("GET", f"/api/2.0/apps/{encoded_name}")
    if meta.get("compute_status", {}).get("state") == "STOPPED":
        return meta
    try:
        dbx_api("POST", f"/api/2.0/apps/{encoded_name}/stop", {})
    except DbxApiError as err:
        body = err.body.lower()
        transient_conflict = err.status == 409 and any(
            marker in body for marker in ("already", "in progress", "stopping", "stopped")
        )
        if not transient_conflict:
            raise
    return wait_app_compute_state(app_name, "STOPPED")


def restart_app_before_scope_update(app_name: str, current: dict[str, Any]) -> bool:
    """Satisfy the preview lifecycle prerequisite; return whether App was stopped."""
    was_stopped = current.get("compute_status", {}).get("state") == "STOPPED"
    stop_app_compute(app_name)
    print(
        "Restarting existing Databricks App before adding/changing User "
        f"authorization scopes: {app_name}"
    )
    ensure_app_compute_active(app_name)
    return was_stopped


def wait_app_configuration(
    app_name: str,
    desired_resources: list[dict[str, Any]],
    timeout_s: int = 300,
) -> dict[str, Any]:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        meta = dbx_api(
            "GET",
            f"/api/2.0/apps/{urllib.parse.quote(app_name, safe='')}",
        )
        requested = normalized_scopes(meta.get("user_api_scopes"))
        effective = normalized_scopes(meta.get("effective_user_api_scopes"))
        if (
            compact_json(meta.get("resources") or []) == compact_json(desired_resources)
            and requested == normalized_scopes(WAF_USER_API_SCOPES)
            and set(WAF_USER_API_SCOPES).issubset(effective)
        ):
            return meta
        time.sleep(3)
    fail(
        f"Databricks App configuration did not expose all requested/effective "
        f"OBO scopes within {timeout_s}s: {app_name}"
    )


def wait_app_service_principal(app_name: str, timeout_s: int = 300) -> dict[str, Any]:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            meta = dbx_api(
                "GET",
                f"/api/2.0/apps/{urllib.parse.quote(app_name, safe='')}",
            )
        except DbxApiError as err:
            if err.status == 404:
                time.sleep(2)
                continue
            raise
        if meta.get("service_principal_client_id"):
            return meta
        time.sleep(2)
    fail(f"Timed out waiting for App service principal: {app_name}")


def ensure_app(
    cfg: DeployConfig,
    warehouse_id: str,
    lakebase_endpoint_name: str,
    lakebase_database_resource_name: str,
    preflight_allowed_scopes: list[str] | None = None,
) -> dict[str, Any]:
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,29}", cfg.app_name):
        fail(
            "Databricks App name must contain 2-30 lowercase alphanumeric "
            "characters or hyphens."
        )
    if preflight_allowed_scopes is None:
        preflight_user_authorization_scopes()
    encoded_name = urllib.parse.quote(cfg.app_name, safe="")
    desired_resources = desired_app_resources(
        cfg,
        warehouse_id,
        lakebase_endpoint_name,
        lakebase_database_resource_name,
    )
    desired_scopes = list(WAF_USER_API_SCOPES)
    created_app = False
    try:
        meta = dbx_api("GET", f"/api/2.0/apps/{encoded_name}")
    except DbxApiError as err:
        if err.status != 404:
            raise
        print(f"Creating Databricks App without compute: {cfg.app_name}")
        try:
            dbx_api(
                "POST",
                "/api/2.0/apps?no_compute=true",
                {
                    "name": cfg.app_name,
                    "description": APP_DESCRIPTION,
                    "resources": desired_resources,
                    "user_api_scopes": desired_scopes,
                },
            )
        except DbxApiError as create_err:
            if create_err.status != 409:
                raise
            created_app = False
        else:
            created_app = True
        meta = wait_app_service_principal(cfg.app_name)
    else:
        if meta.get("description") != APP_DESCRIPTION:
            fail(
                f"Refusing to modify existing App `{cfg.app_name}` because its "
                "description does not match the Atlas ownership marker."
            )

    for _ in range(3):
        current_resources = meta.get("resources") or []
        merged_resources = merge_app_resources(current_resources, desired_resources)
        requested_scopes = normalized_scopes(meta.get("user_api_scopes"))
        effective_scopes = normalized_scopes(meta.get("effective_user_api_scopes"))
        config_matches = (
            meta.get("description") == APP_DESCRIPTION
            and compact_json(current_resources) == compact_json(merged_resources)
            and requested_scopes == normalized_scopes(desired_scopes)
            and set(desired_scopes).issubset(effective_scopes)
        )
        if config_matches:
            print(
                f"Databricks App OBO configuration already current: {cfg.app_name}"
            )
            return meta

        restore_stopped = False
        scopes_changed = (
            requested_scopes != normalized_scopes(desired_scopes)
            or not set(desired_scopes).issubset(effective_scopes)
        )
        if scopes_changed and not created_app:
            restore_stopped = restart_app_before_scope_update(cfg.app_name, meta)

        print(f"Reconciling Databricks App OBO configuration: {cfg.app_name}")
        dbx_api(
            "PATCH",
            f"/api/2.0/apps/{encoded_name}",
            {
                "description": APP_DESCRIPTION,
                "resources": merged_resources,
                "user_api_scopes": desired_scopes,
            },
        )
        meta = wait_app_configuration(cfg.app_name, merged_resources)
        if restore_stopped:
            stop_app_compute(cfg.app_name)
            meta = app_metadata(cfg.app_name)
        return meta

    fail(f"Databricks App configuration did not converge: {cfg.app_name}")


def set_app_deployer_acl(app_name: str, workspace_user: str) -> None:
    if (
        not workspace_user
        or "/" in workspace_user
        or "\\" in workspace_user
        or not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,29}", app_name)
    ):
        fail("Unsafe App or deployer identity for App ACL.")
    encoded_name = urllib.parse.quote(app_name, safe="")
    dbx_api(
        "PUT",
        f"/api/2.0/permissions/apps/{encoded_name}",
        {
            "access_control_list": [
                {
                    "user_name": workspace_user,
                    "permission_level": "CAN_MANAGE",
                }
            ]
        },
    )
    print(f"Restricted Databricks App access to deployer: {workspace_user}")


def poll_app_deployment(
    app_name: str,
    deployment_id: str,
    timeout_s: int = 1200,
) -> dict[str, Any]:
    encoded_name = urllib.parse.quote(app_name, safe="")
    encoded_deployment = urllib.parse.quote(deployment_id, safe="")
    deadline = time.time() + timeout_s
    previous_state: str | None = None
    while time.time() < deadline:
        deployment = dbx_api(
            "GET",
            f"/api/2.0/apps/{encoded_name}/deployments/{encoded_deployment}",
        )
        status = deployment.get("status", {})
        state = status.get("state")
        if state != previous_state:
            print(f"App deployment {deployment_id}: {state or 'UNKNOWN'}")
            previous_state = state
        if state == "SUCCEEDED":
            return deployment
        if state in {"FAILED", "CANCELLED"}:
            fail(f"App deployment {state.lower()}: {status.get('message', deployment)}")
        time.sleep(5)
    fail(f"Timed out waiting for App deployment {deployment_id}")


def ensure_app_deployment(
    app_name: str,
    source_code_path: str,
    fingerprint: str,
) -> dict[str, Any]:
    encoded_name = urllib.parse.quote(app_name, safe="")
    meta = app_metadata(app_name)
    active = meta.get("active_deployment") or {}
    active_status = active.get("status", {}).get("state")
    if active.get("source_code_path") == source_code_path and active_status == "SUCCEEDED":
        print(f"Atlas release already active: {active.get('deployment_id')}")
        return active

    deterministic_id = fingerprint[:32]
    create_with_id = True
    try:
        existing = dbx_api(
            "GET",
            f"/api/2.0/apps/{encoded_name}/deployments/{deterministic_id}",
        )
        state = existing.get("status", {}).get("state")
        if state == "IN_PROGRESS":
            return poll_app_deployment(app_name, deterministic_id)
        # A succeeded deployment that is no longer active must be deployed
        # again so it becomes the last active release. Failed/cancelled IDs
        # likewise cannot be safely reused.
        create_with_id = False
    except DbxApiError as err:
        if err.status != 404:
            raise

    body: dict[str, Any] = {
        "source_code_path": source_code_path,
        "mode": "SNAPSHOT",
    }
    if create_with_id:
        body["deployment_id"] = deterministic_id
    print(f"Creating App deployment from {source_code_path}")
    try:
        created = dbx_api(
            "POST",
            f"/api/2.0/apps/{encoded_name}/deployments",
            body,
        )
    except DbxApiError as deploy_err:
        if deploy_err.status != 409 or not create_with_id:
            raise
        return poll_app_deployment(app_name, deterministic_id)

    deployment_id = created.get("deployment_id")
    if not deployment_id:
        fail(f"App deployment response has no deployment_id: {created}")
    return poll_app_deployment(app_name, deployment_id)


def ensure_app_compute_active(
    app_name: str,
    timeout_s: int = 1200,
) -> dict[str, Any]:
    encoded_name = urllib.parse.quote(app_name, safe="")
    deadline = time.time() + timeout_s
    start_requested = False
    last_compute_status: dict[str, Any] = {}
    while time.time() < deadline:
        meta = dbx_api("GET", f"/api/2.0/apps/{encoded_name}")
        compute_status = meta.get("compute_status", {})
        compute_state = compute_status.get("state")
        last_compute_status = compute_status
        if compute_state == "ACTIVE":
            print(f"Databricks App compute is active: {app_name}")
            return meta
        if compute_state == "ERROR":
            fail(
                f"Databricks App compute failed to start: "
                f"{json.dumps(compute_status, indent=2)}"
            )
        if compute_state == "STOPPED" and not start_requested:
            print(f"Starting Databricks App compute before deployment: {app_name}")
            try:
                dbx_api("POST", f"/api/2.0/apps/{encoded_name}/start", {})
            except DbxApiError as err:
                body = err.body.lower()
                transient_conflict = err.status == 409 and any(
                    marker in body
                    for marker in ("already", "in progress", "starting", "active")
                )
                if not transient_conflict:
                    raise
                print(f"App start is already in progress: {err.body[:300]}")
            start_requested = True
        time.sleep(5)
    fail(
        f"Timed out waiting for Databricks App compute: {app_name}\n"
        + json.dumps(last_compute_status, indent=2)
    )


def ensure_app_running(
    app_name: str,
    deployment_id: str,
    timeout_s: int = 1200,
) -> dict[str, Any]:
    encoded_name = urllib.parse.quote(app_name, safe="")
    deadline = time.time() + timeout_s
    start_requested = False
    last_status: dict[str, Any] = {}
    while time.time() < deadline:
        meta = dbx_api("GET", f"/api/2.0/apps/{encoded_name}")
        compute_status = meta.get("compute_status", {})
        app_status = meta.get("app_status", {})
        compute_state = compute_status.get("state")
        app_state = app_status.get("state")
        active_id = (meta.get("active_deployment") or {}).get("deployment_id")
        last_status = {
            "compute_status": compute_status,
            "app_status": app_status,
            "active_deployment_id": active_id,
            "expected_deployment_id": deployment_id,
        }
        if (
            compute_state == "ACTIVE"
            and app_state == "RUNNING"
            and active_id == deployment_id
        ):
            print(f"Databricks App is running: {app_name}")
            return meta
        if compute_state == "ERROR" or app_state == "CRASHED":
            fail(
                "Databricks App failed to start: "
                + json.dumps(last_status, indent=2)
            )
        if compute_state == "STOPPED" and not start_requested:
            print(f"Starting Databricks App: {app_name}")
            dbx_api("POST", f"/api/2.0/apps/{encoded_name}/start", {})
            start_requested = True
        time.sleep(5)
    fail(
        f"Timed out waiting for Databricks App to run: {app_name}\n"
        + json.dumps(last_status, indent=2)
    )



def app_metadata(app_name: str) -> dict[str, Any]:
    return dbx_api("GET", f"/api/2.0/apps/{urllib.parse.quote(app_name, safe='')}")


def app_url_from_metadata(meta: dict[str, Any]) -> str | None:
    candidates = [
        meta.get("url"),
        meta.get("app_url"),
        meta.get("deployment_url"),
        meta.get("active_deployment", {}).get("url") if isinstance(meta.get("active_deployment"), dict) else None,
    ]
    for value in candidates:
        if isinstance(value, str) and value:
            normalized = value if value.startswith("http") else f"https://{value}"
            return normalized.rstrip("/")
    return None


def inspect_deployer_consent(meta: dict[str, Any]) -> dict[str, Any]:
    oauth_client_id = meta.get("oauth2_app_client_id")
    if not isinstance(oauth_client_id, str) or not oauth_client_id:
        fail(
            "Apps API did not return oauth2_app_client_id after configuring OBO. "
            "Confirm that Databricks Apps User authorization is enabled."
        )
    encoded_id = urllib.parse.quote(oauth_client_id, safe="")
    try:
        consent = dbx_api(
            "GET",
            f"/api/2.0/oauth-app-integrations/{encoded_id}/user-consent/me",
        )
    except DbxApiError as err:
        if err.status == 404:
            status = "not_granted"
            approved_scopes: list[str] = []
        else:
            raise
    else:
        approved_scopes = normalized_scopes(
            consent.get("scopes")
            or consent.get("approved_scopes")
            or consent.get("user_api_scopes")
        )
        status = (
            "granted"
            if set(WAF_USER_API_SCOPES).issubset(approved_scopes)
            else "consent_record_present"
        )
    print(
        "Manual consent check: open the Atlas App as the deployer and approve "
        "these WAF OBO scopes when prompted: "
        + ", ".join(WAF_USER_API_SCOPES)
    )
    return {
        "status": status,
        "approved_scopes": approved_scopes,
        "oauth2_app_client_id": oauth_client_id,
    }


def grant_system_privileges(warehouse_id: str, sp_id: str) -> None:
    """Best-effort App-SP grants on system.* for non-WAF modules.

    Atlas forwards the deployer's OBO token to both the WAF and Forge zones
    (see apps/web/proxy.ts), so Forge reads system.* with the caller's own
    grants. These App-SP grants are therefore an optimisation, not a
    prerequisite: on a metastore where only an account admin can manage
    system.* grants, we warn and continue instead of failing the deploy.
    """
    principal = sp_id.replace("`", "``")
    system_schemas = [
        "access",
        "compute",
        "lakeflow",
        "billing",
        "query",
        "information_schema",
    ]
    try:
        run_sql(warehouse_id, f"GRANT USE CATALOG ON CATALOG `system` TO `{principal}`")
    except Exception as exc:
        print(
            "WARN: could not grant App-SP USE CATALOG on system "
            f"({exc}). Forge reads system.* via the forwarded OBO token; "
            "an account admin can grant the App SP directly if the "
            "service-principal path is needed later."
        )
        return
    for schema in system_schemas:
        try:
            run_sql(
                warehouse_id,
                f"GRANT USE SCHEMA ON SCHEMA `system`.`{schema}` TO `{principal}`",
            )
            run_sql(
                warehouse_id,
                f"GRANT SELECT ON SCHEMA `system`.`{schema}` TO `{principal}`",
            )
            print(f"Preserved system.{schema} App-SP access for non-WAF Atlas modules")
        except Exception as exc:
            print(
                f"WARN: could not grant App-SP access to system.{schema} "
                f"({exc}). Forge uses the forwarded OBO token for system.* "
                "reads, so this is non-fatal."
            )


def grant_tap_privileges(warehouse_id: str, cfg: DeployConfig, sp_id: str) -> None:
    principal = sp_id.replace("`", "``")
    statements = [
        f"GRANT USE CATALOG ON CATALOG {sql_ident(cfg.uc_catalog)} TO `{principal}`",
        f"GRANT USE SCHEMA ON SCHEMA {sql_ident(cfg.uc_catalog)}.{sql_ident(cfg.uc_schema)} TO `{principal}`",
        f"GRANT CREATE TABLE, MODIFY ON SCHEMA {sql_ident(cfg.uc_catalog)}.{sql_ident(cfg.uc_schema)} TO `{principal}`",
        # MOMA writes its dm_* tables into the `moma` schema (see ensure_uc).
        f"GRANT USE SCHEMA ON SCHEMA {sql_ident(cfg.uc_catalog)}.{sql_ident('moma')} TO `{principal}`",
        f"GRANT CREATE TABLE, MODIFY ON SCHEMA {sql_ident(cfg.uc_catalog)}.{sql_ident('moma')} TO `{principal}`",
    ]
    for statement in statements:
        run_sql(warehouse_id, statement)


def has_direct_manage_permission(
    permissions: dict[str, Any],
    principal_field: str,
    principal_name: str,
) -> bool:
    for entry in permissions.get("access_control_list", []):
        if not isinstance(entry, dict) or entry.get(principal_field) != principal_name:
            continue
        for permission in entry.get("all_permissions", []):
            if (
                isinstance(permission, dict)
                and permission.get("permission_level") == "CAN_MANAGE"
                and permission.get("inherited") is not True
            ):
                return True
    return False


def is_safe_genie_id(space_id: Any) -> bool:
    return isinstance(space_id, str) and bool(
        re.fullmatch(
            r"(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-"
            r"[0-9a-f]{4}-[0-9a-f]{12})",
            space_id,
        )
    )


def retire_legacy_waf_genie_agent(
    app_name: str,
    app_service_principal: str,
    owner_user_name: str,
) -> dict[str, Any]:
    """Retire one SP-owned legacy Agent; user-owned legacy is updated at runtime."""
    accepted_legacy_descriptions = {
        legacy_waf_genie_description(app_name),
        LEGACY_WAF_GENIE_DESCRIPTION,
    }
    current_description = waf_genie_description(app_name)
    accepted_descriptions = {*accepted_legacy_descriptions, current_description}
    candidates: list[dict[str, Any]] = []
    page_token: str | None = None
    while True:
        params = {"page_size": "100"}
        if page_token:
            params["page_token"] = page_token
        page = dbx_api(
            "GET",
            f"/api/2.0/genie/spaces?{urllib.parse.urlencode(params)}",
        )
        candidates.extend(
            item
            for item in page.get("spaces", [])
            if isinstance(item, dict) and item.get("title") == WAF_GENIE_TITLE
        )
        page_token = page.get("next_page_token")
        if not page_token:
            break

    allowed_paths = {
        path.rstrip("/") + "/" for path in WAF_GENIE_ALLOWED_PARENT_PATHS
    }
    legacy_matches: list[tuple[str, str]] = []
    for candidate in candidates:
        space_id = candidate.get("space_id")
        if not is_safe_genie_id(space_id):
            fail(f"Unsafe Genie Agent ID returned for Atlas title: {space_id!r}")
        encoded_id = urllib.parse.quote(space_id, safe="")
        live = dbx_api("GET", f"/api/2.0/genie/spaces/{encoded_id}")
        live_description = live.get("description")
        if live_description not in accepted_descriptions:
            continue
        parent_path = live.get("parent_path") or candidate.get("parent_path")
        normalized_parent = (
            parent_path.rstrip("/") + "/" if isinstance(parent_path, str) else None
        )
        if normalized_parent not in allowed_paths:
            fail(
                f"Legacy Atlas Genie Agent `{space_id}` has an unexpected parent "
                f"path and will not be migrated: {parent_path!r}"
            )
        permissions = dbx_api(
            "GET",
            f"/api/2.0/permissions/genie/{encoded_id}",
        )
        if live_description == current_description:
            if not has_direct_manage_permission(
                permissions, "user_name", owner_user_name
            ):
                fail(
                    f"Refusing to accept current WAF OBO Genie Agent `{space_id}` "
                    "because its ACL does not prove deployer ownership."
                )
            legacy_matches.append((space_id, "current_obo"))
        elif has_direct_manage_permission(
            permissions, "service_principal_name", app_service_principal
        ):
            legacy_matches.append((space_id, "app_sp"))
        elif has_direct_manage_permission(
            permissions, "user_name", owner_user_name
        ):
            legacy_matches.append((space_id, "deployer"))
        else:
            # The workspace's shared "Forge WAF Genie" agent may be owned by a
            # different Atlas deploy (group-based ACL, no direct App-SP/deployer
            # CAN_MANAGE). Do NOT delete or migrate another deploy's agent —
            # skip it here and let the WAF runtime reconcile the shared agent
            # under this deploy's OBO identity on the first assessment.
            print(
                f"WARN: skipping shared Genie Agent `{space_id}` — its ACL does "
                "not prove this deploy's ownership, so it belongs to another "
                "Atlas deploy. It will be reconciled at WAF runtime under OBO."
            )
            continue

    if len(legacy_matches) > 1:
        fail(
            f"Refusing to reconcile {len(legacy_matches)} Atlas WAF Genie Agents; "
            "expected at most one exact current-or-legacy match."
        )
    deleted = 0
    retained_for_runtime_update = 0
    current_obo = 0
    for space_id, owner_kind in legacy_matches:
        if owner_kind == "current_obo":
            current_obo += 1
            continue
        if owner_kind == "deployer":
            retained_for_runtime_update += 1
            print(
                "Legacy deployer-owned WAF Genie Agent will be updated in place "
                "with the OBO marker on the next assessment."
            )
            continue
        dbx_api(
            "DELETE",
            f"/api/2.0/genie/spaces/{urllib.parse.quote(space_id, safe='')}",
        )
        deleted += 1
        print(
            "Deleted legacy SP-owned WAF Genie Agent. The next assessment will "
            "recreate it under the deployer's OBO identity."
        )
    return {
        "status": "complete",
        "deleted": deleted,
        "retained_for_runtime_update": retained_for_runtime_update,
        "current_obo": current_obo,
        "legacy_owner_service_principal": app_service_principal,
        "obo_owner_user_name": owner_user_name,
    }


def smoke_test(app_url: str) -> list[dict[str, Any]]:
    checks = [
        {"path": "/", "expected_status": 200},
        {"path": "/forge", "expected_status": 200},
        {"path": "/waf", "expected_status": 200},
        {"path": "/tap", "expected_status": 200},
        {"path": "/maturity", "expected_status": 200},
        {"path": "/people", "expected_status": 200},
        {
            "path": "/people/api/health",
            "expected_status": 200,
            "content_type": "application/json",
        },
        {
            "path": "/forge/api/metadata?type=unsupported",
            "expected_status": 400,
            "content_type": "application/json",
        },
    ]
    results: list[dict[str, Any]] = []
    for check in checks:
        path = check["path"]
        expected_status = check["expected_status"]
        expected_content_type = check.get("content_type")
        url = app_url + path
        status: int | str = "error"
        content_type = ""
        for attempt in range(1, 13):
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {DATABRICKS_TOKEN}"})
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    status = resp.status
                    content_type = resp.headers.get("Content-Type", "")
            except urllib.error.HTTPError as err:
                status = err.code
                content_type = err.headers.get("Content-Type", "") if err.headers else ""
            except Exception as exc:
                status = type(exc).__name__
            response_matches = status == expected_status and (
                not expected_content_type or expected_content_type in content_type.lower()
            )
            if response_matches:
                break
            time.sleep(10 if attempt < 12 else 0)
        results.append(
            {
                "path": path,
                "status": status,
                "expected_status": expected_status,
                "content_type": content_type,
                "expected_content_type": expected_content_type,
            }
        )
    return results

# COMMAND ----------

# DBTITLE 1,Cell 3
ensure_basic_tools()

warehouse_id = choose_warehouse(CONFIG.warehouse_id)
workspace_user = current_workspace_user()
CERTIFICA_SUPERADMIN_EMAILS = CONFIG.certifica_superadmin_emails or workspace_user
validate_certifica_config(
    CONFIG.certifica_pg_schema,
    CONFIG.certifica_llm_endpoint,
    CONFIG.certifica_default_tenant_slug,
    CONFIG.certifica_default_tenant_name,
    CONFIG.certifica_default_tenant_color,
    CERTIFICA_SUPERADMIN_EMAILS,
)
ALLOWED_USER_API_SCOPES = preflight_user_authorization_scopes()
work_dir = resolve_work_dir()
DESTROY_CONFIG = build_destroy_config(
    cfg=CONFIG,
    workspace_user=workspace_user,
    warehouse_id=warehouse_id,
)
DESTROY_CONFIG_PATH = persist_destroy_config(DESTROY_CONFIG)
ensure_uc(warehouse_id, CONFIG)
validate_prebuilt_artifacts(work_dir)

lakebase_project = ensure_lakebase_project(
    CONFIG.lakebase_project_id,
    CONFIG.lakebase_min_cu,
    CONFIG.lakebase_max_cu,
    CONFIG.lakebase_scale_to_zero_seconds,
)
endpoint_name, direct_host, pooler_host = lakebase_endpoint(
    CONFIG.lakebase_project_id,
    lakebase_project,
)
database_resource_name, database_name = lakebase_database(
    CONFIG.lakebase_project_id,
    endpoint_name,
)
configure_lakebase_endpoint(
    endpoint_name,
    CONFIG.lakebase_min_cu,
    CONFIG.lakebase_max_cu,
    CONFIG.lakebase_scale_to_zero_seconds,
)
admin_password = lakebase_credential(endpoint_name)
native_password = lakebase_native_password(
    ATLAS_SECRET_SCOPE,
    "lakebase-atlas-admin-password",
)
stable_generated_secret(
    ATLAS_SECRET_SCOPE,
    "certifica-jwt-secret",
    token_bytes=48,
)
stable_generated_secret(
    ATLAS_SECRET_SCOPE,
    "certifica-seed-admin-password",
    token_bytes=24,
)

admin_url = pg_url(
    workspace_user,
    admin_password,
    direct_host,
    database_name,
)
configure_lakebase_role(
    admin_url,
    database_name,
    "atlas-admin",
    native_password,
)

print(
    "Applying pre-generated Lakebase schema SQL for empty schemas."
)
apply_lakebase_schema_bootstrap(
    admin_url,
    work_dir,
    "atlas-admin",
)

print("Using prebuilt standalone bundle chunks from the downloaded artifact.")

bundle_vars = {
    "app_name": CONFIG.app_name,
    "company_name": CONFIG.company_name,
    "company_industry": CONFIG.company_industry,
    **lakebase_bundle_vars(
        CONFIG.lakebase_project_id,
        endpoint_name,
        database_resource_name,
        database_name,
        direct_host,
        pooler_host,
    ),
    "warehouse_id": warehouse_id,
    "forge_demo_mode_enabled": "true",
    "uc_catalog": CONFIG.uc_catalog,
    "uc_schema": CONFIG.uc_schema,
    "uc_table": CONFIG.uc_table,
    # MOMA module reads UC_CATALOG/UC_SCHEMA at runtime; this var only satisfies
    # app.yaml's ${var.moma_uc_catalog} template. Reuses the TAP catalog (MOMA
    # writes its dm_* tables into the same uc_schema, where the app SP already
    # holds CREATE TABLE/MODIFY). Missing from upstream bundle_vars → render fail.
    "moma_uc_catalog": CONFIG.uc_catalog,
    "certifica_pg_schema": CONFIG.certifica_pg_schema,
    "certifica_llm_endpoint": CONFIG.certifica_llm_endpoint,
    "certifica_sso_enabled": str(CONFIG.certifica_sso_enabled).lower(),
    "certifica_default_tenant_slug": CONFIG.certifica_default_tenant_slug,
    "certifica_default_tenant_name": CONFIG.certifica_default_tenant_name,
    "certifica_default_tenant_color": CONFIG.certifica_default_tenant_color,
    "certifica_superadmin_emails": CERTIFICA_SUPERADMIN_EMAILS,
    "certifica_seed_on_startup": str(CONFIG.certifica_seed_on_startup).lower(),
}
prepare_runtime_files(work_dir, bundle_vars)

meta = ensure_app(
    CONFIG,
    warehouse_id,
    endpoint_name,
    database_resource_name,
    ALLOWED_USER_API_SCOPES,
)
sp_id = meta.get("service_principal_client_id")
if not sp_id:
    fail(f"Could not resolve app service principal from app metadata: {json.dumps(meta, indent=2)}")
set_app_deployer_acl(CONFIG.app_name, workspace_user)
grant_tap_privileges(warehouse_id, CONFIG, sp_id)
grant_system_privileges(warehouse_id, sp_id)
LEGACY_AGENT_MIGRATION = retire_legacy_waf_genie_agent(
    CONFIG.app_name,
    sp_id,
    workspace_user,
)

APP_RELEASE_PATH, APP_RELEASE_FINGERPRINT = publish_runtime_source(
    work_dir,
    workspace_user,
    CONFIG.app_name,
)
grant_app_source_read(APP_RELEASE_PATH, sp_id)
DEPLOYMENT_ID: str | None = None
if CONFIG.run_app:
    ensure_app_compute_active(CONFIG.app_name)
    deployment = ensure_app_deployment(
        CONFIG.app_name,
        APP_RELEASE_PATH,
        APP_RELEASE_FINGERPRINT,
    )
    DEPLOYMENT_ID = deployment.get("deployment_id")
    if not DEPLOYMENT_ID:
        fail(f"Resolved App deployment has no deployment_id: {deployment}")
    APP_META = ensure_app_running(CONFIG.app_name, DEPLOYMENT_ID)
else:
    print("`run_app=false`: source published and App configured; deployment skipped.")
    APP_META = app_metadata(CONFIG.app_name)

CONSENT = inspect_deployer_consent(APP_META)
DESTROY_CONFIG = build_destroy_config(
    cfg=CONFIG,
    workspace_user=workspace_user,
    warehouse_id=warehouse_id,
    app_service_principal=sp_id,
    oauth2_app_client_id=APP_META.get("oauth2_app_client_id"),
    effective_user_api_scopes=normalized_scopes(
        APP_META.get("effective_user_api_scopes")
    ),
    consent_status=CONSENT["status"],
    legacy_agent_migration=LEGACY_AGENT_MIGRATION,
    lakebase_endpoint_name=endpoint_name,
    release_path=APP_RELEASE_PATH,
    release_fingerprint=APP_RELEASE_FINGERPRINT,
    deployment_id=DEPLOYMENT_ID,
    lakebase_project_created=bool(
        lakebase_project.get("_atlas_created_by_deploy", False)
    ),
)
DESTROY_CONFIG_PATH = persist_destroy_config(DESTROY_CONFIG)
APP_URL = app_url_from_metadata(APP_META)
SUMMARY = {
    "deployment_mode": "serverless_notebook_api",
    "app_name": CONFIG.app_name,
    "app_url": APP_URL,
    "app_release_path": APP_RELEASE_PATH,
    "app_release_fingerprint": APP_RELEASE_FINGERPRINT,
    "app_deployment_id": DEPLOYMENT_ID,
    "warehouse_id": warehouse_id,
    "lakebase_project_id": CONFIG.lakebase_project_id,
    "lakebase_endpoint": endpoint_name,
    "lakebase_database_resource": database_resource_name,
    "lakebase_database_name": database_name,
    "lakebase_direct_host": direct_host,
    "lakebase_pooler_host": pooler_host,
    "lakebase_autoscaling_min_cu": CONFIG.lakebase_min_cu,
    "lakebase_autoscaling_max_cu": CONFIG.lakebase_max_cu,
    "lakebase_scale_to_zero_seconds": CONFIG.lakebase_scale_to_zero_seconds,
    "certifica_pg_schema": CONFIG.certifica_pg_schema,
    "certifica_llm_endpoint": CONFIG.certifica_llm_endpoint,
    "certifica_sso_enabled": CONFIG.certifica_sso_enabled,
    "certifica_default_tenant_slug": CONFIG.certifica_default_tenant_slug,
    "certifica_default_tenant_name": CONFIG.certifica_default_tenant_name,
    "certifica_default_tenant_color": CONFIG.certifica_default_tenant_color,
    "certifica_superadmin_emails": CERTIFICA_SUPERADMIN_EMAILS,
    "certifica_seed_on_startup": CONFIG.certifica_seed_on_startup,
    "app_service_principal": sp_id,
    "waf_databricks_auth_mode": WAF_DATABRICKS_AUTH_MODE,
    "waf_requested_user_api_scopes": WAF_USER_API_SCOPES,
    "effective_user_api_scopes": normalized_scopes(
        APP_META.get("effective_user_api_scopes")
    ),
    "oauth2_app_client_id": APP_META.get("oauth2_app_client_id"),
    "deployer_consent_status": CONSENT["status"],
    "non_waf_app_sp_grants": "preserved",
    "legacy_agent_migration": LEGACY_AGENT_MIGRATION,
    "destroy_config_path": DESTROY_CONFIG_PATH,
    "work_dir": str(work_dir),
}
print("Destroy config:")
print(json.dumps(DESTROY_CONFIG, indent=2))
print(json.dumps(SUMMARY, indent=2))

# COMMAND ----------

# DBTITLE 1,Audit WAF OBO and reconcile service-principal grants
# ── Standalone authorization reconciliation cell ────────────────────────────
# Run this cell to re-check the WAF OBO allowlist and preserve App-SP grants
# used by every non-WAF Atlas module.
# Requires Cell 2 to have been executed first.

_meta = app_metadata(widget("app_name"))
_sp_id = _meta.get("service_principal_client_id")
if not _sp_id:
    fail(f"Could not resolve app SP from metadata: {_meta}")

_warehouse_id = choose_warehouse(widget("warehouse_id"))
_allowed_scopes = preflight_user_authorization_scopes()
_audit_project = postgres_api(
    "GET",
    f"projects/{urllib.parse.quote(CONFIG.lakebase_project_id, safe='')}",
)
_audit_endpoint_name, _, _ = lakebase_endpoint(
    CONFIG.lakebase_project_id,
    _audit_project,
)
_audit_database_resource_name, _ = lakebase_database(
    CONFIG.lakebase_project_id,
    _audit_endpoint_name,
)
_meta = ensure_app(
    CONFIG,
    _warehouse_id,
    _audit_endpoint_name,
    _audit_database_resource_name,
    _allowed_scopes,
)
grant_tap_privileges(_warehouse_id, CONFIG, _sp_id)
grant_system_privileges(_warehouse_id, _sp_id)
_consent = inspect_deployer_consent(_meta)

print(
    json.dumps(
        {
            "scope": "waf",
            "auth_mode": WAF_DATABRICKS_AUTH_MODE,
            "requested_scopes": WAF_USER_API_SCOPES,
            "effective_scopes": normalized_scopes(
                _meta.get("effective_user_api_scopes")
            ),
            "managed_resources": [
                item.get("name") for item in (_meta.get("resources") or [])
            ],
            "non_waf_app_sp_grants": "preserved",
            "consent": _consent,
        },
        indent=2,
    )
)

# COMMAND ----------

smoke_results: list[dict[str, Any]] = []
if CONFIG.smoke_test and CONFIG.run_app:
    if not APP_URL:
        fail(
            "Deployment finished but the app URL was not present in app metadata. "
            "Open the Databricks Apps UI or inspect the Apps API response."
        )
    smoke_results = smoke_test(APP_URL)
    failed = [
        row
        for row in smoke_results
        if row["status"] != row["expected_status"]
        or (
            row["expected_content_type"]
            and row["expected_content_type"] not in row["content_type"].lower()
        )
    ]
    if failed:
        fail(f"Smoke test failed: {json.dumps(smoke_results, indent=2)}")
elif CONFIG.smoke_test:
    print("Smoke test skipped because `run_app=false`.")

print(
    json.dumps(
        {
            **SUMMARY,
            "smoke_test": smoke_results or "skipped",
            "status": "complete",
        },
        indent=2,
    )
)
