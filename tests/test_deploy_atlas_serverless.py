from __future__ import annotations

import tempfile
import sys
import tarfile
import types
import unittest
import warnings
import zipfile
import re
from pathlib import Path
from unittest import mock


REPO_ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK_PATH = REPO_ROOT / "notebooks" / "deploy_atlas.py"
SUPERVISOR_PATH = REPO_ROOT / "scripts" / "start-databricks-app.mjs"
APP_YAML_PATH = REPO_ROOT / "app.yaml"


def load_notebook_definitions() -> dict:
    source = NOTEBOOK_PATH.read_text(encoding="utf-8")
    source = source.split("# DBTITLE 1,Cell 3", 1)[0]
    source = source.replace(
        "DATABRICKS_HOST, DATABRICKS_TOKEN, NOTEBOOK_USER = notebook_context()",
        (
            'DATABRICKS_HOST = "https://workspace.example.com"\n'
            'DATABRICKS_TOKEN = "test-token"\n'
            'NOTEBOOK_USER = "owner@example.com"'
        ),
    )
    module = types.ModuleType("deploy_atlas_test")
    sys.modules[module.__name__] = module
    exec(compile(source, str(NOTEBOOK_PATH), "exec"), module.__dict__)
    return module.__dict__


NS = load_notebook_definitions()
TEST_LAKEBASE_ENDPOINT = (
    "projects/databricks-atlas/branches/demo-preview/endpoints/writer"
)
TEST_LAKEBASE_DATABASE = (
    "projects/databricks-atlas/branches/demo-preview/databases/atlas-data"
)


