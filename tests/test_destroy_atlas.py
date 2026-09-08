from __future__ import annotations

import copy
import sys
import types
import unittest
from pathlib import Path
from unittest import mock


REPO_ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK_PATH = REPO_ROOT / "notebooks" / "destroy_atlas.py"
CONFIG_PATH = "/Users/owner@example.com/.atlas/configs/atlas.destroy.json"
VALID_CONFIG = {
    "schema_version": 1,
    "kind": "atlas_destroy_config",
    "workspace_host": "https://workspace.example.com",
    "workspace_user": "owner@example.com",
    "warehouse_id": "warehouse-id",
    "app": {
        "name": "atlas",
        "expected_description": (
            "Atlas — Customer mapping suite for Databricks Field Engineering"
        ),
        "service_principal_client_id": "client-id",
        "deployment_id": "deployment-id",
    },
    "lakebase": {
        "project_id": "databricks-atlas",
        "project_name": "projects/databricks-atlas",
        "endpoint_name": "projects/p/branches/b/endpoints/e",
        "delete_mode": "soft",
    },
    "secret": {
        "scope": "atlas-app",
        "key": "lakebase-atlas-admin-password",
        "delete_scope_if_empty": True,
    },
    "genie": {
        "title": "Forge WAF Genie",
        "expected_description": (
            'Atlas-managed WAF Genie Agent owned by Databricks App "atlas". '
            "Analyzes failing controls with curated WAF guidance and system-table evidence."
        ),
        "allowed_parent_paths": [
            "/Shared/Forge Genie Spaces/",
            "/Shared/",
        ],
        "delete_matching_spaces": True,
        "max_matches": 1,
    },
    "unity_catalog": {
        "catalog": "databricks_atlas",
        "schema": "tap",
        "table": "databricks_tap_tool_submissions",
        "drop_table": True,
        "drop_schema_if_empty": True,
        "drop_catalog_if_empty": True,
    },
    "workspace_source": {
        "release_root": "/Users/owner@example.com/.atlas/releases/atlas",
        "release_path": "/Workspace/Users/owner@example.com/.atlas/releases/atlas/hash",
        "fingerprint": "f" * 64,
    },
    "destroy_config_path": CONFIG_PATH,
}
VALID_CONFIG_V2 = copy.deepcopy(VALID_CONFIG)
VALID_CONFIG_V2["schema_version"] = 2
VALID_CONFIG_V2["app"]["managed_resource_names"] = [
    "lakebase-atlas-admin-password",
    "atlas-warehouse",
]
VALID_CONFIG_V2["authorization"] = {
    "scope": "waf",
    "mode": "obo",
    "requested_user_api_scopes": ["sql", "genie", "files"],
    "effective_user_api_scopes": ["files", "genie", "sql"],
    "oauth2_app_client_id": "oauth-client-id",
    "deployer_user_name": "owner@example.com",
    "consent_status_at_deploy": "not_granted",
    "non_waf_app_sp_grants": "preserved",
}
VALID_CONFIG_V2["genie"] = {
    "title": "Forge WAF Genie",
    "expected_description": (
        'Atlas-managed WAF Genie Agent for Databricks App "atlas", '
        "operated with user authorization. Analyzes failing controls with curated "
        "WAF guidance and system-table evidence."
    ),
    "legacy_expected_descriptions": [
        (
            'Atlas-managed WAF Genie Agent owned by Databricks App "atlas". '
            "Analyzes failing controls with curated WAF guidance and system-table evidence."
        ),
        (
            "Ask questions about your Databricks workspace in WAF terms — failing "
            "controls, jobs without service principals, table comment coverage, "
            "CPU/memory utilisation. Backed by system.* tables."
        ),
    ],
    "owner_user_name": "owner@example.com",
    "auth_mode": "obo",
    "allowed_parent_paths": [
        "/Shared/Forge Genie Spaces/",
        "/Shared/",
    ],
    "delete_matching_spaces": True,
    "max_matches": 1,
    "legacy_agent_migration": {"status": "complete", "deleted": 0},
}
VALID_CONFIG_V3 = copy.deepcopy(VALID_CONFIG_V2)
VALID_CONFIG_V3["schema_version"] = 3
VALID_CONFIG_V3["app"]["managed_resource_names"] = [
    "atlas-warehouse",
    "certifica-jwt-secret",
    "certifica-llm-endpoint",
    "certifica-seed-admin-password",
    "database",
    "lakebase-atlas-admin-password",
]
del VALID_CONFIG_V3["secret"]
VALID_CONFIG_V3["secrets"] = [
    {
        "scope": "atlas-app",
        "key": key,
        "delete_scope_if_empty": True,
    }
    for key in [
        "lakebase-atlas-admin-password",
        "certifica-jwt-secret",
        "certifica-seed-admin-password",
    ]
]


