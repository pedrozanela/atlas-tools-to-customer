# Databricks notebook source
# DBTITLE 1,Destroy configuration
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

try:
    dbutils  # type: ignore[name-defined]
except NameError:  # Allows local syntax checks outside Databricks.
    dbutils = None  # type: ignore[assignment]


DEFAULTS = {
    "app_name_hint": "atlas",
    "destroy_config_path": "",
    "dry_run": "true",
    "confirm_destroy": "",
    "purge_lakebase": "false",
    "delete_config_after_success": "true",
}

WIDGET_LABELS = {
    "app_name_hint": "App name used for automatic config lookup",
    "destroy_config_path": "Deploy destroy-config path (blank = automatic)",
    "dry_run": "Plan only; do not delete",
    "confirm_destroy": "Type DESTROY <app-name> for a real destroy",
    "purge_lakebase": "Permanently purge Lakebase (false = 7-day recovery)",
    "delete_config_after_success": "Delete destroy config after full success",
}

DROPDOWN_WIDGETS = {
    "dry_run": ["true", "false"],
    "purge_lakebase": ["false", "true"],
    "delete_config_after_success": ["true", "false"],
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
    return dbutils.widgets.get(name).strip()  # type: ignore[union-attr]


def as_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "y"}


DRY_RUN = as_bool(widget("dry_run"))
PURGE_LAKEBASE = as_bool(widget("purge_lakebase"))
DELETE_CONFIG_AFTER_SUCCESS = as_bool(widget("delete_config_after_success"))

ATLAS_SECRET_SCOPE = "atlas-app"
LEGACY_SECRET_KEY = "lakebase-atlas-admin-password"
ATLAS_MANAGED_SECRET_KEYS = {
    LEGACY_SECRET_KEY,
    "certifica-jwt-secret",
    "certifica-seed-admin-password",
}

# COMMAND ----------

# DBTITLE 1,Serverless API helpers and config validation
class DbxApiError(RuntimeError):
    def __init__(self, status: int, body: str, path: str):
        self.status = status
        self.body = body
        self.path = path
        super().__init__(f"Databricks API {path} failed ({status}): {body[:1000]}")


def fail(message: str) -> None:
    raise RuntimeError(message)


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
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        f"{DATABRICKS_HOST}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {DATABRICKS_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", errors="replace")
        raise DbxApiError(err.code, raw, path) from err


