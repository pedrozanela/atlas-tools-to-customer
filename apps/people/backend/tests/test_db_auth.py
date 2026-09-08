from types import SimpleNamespace

import pytest

from app import db


def test_native_password_wins_when_endpoint_is_also_configured(monkeypatch):
    settings = SimpleNamespace(
        PGPASSWORD="native-secret",
        LAKEBASE_ENDPOINT_NAME="projects/p/branches/b/endpoints/e",
        RDS_IAM_AUTH=False,
        PGUSER="atlas-admin",
        DATABRICKS_CLIENT_ID="app-service-principal",
    )

    def should_not_create_workspace_client():
        raise AssertionError("OAuth must not be requested for a native PG role")

    import app.auth.workspace_client as workspace_client

    monkeypatch.setattr(
        workspace_client,
        "get_workspace_client",
        should_not_create_workspace_client,
    )
    db._pw_cache.update(token=None, exp=0.0)

    assert db._db_password(settings) == "native-secret"
    assert db._db_user(settings) == "atlas-admin"


@pytest.mark.parametrize("host", [
    "ep-demo-pooler.database.azuredatabricks.net",
    "ep-demo.database.azuredatabricks.net",
])
def test_get_conn_sets_search_path_after_connect_for_pooler_and_direct_hosts(
    monkeypatch,
    host,
):
    settings = SimpleNamespace(
        PGHOST=host,
        PGPORT=5432,
        PGDATABASE="databricks_postgres",
        PGUSER="atlas-admin",
        PGPASSWORD="native-secret",
        LAKEBASE_ENDPOINT_NAME=None,
        RDS_IAM_AUTH=False,
        DATABRICKS_CLIENT_ID=None,
        PGSSLMODE="require",
        PGSCHEMA="certifica_demo",
    )
    calls = []

    class FakeConnection:
        closed = False

        def execute(self, query):
            calls.append(query.as_string())

        def close(self):
            self.closed = True

    connection = FakeConnection()

    import psycopg

    connect_kwargs = {}

    def fake_connect(**kwargs):
        connect_kwargs.update(kwargs)
        return connection

    monkeypatch.setattr(db, "get_settings", lambda: settings)
    monkeypatch.setattr(psycopg, "connect", fake_connect)

    with db.get_conn() as yielded:
        assert yielded is connection
        assert connection.closed is False

    assert connect_kwargs["host"] == host
    assert "options" not in connect_kwargs
    assert calls == ['SET search_path TO "certifica_demo"']
    assert connection.closed is True