def load_destroy_notebook() -> dict:
    source = NOTEBOOK_PATH.read_text(encoding="utf-8")
    source = source.replace(
        "DATABRICKS_HOST, DATABRICKS_TOKEN, NOTEBOOK_USER = notebook_context()",
        (
            'DATABRICKS_HOST = "https://workspace.example.com"\n'
            'DATABRICKS_TOKEN = "test-token"\n'
            'NOTEBOOK_USER = "owner@example.com"'
        ),
    )
    source = source.replace(
        "CONFIG_PATH, DESTROY_CONFIG = load_destroy_config()",
        f"CONFIG_PATH = {CONFIG_PATH!r}\nDESTROY_CONFIG = {VALID_CONFIG!r}",
    )
    module = types.ModuleType("destroy_atlas_test")
    sys.modules[module.__name__] = module
    exec(compile(source, str(NOTEBOOK_PATH), "exec"), module.__dict__)
    return module.__dict__


NS = load_destroy_notebook()


class DestroyNotebookTests(unittest.TestCase):
    def test_defaults_to_dry_run_without_changes(self) -> None:
        self.assertTrue(NS["DRY_RUN"])
        self.assertEqual(
            "dry_run_complete_no_changes",
            NS["DESTROY_RESULT"]["status"],
        )

    def test_plan_requires_exact_app_confirmation(self) -> None:
        self.assertEqual("DESTROY atlas", NS["PLAN"]["required_confirmation"])
        self.assertEqual(
            "retained_shared_project",
            NS["PLAN"]["lakebase_delete_mode"],
        )

    def test_rejects_config_from_another_workspace(self) -> None:
        config = copy.deepcopy(VALID_CONFIG)
        config["workspace_host"] = "https://other.example.com"
        with self.assertRaisesRegex(RuntimeError, "different workspace"):
            NS["validate_destroy_config"](CONFIG_PATH, config)

    def test_rejects_broader_workspace_release_path(self) -> None:
        config = copy.deepcopy(VALID_CONFIG)
        config["workspace_source"]["release_root"] = "/Users/owner@example.com/.atlas"
        with self.assertRaisesRegex(RuntimeError, "unexpected Workspace release"):
            NS["validate_destroy_config"](CONFIG_PATH, config)

    def test_rejects_unexpected_secret_target(self) -> None:
        config = copy.deepcopy(VALID_CONFIG)
        config["secret"]["key"] = "other-key"
        with self.assertRaisesRegex(RuntimeError, "unexpected secret"):
            NS["validate_destroy_config"](CONFIG_PATH, config)

    def test_rejects_unsafe_lakebase_project_id(self) -> None:
        config = copy.deepcopy(VALID_CONFIG)
        config["lakebase"]["project_id"] = "databricks-atlas?purge=true"
        config["lakebase"]["project_name"] = "projects/databricks-atlas?purge=true"
        with self.assertRaisesRegex(RuntimeError, "Unsafe Lakebase"):
            NS["validate_destroy_config"](CONFIG_PATH, config)

    def test_accepts_waf_obo_manifest_v2(self) -> None:
        NS["validate_destroy_config"](CONFIG_PATH, copy.deepcopy(VALID_CONFIG_V2))

    def test_legacy_manifest_can_retain_the_shared_secret_scope(self) -> None:
        config = copy.deepcopy(VALID_CONFIG)
        config["secret"]["delete_scope_if_empty"] = False
        NS["validate_destroy_config"](CONFIG_PATH, config)

        api = mock.Mock(return_value={})
        result: dict = {}
        with mock.patch.dict(NS, {"dbx_api": api}):
            NS["delete_secret"](config, result)

        self.assertEqual("retained_by_config", result["secret_scope"])
        api.assert_called_once_with(
            "POST",
            "/api/2.0/secrets/delete",
            {"scope": "atlas-app", "key": "lakebase-atlas-admin-password"},
        )

    def test_accepts_people_secret_manifest_v3(self) -> None:
        NS["validate_destroy_config"](CONFIG_PATH, copy.deepcopy(VALID_CONFIG_V3))

    def test_shared_lakebase_is_never_deleted_without_ownership_marker(self) -> None:
        api = mock.Mock(side_effect=AssertionError("shared project must be retained"))
        result: dict = {}
        with mock.patch.dict(NS, {"postgres_api": api}):
            NS["delete_lakebase"](copy.deepcopy(VALID_CONFIG_V3), result)
        self.assertEqual("retained_shared_project", result["lakebase_project"])
        api.assert_not_called()

    def test_rejects_v3_secret_outside_the_exact_atlas_allowlist(self) -> None:
        config = copy.deepcopy(VALID_CONFIG_V3)
        config["secrets"].append(
            {
                "scope": "atlas-app",
                "key": "unrelated-secret",
                "delete_scope_if_empty": True,
            }
        )
        with self.assertRaisesRegex(RuntimeError, "unexpected secret"):
            NS["validate_destroy_config"](CONFIG_PATH, config)

    def test_rejects_v3_manifest_missing_a_people_secret(self) -> None:
        config = copy.deepcopy(VALID_CONFIG_V3)
        config["secrets"] = config["secrets"][:-1]
        with self.assertRaisesRegex(RuntimeError, "allowlist is incomplete"):
            NS["validate_destroy_config"](CONFIG_PATH, config)

    def test_rejects_broader_waf_obo_scopes(self) -> None:
        config = copy.deepcopy(VALID_CONFIG_V2)
        config["authorization"]["requested_user_api_scopes"].append("model-serving")
        with self.assertRaisesRegex(RuntimeError, "unexpected WAF user API scopes"):
            NS["validate_destroy_config"](CONFIG_PATH, config)

    def test_rejects_manifest_that_does_not_preserve_non_waf_sp_grants(self) -> None:
        config = copy.deepcopy(VALID_CONFIG_V2)
        config["authorization"]["non_waf_app_sp_grants"] = "revoked"
        with self.assertRaisesRegex(RuntimeError, "non-WAF App-SP"):
            NS["validate_destroy_config"](CONFIG_PATH, config)

    def test_non_missing_secret_api_error_is_not_hidden(self) -> None:
        error = NS["DbxApiError"](400, '{"error_code":"INVALID_PARAMETER_VALUE"}', "secret")
        with mock.patch.dict(NS, {"dbx_api": mock.Mock(side_effect=error)}):
            with self.assertRaises(NS["DbxApiError"]):
                NS["delete_secret"](copy.deepcopy(VALID_CONFIG), {})

    def test_deletes_all_people_secrets_but_preserves_external_scope_keys(self) -> None:
        api = mock.Mock(
            side_effect=[
                {},
                {},
                {},
                {"secrets": [{"key": "external-secret"}]},
            ]
        )
        result: dict = {}
        with mock.patch.dict(NS, {"dbx_api": api}):
            NS["delete_secrets"](copy.deepcopy(VALID_CONFIG_V3), result)

        self.assertEqual(
            {
                "lakebase-atlas-admin-password": "deleted",
                "certifica-jwt-secret": "deleted",
                "certifica-seed-admin-password": "deleted",
            },
            result["secrets"],
        )
        self.assertEqual("retained_with_1_other_keys", result["secret_scope"])
        deleted_keys = {
            call.args[2]["key"]
            for call in api.call_args_list
            if call.args[:2] == ("POST", "/api/2.0/secrets/delete")
        }
        self.assertEqual(NS["ATLAS_MANAGED_SECRET_KEYS"], deleted_keys)
        self.assertFalse(
            any(
                call.args[:2] == ("POST", "/api/2.0/secrets/scopes/delete")
                for call in api.call_args_list
            )
        )

    def test_deletes_only_exact_atlas_genie_agent(self) -> None:
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
                    "title": "Forge WAF Genie",
                    "description": VALID_CONFIG["genie"]["expected_description"],
                    "parent_path": "/Shared/Forge Genie Spaces",
                },
                {
                    "access_control_list": [
                        {
                            "service_principal_name": "client-id",
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
        result: dict = {}
        with mock.patch.dict(NS, {"dbx_api": api}):
            NS["delete_genie_agents"](copy.deepcopy(VALID_CONFIG), result)
        self.assertEqual(
            {"deleted": 1, "already_absent": 0, "ignored_non_owned": 0},
            result["genie_agents"],
        )
        self.assertEqual(
            mock.call("DELETE", f"/api/2.0/genie/spaces/{space_id}"),
            api.call_args_list[-1],
        )

    def test_v1_refuses_legacy_agent_without_app_sp_acl_proof(self) -> None:
        space_id = "e" * 32
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
                    "title": "Forge WAF Genie",
                    "description": VALID_CONFIG["genie"]["expected_description"],
                    "parent_path": "/Shared/Forge Genie Spaces/",
                },
                {"access_control_list": []},
            ]
        )
        with mock.patch.dict(NS, {"dbx_api": api}):
            with self.assertRaisesRegex(RuntimeError, "neither App-SP nor deployer"):
                NS["delete_genie_agents"](copy.deepcopy(VALID_CONFIG), {})
        self.assertFalse(any(call.args[0] == "DELETE" for call in api.call_args_list))

    def test_deletes_current_waf_obo_agent_only_with_deployer_acl(self) -> None:
        space_id = "d" * 32
        api = mock.Mock(
            side_effect=[
                {
                    "spaces": [
                        {
                            "space_id": space_id,
                            "title": "Forge WAF Genie",
                            "parent_path": "/Shared/",
                        }
                    ]
                },
                {
                    "space_id": space_id,
                    "title": "Forge WAF Genie",
                    "description": VALID_CONFIG_V2["genie"]["expected_description"],
                    "parent_path": "/Shared/",
                },
                {
                    "access_control_list": [
                        {
                            "user_name": "owner@example.com",
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
        result: dict = {}
        with mock.patch.dict(NS, {"dbx_api": api}):
            NS["delete_genie_agents"](copy.deepcopy(VALID_CONFIG_V2), result)
        self.assertEqual(1, result["genie_agents"]["deleted"])
        self.assertEqual(
            mock.call("DELETE", f"/api/2.0/genie/spaces/{space_id}"),
            api.call_args_list[-1],
        )

    def test_keeps_config_retryable_when_genie_preview_is_unavailable(self) -> None:
        error = NS["DbxApiError"](
            404,
            '{"error_code":"FEATURE_DISABLED"}',
            "/api/2.0/genie/spaces",
        )
        with mock.patch.dict(NS, {"dbx_api": mock.Mock(side_effect=error)}):
            with self.assertRaises(NS["DbxApiError"]):
                NS["delete_genie_agents"](copy.deepcopy(VALID_CONFIG), {})

    def test_ignores_same_title_without_atlas_ownership_marker(self) -> None:
        space_id = "c" * 32
        api = mock.Mock(
            side_effect=[
                {
                    "spaces": [
                        {
                            "space_id": space_id,
                            "title": "Forge WAF Genie",
                            "parent_path": "/Shared/",
                        }
                    ]
                },
                {
                    "space_id": space_id,
                    "title": "Forge WAF Genie",
                    "description": "Manually created by another owner",
                    "parent_path": "/Shared/",
                },
            ]
        )
        result: dict = {}
        with mock.patch.dict(NS, {"dbx_api": api}):
            NS["delete_genie_agents"](copy.deepcopy(VALID_CONFIG), result)
        self.assertEqual(
            {"deleted": 0, "already_absent": 0, "ignored_non_owned": 1},
            result["genie_agents"],
        )
        self.assertFalse(any(call.args[0] == "DELETE" for call in api.call_args_list))

    def test_refuses_to_delete_genie_agent_from_unexpected_path(self) -> None:
        space_id = "b" * 32
        api = mock.Mock(
            side_effect=[
                {
                    "spaces": [
                        {
                            "space_id": space_id,
                            "title": "Forge WAF Genie",
                        }
                    ]
                },
                {
                    "space_id": space_id,
                    "title": "Forge WAF Genie",
                    "description": VALID_CONFIG["genie"]["expected_description"],
                    "parent_path": "/Users/another-owner/",
                },
            ]
        )
        with mock.patch.dict(NS, {"dbx_api": api}):
            with self.assertRaisesRegex(RuntimeError, "unexpected parent path"):
                NS["delete_genie_agents"](copy.deepcopy(VALID_CONFIG), {})

    def test_stops_app_compute_before_resource_teardown(self) -> None:
        api = mock.Mock(
            side_effect=[
                {
                    "description": VALID_CONFIG["app"]["expected_description"],
                    "compute_status": {"state": "ACTIVE"},
                },
                {},
                {
                    "description": VALID_CONFIG["app"]["expected_description"],
                    "compute_status": {"state": "STOPPED"},
                },
            ]
        )
        result: dict = {}
        with mock.patch.dict(NS, {"dbx_api": api}):
            NS["stop_app"](copy.deepcopy(VALID_CONFIG), result)
        self.assertEqual("stopped", result["app_compute"])
        self.assertEqual(
            mock.call("POST", "/api/2.0/apps/atlas/stop", {}),
            api.call_args_list[1],
        )


if __name__ == "__main__":
    unittest.main()