class ServerlessDeployTests(unittest.TestCase):
    def test_people_launcher_uses_databricks_apps_python_runtime(self) -> None:
        source = SUPERVISOR_PATH.read_text(encoding="utf-8")

        self.assertIn('path.resolve("..", ".venv", "bin", "uvicorn")', source)
        self.assertIn('process.env.VIRTUAL_ENV', source)
        self.assertNotIn('["-m", "uvicorn"', source)
        self.assertIn('child.on("error"', source)

    def test_supervisor_probes_each_next_zone_at_its_base_path(self) -> None:
        source = SUPERVISOR_PATH.read_text(encoding="utf-8")

        self.assertIn('waitForHttp("forge", FORGE_PORT, "/forge")', source)
        self.assertIn('waitForHttp("waf", WAF_PORT, "/waf")', source)
        self.assertIn('waitForHttp("tap", TAP_PORT, "/tap")', source)
        self.assertIn('waitForHttp("mas", MAS_PORT, "/maturity")', source)

    def make_runtime_tree(self, root: Path) -> None:
        (root / "scripts").mkdir(parents=True)
        (root / "app.yaml").write_text("command: [node]\n", encoding="utf-8")
        (root / "package.json").write_text("{}\n", encoding="utf-8")
        (root / "requirements.txt").write_text(
            "-r apps/people/backend/requirements.txt\n",
            encoding="utf-8",
        )
        backend_requirements = root / "apps/people/backend/requirements.txt"
        backend_requirements.parent.mkdir(parents=True)
        backend_requirements.write_text("fastapi==0.115.0\n", encoding="utf-8")
        (root / "scripts" / "start-databricks-app.mjs").write_text(
            "// supervisor\n",
            encoding="utf-8",
        )
        for app_name in NS["ATLAS_APPS"]:
            app_dir = root / "apps" / app_name
            app_dir.mkdir(parents=True)
            (app_dir / "standalone.tar.gz.part-aa").write_bytes(
                f"chunk-{app_name}".encode()
            )
        people_files = {
            "apps/people/backend/app/main.py": "# app\n",
            "apps/people/backend/seed/seed_data.json": "{}\n",
            "apps/people/backend/static/index.html": "<main>People</main>\n",
        }
        for relative_path, content in people_files.items():
            path = root / relative_path
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        excluded_files = {
            "apps/people/backend/app/__pycache__/main.pyc": b"local bytecode",
            "apps/people/backend/app/docs/internal.md": b"development docs",
            "apps/people/backend/app/raw/source.ts": b"raw source",
            "apps/people/backend/static/assets/app.js.map": b"source map",
        }
        for relative_path, content in excluded_files.items():
            excluded = root / relative_path
            excluded.parent.mkdir(parents=True, exist_ok=True)
            excluded.write_bytes(content)

    def test_runtime_allowlist_contains_only_required_app_source(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self.make_runtime_tree(root)
            (root / "databricks.yml").write_text("not uploaded", encoding="utf-8")
            files = {
                path.as_posix()
                for path in NS["runtime_source_files"](root)
            }

        self.assertEqual(
            {
                "app.yaml",
                "package.json",
                "requirements.txt",
                "apps/people/backend/requirements.txt",
                "scripts/start-databricks-app.mjs",
                "apps/people/backend/app/main.py",
                "apps/people/backend/seed/seed_data.json",
                "apps/people/backend/static/index.html",
                *{
                    f"apps/{app_name}/standalone.tar.gz.part-aa"
                    for app_name in NS["ATLAS_APPS"]
                },
            },
            files,
        )

    def test_workspace_release_is_immutable_and_rerun_safe(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self.make_runtime_tree(root)
            uploaded: dict[str, bytes] = {}
            existing: set[str] = set()
            api_calls: list[tuple[str, str, dict | None]] = []

            def status(path: str):
                return {"path": path, "object_type": "FILE"} if path in existing else None

            def upload(path: str, content: bytes, timeout_s: int = 600):
                del timeout_s
                uploaded[path] = content
                if path.endswith("/.atlas-release.json"):
                    existing.add(path)

            def api(method: str, path: str, body=None):
                api_calls.append((method, path, body))
                return {}

            with mock.patch.dict(
                NS,
                {
                    "workspace_status": status,
                    "workspace_import_raw": upload,
                    "dbx_api": api,
                },
            ):
                source_path, fingerprint = NS["publish_runtime_source"](
                    root,
                    "owner@example.com",
                    "atlas",
                )
                first_upload_count = len(uploaded)
                uploaded.clear()
                repeated_path, repeated_fingerprint = NS["publish_runtime_source"](
                    root,
                    "owner@example.com",
                    "atlas",
                )

        self.assertTrue(source_path.startswith("/Workspace/Users/owner@example.com/"))
        self.assertEqual(source_path, repeated_path)
        self.assertEqual(fingerprint, repeated_fingerprint)
        self.assertGreater(first_upload_count, 1)
        self.assertEqual({}, uploaded)
        self.assertTrue(
            any(path == "/api/2.0/workspace/mkdirs" for _, path, _ in api_calls)
        )

    def test_people_runtime_is_fingerprinted_and_keeps_the_file_limit(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self.make_runtime_tree(root)
            first_fingerprint, first_manifest, _ = NS["runtime_source_manifest"](root)

            people_main = root / "apps/people/backend/app/main.py"
            people_main.write_text("# changed app\n", encoding="utf-8")
            second_fingerprint, second_manifest, _ = NS["runtime_source_manifest"](root)

            oversized = root / "apps/people/backend/static/oversized.bin"
            with oversized.open("wb") as handle:
                handle.truncate(NS["MAX_APP_SOURCE_FILE_BYTES"] + 1)
            with self.assertRaisesRegex(RuntimeError, "10 MiB limit"):
                NS["runtime_source_manifest"](root)

        self.assertNotEqual(first_fingerprint, second_fingerprint)
        self.assertNotEqual(first_manifest, second_manifest)
        self.assertTrue(
            any(
                entry["path"] == "apps/people/backend/app/main.py"
                for entry in second_manifest
            )
        )

    def test_workspace_import_uses_raw_multipart_content(self) -> None:
        captured = {}

        class Response:
            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

        def urlopen(request, timeout):
            captured["request"] = request
            captured["timeout"] = timeout
            return Response()

        payload = b"\x00raw-atlas-chunk\xff"
        with mock.patch.object(NS["urllib"].request, "urlopen", urlopen):
            NS["workspace_import_raw"](
                "/Users/owner@example.com/.atlas/release/part-aa",
                payload,
            )

        request = captured["request"]
        self.assertEqual("POST", request.get_method())
        self.assertEqual(
            "https://workspace.example.com/api/2.0/workspace/import",
            request.full_url,
        )
        self.assertIn("multipart/form-data", request.get_header("Content-type"))
        self.assertIn(payload, request.data)
        self.assertIn(b'name="format"\r\n\r\nRAW', request.data)
        self.assertIn(b'name="overwrite"\r\n\r\ntrue', request.data)
        self.assertIn(
            b"/Users/owner@example.com/.atlas/release/part-aa",
            request.data,
        )

    def test_smoke_test_checks_forge_api_route_as_json(self) -> None:
        requested_urls: list[str] = []

        class Response:
            def __init__(self, status: int, content_type: str):
                self.status = status
                self.headers = {"Content-Type": content_type}

            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

        def urlopen(request, timeout):
            del timeout
            requested_urls.append(request.full_url)
            if request.full_url.endswith("/people/api/health"):
                return Response(200, "application/json; charset=utf-8")
            if request.full_url.endswith("/forge/api/metadata?type=unsupported"):
                raise NS["urllib"].error.HTTPError(
                    request.full_url,
                    400,
                    "Bad Request",
                    {"Content-Type": "application/json; charset=utf-8"},
                    None,
                )
            return Response(200, "text/html; charset=utf-8")

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", ResourceWarning)
            with mock.patch.object(NS["urllib"].request, "urlopen", urlopen):
                results = NS["smoke_test"]("https://atlas.example.com")

        self.assertEqual(8, len(results))
        self.assertEqual(
            {
                "path": "/forge/api/metadata?type=unsupported",
                "status": 400,
                "expected_status": 400,
                "content_type": "application/json; charset=utf-8",
                "expected_content_type": "application/json",
            },
            results[-1],
        )
        self.assertIn(
            "https://atlas.example.com/forge/api/metadata?type=unsupported",
            requested_urls,
        )
        self.assertIn("https://atlas.example.com/people", requested_urls)
        self.assertIn("https://atlas.example.com/people/api/health", requested_urls)

    def test_zip_extraction_rejects_sibling_prefix_escape(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            destination = root / "atlas"
            destination.mkdir()
            archive = root / "artifact.zip"
            with zipfile.ZipFile(archive, "w") as zf:
                zf.writestr("../atlas-escape/payload", "unsafe")

            with self.assertRaisesRegex(RuntimeError, "Unsafe path"):
                NS["safe_extract_zip"](archive, destination)

            self.assertFalse((root / "atlas-escape" / "payload").exists())

    def test_tar_extraction_rejects_links(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            destination = root / "atlas"
            destination.mkdir()
            archive = root / "artifact.tar"
            with tarfile.open(archive, "w") as tf:
                member = tarfile.TarInfo("link")
                member.type = tarfile.SYMTYPE
                member.linkname = "../../outside"
                tf.addfile(member)

            with self.assertRaisesRegex(RuntimeError, "Link is not allowed"):
                NS["safe_extract_tar"](archive, destination)

    def test_lakebase_schema_management_excludes_public(self) -> None:
        self.assertEqual(
            {"forge", "waf", "mas", "certifica"},
            set(NS["LAKEBASE_SCHEMAS"]),
        )
        self.assertNotIn("public", NS["LAKEBASE_SCHEMAS"])

    def test_lakebase_endpoint_discovers_custom_branch_and_writer(self) -> None:
        calls: list[str] = []

        def api(method: str, path: str, body=None):
            del body
            self.assertEqual("GET", method)
            calls.append(path)
            if path == "projects/databricks-atlas/branches":
                return {
                    "branches": [
                        {
                            "name": "projects/databricks-atlas/branches/demo-preview",
                            "status": {"current_state": "READY"},
                        }
                    ]
                }
            if path == "projects/databricks-atlas/branches/demo-preview/endpoints":
                return {
                    "endpoints": [
                        {
                            "name": TEST_LAKEBASE_ENDPOINT,
                            "spec": {"endpoint_type": "ENDPOINT_TYPE_READ_WRITE"},
                        }
                    ]
                }
            if path == TEST_LAKEBASE_ENDPOINT:
                return {
                    "name": TEST_LAKEBASE_ENDPOINT,
                    "status": {
                        "current_state": "ACTIVE",
                        "hosts": {
                            "host": "ep-demo.database.example.com",
                            "read_write_pooled_host": (
                                "ep-demo-pooler.database.example.com"
                            ),
                        },
                    },
                }
            raise AssertionError(f"unexpected Lakebase API path: {path}")

        with mock.patch.dict(NS, {"postgres_api": api}):
            endpoint = NS["lakebase_endpoint"]("databricks-atlas", {})

        self.assertEqual(
            (
                TEST_LAKEBASE_ENDPOINT,
                "ep-demo.database.example.com",
                "ep-demo-pooler.database.example.com",
            ),
            endpoint,
        )
        self.assertFalse(any("production" in path or "primary" in path for path in calls))

    def test_lakebase_database_discovers_custom_resource_and_sql_name(self) -> None:
        calls: list[str] = []

        def api(method: str, path: str, body=None):
            del body
            self.assertEqual("GET", method)
            calls.append(path)
            if path.endswith("/databases"):
                return {"databases": [{"name": TEST_LAKEBASE_DATABASE}]}
            if path == TEST_LAKEBASE_DATABASE:
                return {
                    "name": TEST_LAKEBASE_DATABASE,
                    "status": {"postgres_database": "atlas_demo"},
                }
            raise AssertionError(f"unexpected Lakebase API path: {path}")

        with mock.patch.dict(NS, {"postgres_api": api}):
            database = NS["lakebase_database"](
                "databricks-atlas",
                TEST_LAKEBASE_ENDPOINT,
            )

        self.assertEqual((TEST_LAKEBASE_DATABASE, "atlas_demo"), database)
        self.assertFalse(any("databricks-postgres" in path for path in calls))

    def test_lakebase_bundle_vars_and_app_template_keep_hosts_distinct(self) -> None:
        lakebase_vars = NS["lakebase_bundle_vars"](
            "databricks-atlas",
            TEST_LAKEBASE_ENDPOINT,
            TEST_LAKEBASE_DATABASE,
            "atlas_demo",
            "ep-demo.database.example.com",
            "ep-demo-pooler.database.example.com",
        )
        self.assertEqual(
            {
                "lakebase_project_id": "databricks-atlas",
                "lakebase_branch_id": "demo-preview",
                "lakebase_endpoint_id": "writer",
                "lakebase_database_id": "atlas-data",
                "lakebase_database_name": "atlas_demo",
                "lakebase_direct_host": "ep-demo.database.example.com",
                "lakebase_pooler_host": "ep-demo-pooler.database.example.com",
            },
            lakebase_vars,
        )

        template = APP_YAML_PATH.read_text(encoding="utf-8")
        placeholders = set(re.findall(r"\$\{var\.([a-zA-Z0-9_]+)\}", template))
        render_vars = {name: f"test-{name}" for name in placeholders}
        render_vars.update(lakebase_vars)
        rendered = NS["render_template"](template, render_vars)

        self.assertIn(
            'value: "projects/databricks-atlas/branches/demo-preview/endpoints/writer"',
            rendered,
        )
        self.assertIn(
            '- name: CERTIFICA_PGHOST\n    value: "ep-demo.database.example.com"',
            rendered,
        )
        self.assertIn(
            '- name: LAKEBASE_POOLER_HOST\n'
            '    value: "ep-demo-pooler.database.example.com"',
            rendered,
        )
        self.assertIn(
            '- name: LAKEBASE_DATABASE\n    value: "atlas_demo"',
            rendered,
        )
        self.assertIn(
            '- name: CERTIFICA_PGDATABASE\n    value: "atlas_demo"',
            rendered,
        )

    def test_postgres_resources_follow_discovered_branch_and_database(self) -> None:
        resources = NS["desired_app_resources"](
            NS["CONFIG"],
            "warehouse-id",
            TEST_LAKEBASE_ENDPOINT,
            TEST_LAKEBASE_DATABASE,
        )
        postgres = next(
            resource["postgres"]
            for resource in resources
            if resource["name"] == "database"
        )
        self.assertEqual(
            "projects/databricks-atlas/branches/demo-preview",
            postgres["branch"],
        )
        self.assertEqual(TEST_LAKEBASE_DATABASE, postgres["database"])

    def test_postgres_resources_fail_closed_for_invalid_endpoint_names(self) -> None:
        invalid_bindings = {
            "malformed-endpoint": (
                "projects/databricks-atlas/branches/demo-preview",
                TEST_LAKEBASE_DATABASE,
            ),
            "different-project": (
                "projects/shared-project/branches/demo-preview/endpoints/writer",
                TEST_LAKEBASE_DATABASE,
            ),
            "different-branch": (
                TEST_LAKEBASE_ENDPOINT,
                "projects/databricks-atlas/branches/other/databases/atlas-data",
            ),
        }
        for case, (endpoint_name, database_name) in invalid_bindings.items():
            with self.subTest(case=case):
                with self.assertRaisesRegex(RuntimeError, r"do(?:es)? not match"):
                    NS["desired_app_resources"](
                        NS["CONFIG"],
                        "warehouse-id",
                        endpoint_name,
                        database_name,
                    )

    def test_existing_external_app_resource_is_preserved(self) -> None:
        desired = NS["desired_app_resources"](
            NS["CONFIG"],
            "warehouse-id",
            TEST_LAKEBASE_ENDPOINT,
            TEST_LAKEBASE_DATABASE,
        )
        external = {
            "name": "external-volume",
            "uc_securable": {
                "securable_full_name": "catalog.schema.volume",
                "securable_type": "VOLUME",
                "permission": "READ_VOLUME",
            },
        }
        current = [
            external,
            {
                "name": "atlas-warehouse",
                "sql_warehouse": {"id": "old", "permission": "CAN_USE"},
            },
        ]
        merged = NS["merge_app_resources"](current, desired)

        self.assertIn(external, merged)
        self.assertEqual(
            "warehouse-id",
            next(
                item["sql_warehouse"]["id"]
                for item in merged
                if item["name"] == "atlas-warehouse"
            ),
        )

    def test_only_retired_model_serving_binding_is_removed(self) -> None:
        desired = NS["desired_app_resources"](
            NS["CONFIG"],
            "warehouse-id",
            TEST_LAKEBASE_ENDPOINT,
            TEST_LAKEBASE_DATABASE,
        )
        retired_binding = {
            "name": next(iter(NS["ATLAS_RETIRED_RESOURCE_NAMES"])),
            "serving_endpoint": {
                "name": "retired-endpoint",
                "permission": "CAN_QUERY",
            },
        }
        external_binding = {
            "name": "external-model-resource",
            "serving_endpoint": {
                "name": "external-endpoint",
                "permission": "CAN_QUERY",
            },
        }

        merged = NS["merge_app_resources"](
            [retired_binding, external_binding],
            desired,
        )

        self.assertNotIn(retired_binding, merged)
        self.assertIn(external_binding, merged)

    def test_system_grants_preserve_information_schema_for_non_waf_apps(self) -> None:
        statements: list[str] = []
        with mock.patch.dict(
            NS,
            {"run_sql": lambda _warehouse_id, statement: statements.append(statement)},
        ):
            NS["grant_system_privileges"]("warehouse-id", "app-client-id")

        self.assertTrue(
            any(
                "GRANT SELECT ON SCHEMA `system`.`information_schema`"
                in statement
                for statement in statements
            )
        )
        self.assertEqual(13, len(statements))

    def test_system_grants_remain_best_effort_when_a_schema_is_unavailable(
        self,
    ) -> None:
        statements: list[str] = []

        def run_sql(_warehouse_id: str, statement: str) -> None:
            statements.append(statement)
            if "`system`.`information_schema`" in statement:
                raise RuntimeError("permission denied")

        with mock.patch.dict(NS, {"run_sql": run_sql}):
            NS["grant_system_privileges"]("warehouse-id", "app-client-id")

        self.assertTrue(
            any("`system`.`information_schema`" in statement for statement in statements)
        )

    def test_waf_obo_preflight_does_not_abort_when_the_policy_setting_is_absent(
        self,
    ) -> None:
        # Regression: the preflight used to read
        # /api/2.1/settings/allowed_apps_user_api_scopes and treat any
        # DbxApiError as fatal. Workspaces that never materialised that setting
        # answer 404, so the deploy aborted on the first cell — before any
        # resource was provisioned — telling the operator to change a setting
        # the workspace does not expose.
        #
        # This pins the outcome (deploy proceeds), not the mechanism: an
        # implementation that consults the API but tolerates a 404 also passes.
        def api(method: str, path: str, body=None):
            raise NS["DbxApiError"](404, "Setting does not exist", path)

        with mock.patch.dict(NS, {"dbx_api": api}):
            allowed = NS["preflight_user_authorization_scopes"]()

        self.assertEqual({"sql", "genie", "files"}, set(allowed))

    def test_waf_obo_preflight_reports_the_scopes_the_app_will_request(self) -> None:
        # ensure_app reconciles user_api_scopes against WAF_USER_API_SCOPES, so
        # whatever the preflight reports has to match what the app asks for.
        # Asserting against the same constant would be circular, so this pins
        # the literal scope set WAF needs: `sql` for the pillar queries,
        # `genie` for the recommendation space, `files` for evidence upload.
        #
        # dbx_api is stubbed to a permissive policy so this stays a unit test
        # regardless of whether the implementation consults the settings API.
        def api(method: str, path: str, body=None):
            return {
                "effective_allowed_apps_user_api_scopes": {"allowed_scopes": ["all-apis"]}
            }

        with mock.patch.dict(NS, {"dbx_api": api}):
            allowed = NS["preflight_user_authorization_scopes"]()

        self.assertEqual({"sql", "genie", "files"}, set(allowed))
        self.assertEqual({"sql", "genie", "files"}, set(NS["WAF_USER_API_SCOPES"]))

    def test_new_app_uses_waf_scopes_and_preserves_all_existing_resources(self) -> None:
        desired_resources = NS["desired_app_resources"](
            NS["CONFIG"],
            "warehouse-id",
            TEST_LAKEBASE_ENDPOINT,
            TEST_LAKEBASE_DATABASE,
        )
        configured = {
            "name": "atlas",
            "description": NS["APP_DESCRIPTION"],
            "service_principal_client_id": "app-client-id",
            "resources": desired_resources,
            "user_api_scopes": ["files", "genie", "sql"],
            "effective_user_api_scopes": ["files", "genie", "sql"],
        }
        calls: list[tuple[str, str, dict | None]] = []

        def api(method: str, path: str, body=None):
            calls.append((method, path, body))
            if method == "GET":
                raise NS["DbxApiError"](404, "not found", path)
            return {}

        with mock.patch.dict(
            NS,
            {
                "dbx_api": api,
                "wait_app_service_principal": lambda _name: configured,
            },
        ):
            result = NS["ensure_app"](
                NS["CONFIG"],
                "warehouse-id",
                TEST_LAKEBASE_ENDPOINT,
                TEST_LAKEBASE_DATABASE,
                ["files", "genie", "sql"],
            )

        self.assertEqual(configured, result)
        create = next(call for call in calls if call[1] == "/api/2.0/apps?no_compute=true")
        self.assertEqual(["sql", "genie", "files"], create[2]["user_api_scopes"])
        self.assertEqual(
            {
                "lakebase-atlas-admin-password",
                "certifica-jwt-secret",
                "certifica-seed-admin-password",
                "atlas-warehouse",
                "certifica-llm-endpoint",
                "database",
            },
            {resource["name"] for resource in create[2]["resources"]},
        )
        postgres = next(
            resource["postgres"]
            for resource in create[2]["resources"]
            if resource["name"] == "database"
        )
        self.assertEqual("CAN_CONNECT_AND_CREATE", postgres["permission"])
        endpoint = next(
            resource["serving_endpoint"]
            for resource in create[2]["resources"]
            if resource["name"] == "certifica-llm-endpoint"
        )
        self.assertEqual("CAN_QUERY", endpoint["permission"])

    def test_existing_app_uses_official_patch_after_scope_restart(self) -> None:
        desired_resources = NS["desired_app_resources"](
            NS["CONFIG"],
            "warehouse-id",
            TEST_LAKEBASE_ENDPOINT,
            TEST_LAKEBASE_DATABASE,
        )
        current = {
            "name": "atlas",
            "description": NS["APP_DESCRIPTION"],
            "service_principal_client_id": "app-client-id",
            "compute_status": {"state": "STOPPED"},
            "resources": desired_resources,
            "user_api_scopes": [],
            "effective_user_api_scopes": [],
        }
        configured = {
            **current,
            "user_api_scopes": ["files", "genie", "sql"],
            "effective_user_api_scopes": ["files", "genie", "sql"],
        }
        api = mock.Mock(return_value=current)
        restart = mock.Mock(return_value=True)
        stop = mock.Mock(return_value=configured)
        with mock.patch.dict(
            NS,
            {
                "dbx_api": api,
                "restart_app_before_scope_update": restart,
                "wait_app_configuration": mock.Mock(return_value=configured),
                "stop_app_compute": stop,
                "app_metadata": mock.Mock(return_value=configured),
            },
        ):
            result = NS["ensure_app"](
                NS["CONFIG"],
                "warehouse-id",
                TEST_LAKEBASE_ENDPOINT,
                TEST_LAKEBASE_DATABASE,
                ["files", "genie", "sql"],
            )

        self.assertEqual(configured, result)
        restart.assert_called_once_with("atlas", current)
        stop.assert_called_once_with("atlas")
        patch_call = next(
            call
            for call in api.call_args_list
            if call.args[:2] == ("PATCH", "/api/2.0/apps/atlas")
        )
        self.assertEqual(NS["APP_DESCRIPTION"], patch_call.args[2]["description"])
        self.assertEqual(["sql", "genie", "files"], patch_call.args[2]["user_api_scopes"])
        self.assertEqual(
            {resource["name"] for resource in desired_resources},
            {resource["name"] for resource in patch_call.args[2]["resources"]},
        )

    def test_legacy_sp_owned_waf_agent_is_retired_with_acl_proof(self) -> None:
        space_id = "a" * 32
        api = mock.Mock(
            side_effect=[
                {
                    "spaces": [
                        {
                            "space_id": space_id,
                            "title": "Forge WAF Genie",
                            "parent_path": "/Shared/Forge Genie Spaces/",
                        }
                    ]
                },
                {
                    "space_id": space_id,
                    "description": NS["legacy_waf_genie_description"]("atlas"),
                    "parent_path": "/Shared/Forge Genie Spaces/",
                },
                {
                    "access_control_list": [
                        {
                            "service_principal_name": "app-client-id",
                            "all_permissions": [
                                {
                                    "permission_level": "CAN_MANAGE",
                                    "inherited": False,
                                }
                            ],
                        }
                    ]
                },
                {},
            ]
        )
        with mock.patch.dict(NS, {"dbx_api": api}):
            result = NS["retire_legacy_waf_genie_agent"](
                "atlas",
                "app-client-id",
                "owner@example.com",
            )

        self.assertEqual(1, result["deleted"])
        self.assertEqual(
            mock.call("DELETE", f"/api/2.0/genie/spaces/{space_id}"),
            api.call_args_list[-1],
        )

    def test_destroy_config_contains_ids_but_no_secret_value(self) -> None:
        config = NS["build_destroy_config"](
            cfg=NS["CONFIG"],
            workspace_user="owner@example.com",
            warehouse_id="warehouse-id",
            app_service_principal="app-client-id",
            lakebase_endpoint_name="projects/p/branches/b/endpoints/e",
            release_path="/Workspace/Users/owner@example.com/.atlas/releases/atlas/hash",
            release_fingerprint="f" * 64,
            deployment_id="deployment-id",
        )
        serialized = NS["json"].dumps(config)

        self.assertEqual("atlas_destroy_config", config["kind"])
        self.assertEqual(3, config["schema_version"])
        self.assertEqual(
            "/Users/owner@example.com/.atlas/configs/atlas.destroy.json",
            config["destroy_config_path"],
        )
        self.assertEqual("projects/databricks-atlas", config["lakebase"]["project_name"])
        self.assertFalse(config["lakebase"]["delete_project"])
        self.assertEqual(
            {
                "lakebase-atlas-admin-password",
                "certifica-jwt-secret",
                "certifica-seed-admin-password",
            },
            {secret["key"] for secret in config["secrets"]},
        )
        self.assertTrue(
            all(secret["scope"] == "atlas-app" for secret in config["secrets"])
        )
        self.assertEqual("Forge WAF Genie", config["genie"]["title"])
        self.assertTrue(config["genie"]["delete_matching_spaces"])
        self.assertEqual(
            NS["waf_genie_description"]("atlas"),
            config["genie"]["expected_description"],
        )
        self.assertEqual(
            (
                'Atlas-managed WAF Genie Agent for Databricks App "atlas", '
                "operated with user authorization. Analyzes failing controls "
                "with curated WAF guidance and system-table evidence."
            ),
            config["genie"]["expected_description"],
        )
        self.assertEqual(1, config["genie"]["max_matches"])
        self.assertEqual("owner@example.com", config["genie"]["owner_user_name"])
        self.assertEqual(
            [
                NS["legacy_waf_genie_description"]("atlas"),
                NS["LEGACY_WAF_GENIE_DESCRIPTION"],
            ],
            config["genie"]["legacy_expected_descriptions"],
        )
        self.assertEqual("waf", config["authorization"]["scope"])
        self.assertEqual("obo", config["authorization"]["mode"])
        self.assertEqual(
            ["sql", "genie", "files"],
            config["authorization"]["requested_user_api_scopes"],
        )
        self.assertEqual(
            {
                "lakebase-atlas-admin-password",
                "certifica-jwt-secret",
                "certifica-seed-admin-password",
                "atlas-warehouse",
                "certifica-llm-endpoint",
                "database",
            },
            set(config["app"]["managed_resource_names"]),
        )
        self.assertNotIn("string_value", serialized.lower())
        self.assertNotIn("test-token", serialized)

    def test_app_source_read_is_granted_on_exact_release_directory(self) -> None:
        api = mock.Mock(return_value={})
        source = "/Workspace/Users/owner@example.com/.atlas/releases/atlas/hash"
        with mock.patch.dict(
            NS,
            {
                "workspace_status": lambda path: {
                    "path": path,
                    "object_id": 12345,
                    "object_type": "DIRECTORY",
                },
                "dbx_api": api,
            },
        ):
            NS["grant_app_source_read"](source, "app-client-id")

        api.assert_called_once_with(
            "PATCH",
            "/api/2.0/permissions/directories/12345",
            {
                "access_control_list": [
                    {
                        "service_principal_name": "app-client-id",
                        "permission_level": "CAN_READ",
                    }
                ]
            },
        )

    def test_app_access_is_restricted_to_the_deployer(self) -> None:
        api = mock.Mock(return_value={})
        with mock.patch.dict(NS, {"dbx_api": api}):
            NS["set_app_deployer_acl"]("atlas", "owner@example.com")

        api.assert_called_once_with(
            "PUT",
            "/api/2.0/permissions/apps/atlas",
            {
                "access_control_list": [
                    {
                        "user_name": "owner@example.com",
                        "permission_level": "CAN_MANAGE",
                    }
                ]
            },
        )

    def test_cold_start_unavailable_states_wait_until_running(self) -> None:
        states = iter(
            [
                {
                    "compute_status": {"state": "STOPPED"},
                    "app_status": {"state": "UNAVAILABLE"},
                    "active_deployment": {"deployment_id": "deployment-id"},
                },
                {
                    "compute_status": {"state": "STARTING"},
                    "app_status": {"state": "UNAVAILABLE"},
                    "active_deployment": {"deployment_id": "deployment-id"},
                },
                {
                    "compute_status": {"state": "ACTIVE"},
                    "app_status": {"state": "RUNNING"},
                    "active_deployment": {"deployment_id": "deployment-id"},
                },
            ]
        )
        api_calls: list[tuple[str, str, dict | None]] = []

        def api(method: str, path: str, body=None):
            api_calls.append((method, path, body))
            if method == "GET":
                return next(states)
            return {}

        with mock.patch.dict(NS, {"dbx_api": api}), mock.patch.object(
            NS["time"], "sleep", return_value=None
        ):
            result = NS["ensure_app_running"]("atlas", "deployment-id", timeout_s=30)

        self.assertEqual("RUNNING", result["app_status"]["state"])
        self.assertEqual(
            1,
            sum(
                method == "POST" and path == "/api/2.0/apps/atlas/start"
                for method, path, _ in api_calls
                ),
        )

    def test_app_compute_is_started_before_first_deployment(self) -> None:
        states = iter(
            [
                {"compute_status": {"state": "STOPPED"}},
                {"compute_status": {"state": "STARTING"}},
                {"compute_status": {"state": "ACTIVE"}},
            ]
        )
        api_calls: list[tuple[str, str, dict | None]] = []

        def api(method: str, path: str, body=None):
            api_calls.append((method, path, body))
            if method == "GET":
                return next(states)
            return {}

        with mock.patch.dict(NS, {"dbx_api": api}), mock.patch.object(
            NS["time"], "sleep", return_value=None
        ):
            result = NS["ensure_app_compute_active"]("atlas", timeout_s=30)

        self.assertEqual("ACTIVE", result["compute_status"]["state"])
        self.assertEqual(
            [
                ("POST", "/api/2.0/apps/atlas/start", {}),
            ],
            [call for call in api_calls if call[0] == "POST"],
        )

    def test_active_app_compute_is_not_started_again(self) -> None:
        api = mock.Mock(return_value={"compute_status": {"state": "ACTIVE"}})
        with mock.patch.dict(NS, {"dbx_api": api}):
            result = NS["ensure_app_compute_active"]("atlas", timeout_s=30)

        self.assertEqual("ACTIVE", result["compute_status"]["state"])
        api.assert_called_once_with("GET", "/api/2.0/apps/atlas")

    def test_non_transient_app_start_conflict_is_not_hidden(self) -> None:
        def api(method: str, _path: str, _body=None):
            if method == "GET":
                return {"compute_status": {"state": "STOPPED"}}
            raise NS["DbxApiError"](
                409,
                '{"error_code":"RESOURCE_CONFLICT","message":"policy violation"}',
                "/api/2.0/apps/atlas/start",
            )

        with mock.patch.dict(NS, {"dbx_api": api}):
            with self.assertRaises(NS["DbxApiError"]):
                NS["ensure_app_compute_active"]("atlas", timeout_s=30)

    def test_soft_deleted_lakebase_project_is_not_reused(self) -> None:
        api = mock.Mock(
            return_value={
                "name": "projects/databricks-atlas",
                "delete_time": "2026-07-26T12:35:01Z",
                "purge_time": "2026-08-02T12:35:01Z",
            }
        )
        with mock.patch.dict(NS, {"postgres_api": api}):
            with self.assertRaisesRegex(RuntimeError, "soft-deleted"):
                NS["ensure_lakebase_project"](
                    "databricks-atlas",
                    0.5,
                    1.0,
                    300,
                )
        api.assert_called_once_with("GET", "projects/databricks-atlas")

    def test_existing_lakebase_project_is_marked_as_shared(self) -> None:
        api = mock.Mock(return_value={"name": "projects/databricks-atlas"})
        with mock.patch.dict(NS, {"postgres_api": api}):
            project = NS["ensure_lakebase_project"](
                "databricks-atlas", 0.5, 1.0, 300,
            )
        self.assertFalse(project["_atlas_created_by_deploy"])

    def test_existing_unreadable_native_password_is_never_rotated(self) -> None:
        with mock.patch.dict(
            NS,
            {
                "existing_secret": lambda _scope, _key: None,
                "secret_key_exists": lambda _scope, _key: True,
            },
        ):
            with self.assertRaisesRegex(RuntimeError, "will not rotate"):
                NS["lakebase_native_password"]("atlas-app", "secret-key")

    def test_existing_certifica_secret_is_reused_without_a_put(self) -> None:
        with mock.patch.dict(
            NS,
            {
                "existing_secret": lambda _scope, _key: "existing-value",
                "ensure_secret": mock.Mock(
                    side_effect=AssertionError("existing secret must not be written")
                ),
            },
        ):
            value = NS["stable_generated_secret"](
                "atlas-app",
                "certifica-jwt-secret",
            )

        self.assertEqual("existing-value", value)

    def test_certifica_uses_the_shared_lakebase_schema_preparation(self) -> None:
        self.assertIn("certifica", NS["LAKEBASE_SCHEMAS"])

    def test_existing_non_atlas_app_is_never_adopted(self) -> None:
        with mock.patch.dict(
            NS,
            {
                "dbx_api": mock.Mock(
                    return_value={
                        "name": "atlas",
                        "description": "Unrelated application",
                        "service_principal_client_id": "other-client-id",
                    }
                )
            },
        ):
            with self.assertRaisesRegex(RuntimeError, "Refusing to modify"):
                NS["ensure_app"](
                    NS["CONFIG"],
                    "warehouse-id",
                    TEST_LAKEBASE_ENDPOINT,
                    TEST_LAKEBASE_DATABASE,
                    ["sql", "genie", "files"],
                )

    def test_active_release_skips_duplicate_deployment(self) -> None:
        active = {
            "deployment_id": "deployment-1",
            "source_code_path": "/Workspace/Users/owner/release",
            "status": {"state": "SUCCEEDED"},
        }
        with mock.patch.dict(
            NS,
            {
                "app_metadata": lambda _: {"active_deployment": active},
                "dbx_api": mock.Mock(side_effect=AssertionError("unexpected API call")),
            },
        ):
            resolved = NS["ensure_app_deployment"](
                "atlas",
                active["source_code_path"],
                "a" * 64,
            )
        self.assertEqual(active, resolved)

    def test_api_app_url_gets_https_scheme(self) -> None:
        self.assertEqual(
            "https://atlas.example.databricksapps.com",
            NS["app_url_from_metadata"](
                {"url": "atlas.example.databricksapps.com"}
            ),
        )


if __name__ == "__main__":
    unittest.main()