def postgres_api(method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    return dbx_api(method, f"/api/2.0/postgres/{path.lstrip('/')}", body)


def current_workspace_user() -> str:
    try:
        me = dbx_api("GET", "/api/2.0/preview/scim/v2/Me")
        return me.get("userName") or me.get("displayName") or NOTEBOOK_USER
    except Exception:
        return NOTEBOOK_USER


def workspace_api_path(path: str) -> str:
    normalized = path.strip()
    if normalized.startswith("/Workspace/"):
        normalized = normalized[len("/Workspace") :]
    if not normalized.startswith("/Users/"):
        fail(f"Destroy config must be a Workspace Users path, got: {path!r}")
    return normalized


def workspace_export_raw(path: str) -> bytes:
    query = urllib.parse.urlencode(
        {
            "path": workspace_api_path(path),
            "format": "RAW",
            "direct_download": "true",
        }
    )
    api_path = f"/api/2.0/workspace/export?{query}"
    request = urllib.request.Request(
        f"{DATABRICKS_HOST}{api_path}",
        method="GET",
        headers={"Authorization": f"Bearer {DATABRICKS_TOKEN}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", errors="replace")
        raise DbxApiError(err.code, raw, api_path) from err


def default_destroy_config_path(user: str, app_name: str) -> str:
    if (
        not user
        or "/" in user
        or "\\" in user
        or not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,29}", app_name)
    ):
        fail("Cannot derive the automatic destroy-config path.")
    return f"/Users/{user}/.atlas/configs/{app_name}.destroy.json"


def load_destroy_config() -> tuple[str, dict[str, Any]]:
    configured_path = widget("destroy_config_path")
    path = workspace_api_path(
        configured_path
        or default_destroy_config_path(current_workspace_user(), widget("app_name_hint"))
    )
    try:
        config = json.loads(workspace_export_raw(path).decode("utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"Destroy config is not valid JSON: {path}: {exc}")
    if not isinstance(config, dict):
        fail(f"Destroy config must be a JSON object: {path}")
    return path, config


def require_dict(config: dict[str, Any], key: str) -> dict[str, Any]:
    value = config.get(key)
    if not isinstance(value, dict):
        fail(f"Destroy config field `{key}` must be an object.")
    return value


def require_string(config: dict[str, Any], key: str) -> str:
    value = config.get(key)
    if not isinstance(value, str) or not value:
        fail(f"Destroy config field `{key}` must be a non-empty string.")
    return value


def managed_secret_entries(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Return only the exact Atlas-owned secret targets accepted by this notebook."""
    schema_version = config.get("schema_version")
    if schema_version in {1, 2}:
        entries: Any = [require_dict(config, "secret")]
        expected_keys = {LEGACY_SECRET_KEY}
    else:
        entries = config.get("secrets")
        expected_keys = ATLAS_MANAGED_SECRET_KEYS
        if not isinstance(entries, list) or not entries:
            fail("Destroy config field `secrets` must be a non-empty array.")

    if not all(isinstance(entry, dict) for entry in entries):
        fail("Destroy config secret entries must be objects.")

    keys: list[str] = []
    for entry in entries:
        scope = require_string(entry, "scope")
        key = require_string(entry, "key")
        if scope != ATLAS_SECRET_SCOPE or key not in expected_keys:
            fail("Destroy config targets an unexpected secret.")
        if schema_version == 3 and entry.get("delete_scope_if_empty") is not True:
            fail("Destroy config secret cleanup policy is not Atlas-managed.")
        keys.append(key)

    if len(keys) != len(set(keys)) or set(keys) != expected_keys:
        fail("Destroy config secret allowlist is incomplete or contains duplicates.")
    return entries


def validate_destroy_config(path: str, config: dict[str, Any]) -> None:
    schema_version = config.get("schema_version")
    if schema_version not in {1, 2, 3} or config.get("kind") != "atlas_destroy_config":
        fail("Unsupported destroy config; expected Atlas schema_version=1, 2, or 3.")
    if require_string(config, "workspace_host").rstrip("/") != DATABRICKS_HOST.rstrip("/"):
        fail(
            "Destroy config belongs to a different workspace. "
            f"Config={config.get('workspace_host')}, current={DATABRICKS_HOST}"
        )

    app = require_dict(config, "app")
    app_name = require_string(app, "name")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,29}", app_name):
        fail(f"Unsafe App name in destroy config: {app_name!r}")
    if app.get("expected_description") != (
        "Atlas — Customer mapping suite for Databricks Field Engineering"
    ):
        fail("Destroy config does not carry the expected Atlas App ownership marker.")
    owner = require_string(config, "workspace_user")
    if owner in {".", ".."} or "/" in owner or "\\" in owner:
        fail("Unsafe Workspace user identity in destroy config.")

    if schema_version in {2, 3}:
        authorization = require_dict(config, "authorization")
        if (
            authorization.get("scope") != "waf"
            or authorization.get("mode") != "obo"
            or authorization.get("deployer_user_name") != owner
        ):
            fail("Destroy config carries an unexpected WAF authorization contract.")
        if authorization.get("requested_user_api_scopes") != [
            "sql",
            "genie",
            "files",
        ]:
            fail("Destroy config carries unexpected WAF user API scopes.")
        if authorization.get("non_waf_app_sp_grants") != "preserved":
            fail("Destroy config does not preserve non-WAF App-SP authorization.")

    lakebase = require_dict(config, "lakebase")
    project_id = require_string(lakebase, "project_id")
    if (
        not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", project_id)
        or lakebase.get("project_name") != f"projects/{project_id}"
    ):
        fail("Unsafe Lakebase project identity in destroy config.")
    if "delete_project" in lakebase and not isinstance(lakebase["delete_project"], bool):
        fail("Destroy config Lakebase ownership marker must be boolean.")

    managed_secret_entries(config)

    genie = config.get("genie")
    if genie is not None:
        if not isinstance(genie, dict):
            fail("Destroy config field `genie` must be an object.")
        if genie.get("title") != "Forge WAF Genie":
            fail("Destroy config targets an unexpected Genie Agent.")
        legacy_genie_description = (
            f'Atlas-managed WAF Genie Agent owned by Databricks App "{app_name}". '
            "Analyzes failing controls with curated WAF guidance and system-table evidence."
        )
        if schema_version == 1:
            if genie.get("expected_description") != legacy_genie_description:
                fail("Destroy config carries an unexpected Genie ownership marker.")
        else:
            expected_genie_description = (
                f'Atlas-managed WAF Genie Agent for Databricks App "{app_name}", '
                "operated with user authorization. "
                "Analyzes failing controls with curated WAF guidance and system-table evidence."
            )
            if (
                genie.get("expected_description") != expected_genie_description
                or genie.get("legacy_expected_descriptions")
                != [
                    legacy_genie_description,
                    (
                        "Ask questions about your Databricks workspace in WAF terms — "
                        "failing controls, jobs without service principals, table "
                        "comment coverage, CPU/memory utilisation. Backed by system.* "
                        "tables."
                    ),
                ]
                or genie.get("owner_user_name") != owner
                or genie.get("auth_mode") != "obo"
            ):
                fail("Destroy config carries an unexpected WAF OBO Genie marker.")
        if genie.get("max_matches") != 1:
            fail("Destroy config must limit Genie deletion to one exact match.")
        allowed_paths = genie.get("allowed_parent_paths")
        if allowed_paths != ["/Shared/Forge Genie Spaces/", "/Shared/"]:
            fail("Destroy config carries unexpected Genie parent paths.")

    workspace_source = require_dict(config, "workspace_source")
    expected_release_root = f"/Users/{owner}/.atlas/releases/{app_name}"
    if workspace_source.get("release_root") != expected_release_root:
        fail("Destroy config targets an unexpected Workspace release path.")

    config_path = workspace_api_path(require_string(config, "destroy_config_path"))
    if config_path != path:
        fail(
            "Loaded config path does not match its embedded destroy_config_path: "
            f"{path} != {config_path}"
        )

    unity_catalog = require_dict(config, "unity_catalog")
    for key in ("catalog", "schema", "table"):
        value = require_string(unity_catalog, key)
        if len(value) > 255 or "\x00" in value:
            fail(f"Unsafe Unity Catalog identifier `{key}`.")
    require_string(config, "warehouse_id")


CONFIG_PATH, DESTROY_CONFIG = load_destroy_config()
validate_destroy_config(CONFIG_PATH, DESTROY_CONFIG)


def destroy_plan(config: dict[str, Any]) -> dict[str, Any]:
    app = require_dict(config, "app")
    lakebase = require_dict(config, "lakebase")
    secrets_to_delete = managed_secret_entries(config)
    uc = require_dict(config, "unity_catalog")
    source = require_dict(config, "workspace_source")
    genie = config.get("genie")
    authorization = config.get("authorization")
    plan = {
        "mode": "dry_run" if DRY_RUN else "destroy",
        "workspace_host": DATABRICKS_HOST,
        "app": app["name"],
        "unity_catalog_table": f"{uc['catalog']}.{uc['schema']}.{uc['table']}",
        "unity_catalog_cleanup": (
            "drop target table; drop Atlas schema/catalog only when empty (RESTRICT)"
        ),
        "secrets": [
            f"{secret['scope']}/{secret['key']}" for secret in secrets_to_delete
        ],
        "genie_agent": genie.get("title") if isinstance(genie, dict) else "legacy_config",
        "waf_authorization": (
            {
                "mode": authorization.get("mode"),
                "user_api_scopes": authorization.get("requested_user_api_scopes"),
            }
            if isinstance(authorization, dict)
            else "legacy_app_sp"
        ),
        "workspace_release_root": source["release_root"],
        "lakebase_project": lakebase["project_name"],
        "lakebase_delete_mode": (
            ("purge" if PURGE_LAKEBASE else "soft_delete_7_day_recovery")
            if lakebase.get("delete_project") is True
            else "retained_shared_project"
        ),
        "destroy_config_path": CONFIG_PATH,
        "delete_config_after_success": DELETE_CONFIG_AFTER_SUCCESS,
        "required_confirmation": f"DESTROY {app['name']}",
    }
    if len(secrets_to_delete) == 1:
        # Keep the schema v1/v2 plan contract available to existing automation.
        plan["secret"] = (
            f"{secrets_to_delete[0]['scope']}/{secrets_to_delete[0]['key']}"
        )
    return plan


PLAN = destroy_plan(DESTROY_CONFIG)
print(json.dumps(PLAN, indent=2))

# COMMAND ----------

# DBTITLE 1,Destructive actions (guarded and idempotent)
def is_missing(err: DbxApiError) -> bool:
    body = err.body.lower()
    return err.status == 404 or "resource_does_not_exist" in body or "not found" in body


def poll_postgres_operation(name: str, timeout_s: int = 1200) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        operation = postgres_api("GET", name)
        if operation.get("done"):
            if operation.get("error"):
                fail(f"Lakebase delete failed: {json.dumps(operation['error'])}")
            return
        time.sleep(5)
    fail(f"Timed out waiting for Lakebase operation: {name}")


def wait_statement(statement_id: str, timeout_s: int = 300) -> dict[str, Any]:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        result = dbx_api("GET", f"/api/2.0/sql/statements/{statement_id}")
        state = result.get("status", {}).get("state")
        if state in {"SUCCEEDED", "FAILED", "CANCELED", "CLOSED"}:
            return result
        time.sleep(2)
    fail(f"SQL statement timed out: {statement_id}")


def run_sql(warehouse_id: str, statement: str) -> dict[str, Any]:
    submitted = dbx_api(
        "POST",
        "/api/2.0/sql/statements",
        {
            "warehouse_id": warehouse_id,
            "statement": statement,
            "wait_timeout": "30s",
        },
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


def delete_app(config: dict[str, Any], result: dict[str, Any]) -> None:
    app = require_dict(config, "app")
    app_name = require_string(app, "name")
    encoded_name = urllib.parse.quote(app_name, safe="")
    try:
        metadata = dbx_api("GET", f"/api/2.0/apps/{encoded_name}")
    except DbxApiError as err:
        if is_missing(err):
            result["app"] = "already_absent"
            return
        raise
    if metadata.get("description") != app["expected_description"]:
        fail(
            f"Refusing to delete App `{app_name}` because its description no longer "
            "matches the Atlas ownership marker."
        )
    dbx_api("DELETE", f"/api/2.0/apps/{encoded_name}")
    deadline = time.time() + 1200
    while time.time() < deadline:
        try:
            metadata = dbx_api("GET", f"/api/2.0/apps/{encoded_name}")
        except DbxApiError as err:
            if is_missing(err):
                result["app"] = "deleted"
                return
            raise
        state = metadata.get("compute_status", {}).get("state")
        print(f"Waiting for App deletion: {state or 'UNKNOWN'}")
        time.sleep(5)
    fail(f"Timed out deleting Databricks App: {app_name}")


def stop_app(config: dict[str, Any], result: dict[str, Any]) -> None:
    app = require_dict(config, "app")
    app_name = require_string(app, "name")
    encoded_name = urllib.parse.quote(app_name, safe="")
    try:
        metadata = dbx_api("GET", f"/api/2.0/apps/{encoded_name}")
    except DbxApiError as err:
        if is_missing(err):
            result["app_compute"] = "already_absent"
            return
        raise
    if metadata.get("description") != app["expected_description"]:
        fail(
            f"Refusing to stop App `{app_name}` because its description no longer "
            "matches the Atlas ownership marker."
        )

    if metadata.get("compute_status", {}).get("state") == "STOPPED":
        result["app_compute"] = "already_stopped"
        return

    try:
        dbx_api("POST", f"/api/2.0/apps/{encoded_name}/stop", {})
    except DbxApiError as err:
        body = err.body.lower()
        transient_conflict = err.status == 409 and any(
            marker in body for marker in ("already", "in progress", "stopping", "stopped")
        )
        if not transient_conflict:
            raise

    deadline = time.time() + 1200
    while time.time() < deadline:
        try:
            metadata = dbx_api("GET", f"/api/2.0/apps/{encoded_name}")
        except DbxApiError as err:
            if is_missing(err):
                result["app_compute"] = "app_deleted_while_stopping"
                return
            raise
        state = metadata.get("compute_status", {}).get("state")
        if state == "STOPPED":
            result["app_compute"] = "stopped"
            return
        if state == "ERROR":
            fail(f"Databricks App compute failed while stopping: {app_name}")
        print(f"Waiting for App compute to stop: {state or 'UNKNOWN'}")
        time.sleep(5)
    fail(f"Timed out stopping Databricks App compute: {app_name}")


def is_safe_genie_id(space_id: Any) -> bool:
    return isinstance(space_id, str) and bool(
        re.fullmatch(
            r"(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-"
            r"[0-9a-f]{4}-[0-9a-f]{12})",
            space_id,
        )
    )


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


def delete_genie_agents(config: dict[str, Any], result: dict[str, Any]) -> None:
    genie = config.get("genie")
    if not isinstance(genie, dict) or genie.get("delete_matching_spaces") is not True:
        result["genie_agents"] = "retained_by_config"
        return

    title = require_string(genie, "title")
    expected_description = require_string(genie, "expected_description")
    legacy_descriptions = genie.get("legacy_expected_descriptions") or []
    if not isinstance(legacy_descriptions, list) or not all(
        isinstance(description, str) and description
        for description in legacy_descriptions
    ):
        fail("Destroy config Genie legacy markers must be a string array.")
    accepted_descriptions = {expected_description, *legacy_descriptions}
    owner_user_name = genie.get("owner_user_name")
    app_sp = require_dict(config, "app").get("service_principal_client_id")
    if genie.get("max_matches") != 1:
        fail("Destroy config Genie max_matches must be exactly 1.")
    allowed_paths = genie.get("allowed_parent_paths")
    if not isinstance(allowed_paths, list) or not all(
        isinstance(path, str) for path in allowed_paths
    ):
        fail("Destroy config Genie allowed_parent_paths must be a string array.")

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
            space
            for space in page.get("spaces", [])
            if isinstance(space, dict) and space.get("title") == title
        )
        page_token = page.get("next_page_token")
        if not page_token:
            break

    normalized_allowed_paths = {path.rstrip("/") + "/" for path in allowed_paths}
    owned: list[str] = []
    already_absent = 0
    ignored_non_owned = 0
    for candidate in candidates:
        space_id = candidate.get("space_id")
        if not is_safe_genie_id(space_id):
            fail(f"Unsafe Genie Agent ID returned for Atlas title: {space_id!r}")
        encoded_id = urllib.parse.quote(space_id, safe="")
        try:
            live = dbx_api("GET", f"/api/2.0/genie/spaces/{encoded_id}")
        except DbxApiError as err:
            if is_missing(err):
                already_absent += 1
                continue
            raise
        if live.get("title") != title:
            ignored_non_owned += 1
            continue
        parent_path = live.get("parent_path") or candidate.get("parent_path")
        normalized_parent_path = (
            parent_path.rstrip("/") + "/" if isinstance(parent_path, str) else None
        )
        live_description = live.get("description")
        if live_description not in accepted_descriptions:
            ignored_non_owned += 1
            continue
        if normalized_parent_path not in normalized_allowed_paths:
            fail(
                f"Atlas-owned Genie Agent `{space_id}` moved to unexpected "
                f"parent path: {parent_path!r}"
            )
        permissions = dbx_api(
            "GET",
            f"/api/2.0/permissions/genie/{encoded_id}",
        )
        is_current_obo_agent = (
            live_description == expected_description
            and genie.get("auth_mode") == "obo"
            and isinstance(owner_user_name, str)
        )
        if is_current_obo_agent:
            if not has_direct_manage_permission(
                permissions,
                "user_name",
                owner_user_name,
            ):
                fail(
                    f"Refusing to delete WAF OBO Genie Agent `{space_id}` because "
                    "its ACL no longer proves deployer ownership."
                )
        else:
            resolved_app_sp = app_sp
            if not isinstance(resolved_app_sp, str) or not resolved_app_sp:
                app = require_dict(config, "app")
                app_name = require_string(app, "name")
                try:
                    app_meta = dbx_api(
                        "GET",
                        f"/api/2.0/apps/{urllib.parse.quote(app_name, safe='')}",
                    )
                except DbxApiError as err:
                    if not is_missing(err):
                        raise
                    app_meta = {}
                if app_meta.get("description") == app.get("expected_description"):
                    resolved_app_sp = app_meta.get("service_principal_client_id")
            legacy_sp_owned = (
                isinstance(resolved_app_sp, str)
                and has_direct_manage_permission(
                    permissions, "service_principal_name", resolved_app_sp
                )
            )
            legacy_user_owned = (
                isinstance(owner_user_name, str)
                and has_direct_manage_permission(
                    permissions, "user_name", owner_user_name
                )
            )
            if not legacy_sp_owned and not legacy_user_owned:
                fail(
                    f"Refusing to delete legacy WAF Genie Agent `{space_id}` because "
                    "its ACL proves neither App-SP nor deployer ownership."
                )
        owned.append(space_id)

    if len(owned) > 1:
        fail(
            f"Refusing to delete {len(owned)} Atlas-owned Genie Agents; "
            "the destroy config permits at most one."
        )

    deleted = 0
    for space_id in owned:
        encoded_id = urllib.parse.quote(space_id, safe="")
        try:
            dbx_api("DELETE", f"/api/2.0/genie/spaces/{encoded_id}")
            deleted += 1
        except DbxApiError as err:
            if is_missing(err):
                already_absent += 1
            else:
                raise

    if not candidates:
        result["genie_agents"] = "already_absent"
    else:
        result["genie_agents"] = {
            "deleted": deleted,
            "already_absent": already_absent,
            "ignored_non_owned": ignored_non_owned,
        }


def delete_unity_catalog(config: dict[str, Any], result: dict[str, Any]) -> None:
    uc = require_dict(config, "unity_catalog")
    warehouse_id = require_string(config, "warehouse_id")
    catalog = sql_ident(require_string(uc, "catalog"))
    schema_name = sql_ident(require_string(uc, "schema"))
    table = sql_ident(require_string(uc, "table"))
    if uc.get("drop_table") is True:
        run_sql(
            warehouse_id,
            f"DROP TABLE IF EXISTS {catalog}.{schema_name}.{table}",
        )
        result["unity_catalog_table"] = "deleted_or_absent"
    else:
        result["unity_catalog_table"] = "retained_by_config"

    preserved: list[str] = []
    if uc.get("drop_schema_if_empty") is True:
        try:
            run_sql(
                warehouse_id,
                f"DROP SCHEMA IF EXISTS {catalog}.{schema_name} RESTRICT",
            )
            result["unity_catalog_schema"] = "deleted_or_absent"
        except Exception as exc:
            preserved.append(f"schema retained because it is non-empty or shared: {exc}")

    if uc.get("drop_catalog_if_empty") is True:
        # CREATE CATALOG creates `default`; remove it only when empty.
        try:
            run_sql(
                warehouse_id,
                f"DROP SCHEMA IF EXISTS {catalog}.`default` RESTRICT",
            )
        except Exception as exc:
            preserved.append(f"default schema retained because it is non-empty: {exc}")
        try:
            run_sql(warehouse_id, f"DROP CATALOG IF EXISTS {catalog} RESTRICT")
            result["unity_catalog_catalog"] = "deleted_or_absent"
        except Exception as exc:
            preserved.append(f"catalog retained because it is non-empty or shared: {exc}")
    if preserved:
        result["preserved_shared_unity_catalog_resources"] = preserved


def delete_secrets(config: dict[str, Any], result: dict[str, Any]) -> None:
    entries = managed_secret_entries(config)
    statuses: dict[str, str] = {}
    for secret in entries:
        scope = require_string(secret, "scope")
        key = require_string(secret, "key")
        try:
            dbx_api("POST", "/api/2.0/secrets/delete", {"scope": scope, "key": key})
            statuses[key] = "deleted"
        except DbxApiError as err:
            if is_missing(err):
                statuses[key] = "already_absent"
            else:
                raise

    result["secrets"] = statuses
    if len(entries) == 1:
        # Preserve the result field consumed by schema v1/v2 automation.
        result["secret"] = statuses[require_string(entries[0], "key")]

    if not any(secret.get("delete_scope_if_empty") is True for secret in entries):
        result["secret_scope"] = "retained_by_config"
        return

    scope = ATLAS_SECRET_SCOPE
    try:
        encoded_scope = urllib.parse.quote(scope, safe="")
        remaining = dbx_api("GET", f"/api/2.0/secrets/list?scope={encoded_scope}").get(
            "secrets", []
        )
    except DbxApiError as err:
        if is_missing(err):
            result["secret_scope"] = "already_absent"
            return
        raise
    if remaining:
        result["secret_scope"] = f"retained_with_{len(remaining)}_other_keys"
        return
    dbx_api("POST", "/api/2.0/secrets/scopes/delete", {"scope": scope})
    result["secret_scope"] = "deleted"


def delete_secret(config: dict[str, Any], result: dict[str, Any]) -> None:
    """Backward-compatible singular entrypoint used by older callers/tests."""
    delete_secrets(config, result)


def delete_workspace_releases(config: dict[str, Any], result: dict[str, Any]) -> None:
    source = require_dict(config, "workspace_source")
    release_root = workspace_api_path(require_string(source, "release_root"))
    try:
        dbx_api(
            "POST",
            "/api/2.0/workspace/delete",
            {"path": release_root, "recursive": True},
        )
        result["workspace_releases"] = "deleted"
    except DbxApiError as err:
        if is_missing(err):
            result["workspace_releases"] = "already_absent"
        else:
            raise


def delete_lakebase(config: dict[str, Any], result: dict[str, Any]) -> None:
    lakebase = require_dict(config, "lakebase")
    if lakebase.get("delete_project") is not True:
        result["lakebase_project"] = "retained_shared_project"
        return
    project_id = require_string(lakebase, "project_id")
    encoded_id = urllib.parse.quote(project_id, safe="")
    try:
        postgres_api("GET", f"projects/{encoded_id}")
    except DbxApiError as err:
        if is_missing(err):
            result["lakebase_project"] = "already_absent"
            return
        raise
    suffix = "?purge=true" if PURGE_LAKEBASE else ""
    operation = postgres_api("DELETE", f"projects/{encoded_id}{suffix}")
    if operation.get("name") and operation.get("done") is not True:
        poll_postgres_operation(operation["name"])
    result["lakebase_project"] = "purged" if PURGE_LAKEBASE else "soft_deleted"


def delete_destroy_config(path: str, result: dict[str, Any]) -> None:
    try:
        dbx_api(
            "POST",
            "/api/2.0/workspace/delete",
            {"path": workspace_api_path(path), "recursive": False},
        )
        result["destroy_config"] = "deleted"
    except DbxApiError as err:
        if is_missing(err):
            result["destroy_config"] = "already_absent"
        else:
            raise


DESTROY_RESULT: dict[str, Any] = {
    "app_name": DESTROY_CONFIG["app"]["name"],
    "workspace_host": DATABRICKS_HOST,
}

if DRY_RUN:
    DESTROY_RESULT["status"] = "dry_run_complete_no_changes"
else:
    expected_confirmation = f"DESTROY {DESTROY_CONFIG['app']['name']}"
    if widget("confirm_destroy") != expected_confirmation:
        fail(
            "Confirmation mismatch. For a real destroy, set `dry_run=false` and type "
            f"`{expected_confirmation}` exactly in `confirm_destroy`."
        )

    stop_app(DESTROY_CONFIG, DESTROY_RESULT)
    delete_genie_agents(DESTROY_CONFIG, DESTROY_RESULT)
    delete_app(DESTROY_CONFIG, DESTROY_RESULT)
    delete_unity_catalog(DESTROY_CONFIG, DESTROY_RESULT)
    delete_secrets(DESTROY_CONFIG, DESTROY_RESULT)
    delete_workspace_releases(DESTROY_CONFIG, DESTROY_RESULT)
    delete_lakebase(DESTROY_CONFIG, DESTROY_RESULT)
    if DELETE_CONFIG_AFTER_SUCCESS:
        delete_destroy_config(CONFIG_PATH, DESTROY_RESULT)
    else:
        DESTROY_RESULT["destroy_config"] = "retained_for_audit"
    DESTROY_RESULT["status"] = "destroy_complete"

print(json.dumps(DESTROY_RESULT, indent=2))
