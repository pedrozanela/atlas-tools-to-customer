"""
Camada de persistencia (multiusuario, assincrono).

Dois backends, uma mesma interface:
  - Lakehouse (Unity Catalog / Delta) via SQL warehouse + Statement Execution API, quando
    UC_CATALOG + UC_SCHEMA + WAREHOUSE_ID estao presentes (deploy no Databricks App). Nao
    exige Lakebase: as tabelas vivem no proprio lakehouse.
  - SQLite (stdlib) em ./data (ou /tmp no Apps), caso contrario - para rodar/replicar
    localmente sem depender do workspace.

Modelo de dados (tabelas Delta / SQLite):
  dm_assessments(id, client_name, created_at)
  dm_responses(id, assessment_id, area, respondent, question_id, level, updated_at)
Upsert por (assessment_id, respondent, question_id): o save apaga as respostas anteriores
do respondente para as questoes enviadas e insere as novas (2 statements por save).
"""

from __future__ import annotations

import os
import sqlite3
import tempfile
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone

from .config import HAS_LAKEHOUSE, IS_DATABRICKS_APP, UC_CATALOG, UC_SCHEMA, WAREHOUSE_ID

_lock = threading.Lock()
_sqlite_conn = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ================================================================== #
# Backend LAKEHOUSE (Delta via Statement Execution)
# ================================================================== #
def _exec(sql: str, params=None):
    """Executa um statement no warehouse. params = [(name, value, type)].
    Retorna a lista de linhas (data_array) para SELECTs."""
    from databricks.sdk.service.sql import StatementParameterListItem, StatementState
    from .config import get_workspace_client

    w = get_workspace_client()
    plist = None
    if params:
        plist = [StatementParameterListItem(
            name=n, value=(None if v is None else str(v)), type=t) for (n, v, t) in params]
    resp = w.statement_execution.execute_statement(
        warehouse_id=WAREHOUSE_ID, catalog=UC_CATALOG, schema=UC_SCHEMA,
        statement=sql, parameters=plist, wait_timeout="50s")
    state = resp.status.state if resp.status else None
    if state and state != StatementState.SUCCEEDED:
        err = getattr(resp.status, "error", None)
        raise RuntimeError(f"SQL falhou ({state}): {err}")
    if resp.result and resp.result.data_array:
        return resp.result.data_array
    return []


def _lh_init():
    _exec("CREATE TABLE IF NOT EXISTS dm_assessments "
          "(id STRING, client_name STRING, created_at STRING) USING DELTA")
    _exec("CREATE TABLE IF NOT EXISTS dm_responses "
          "(id STRING, assessment_id STRING, area STRING, respondent STRING, "
          "question_id STRING, level INT, updated_at STRING) USING DELTA")
    # Tabelas historicas (arquivo) e flag de ocultacao.
    _exec("CREATE TABLE IF NOT EXISTS dm_assessments_archive "
          "(id STRING, client_name STRING, created_at STRING) USING DELTA")
    _exec("CREATE TABLE IF NOT EXISTS dm_responses_archive "
          "(id STRING, assessment_id STRING, area STRING, respondent STRING, "
          "question_id STRING, level INT, updated_at STRING) USING DELTA")
    _exec("CREATE TABLE IF NOT EXISTS dm_hidden (assessment_id STRING) USING DELTA")
    # Modelo operacional local: atribuicoes (area.funcao -> tipo/nome) por assessment.
    _exec("CREATE TABLE IF NOT EXISTS dm_operating_model "
          "(assessment_id STRING, slot_key STRING, assignee_type STRING, "
          "assignee_name STRING, updated_at STRING) USING DELTA")


def _lh_list_assessments(scope="active"):
    if scope == "archived":
        rows = _exec("SELECT id, client_name, created_at FROM dm_assessments_archive "
                     "ORDER BY created_at DESC")
        return [{"id": r[0], "client_name": r[1] or "", "created_at": r[2],
                 "hidden": False, "archived": True} for r in rows]
    # Ativo: uma unica query (LEFT JOIN com dm_hidden) em vez de dois round-trips.
    rows = _exec(
        "SELECT a.id, a.client_name, a.created_at, "
        "CASE WHEN h.assessment_id IS NULL THEN 0 ELSE 1 END AS hidden "
        "FROM dm_assessments a LEFT JOIN dm_hidden h ON a.id = h.assessment_id "
        "ORDER BY a.created_at DESC")
    return [{"id": r[0], "client_name": r[1] or "", "created_at": r[2],
             "hidden": str(r[3]) == "1", "archived": False} for r in rows]


def _lh_archive(aid):
    p = [("id", aid, "STRING")]
    _exec("INSERT INTO dm_assessments_archive SELECT * FROM dm_assessments WHERE id = :id", p)
    _exec("INSERT INTO dm_responses_archive SELECT * FROM dm_responses WHERE assessment_id = :id", p)
    _exec("DELETE FROM dm_responses WHERE assessment_id = :id", p)
    _exec("DELETE FROM dm_assessments WHERE id = :id", p)
    _exec("DELETE FROM dm_hidden WHERE assessment_id = :id", p)


def _lh_restore(aid):
    p = [("id", aid, "STRING")]
    _exec("INSERT INTO dm_assessments SELECT * FROM dm_assessments_archive WHERE id = :id", p)
    _exec("INSERT INTO dm_responses SELECT * FROM dm_responses_archive WHERE assessment_id = :id", p)
    _exec("DELETE FROM dm_responses_archive WHERE assessment_id = :id", p)
    _exec("DELETE FROM dm_assessments_archive WHERE id = :id", p)


def _lh_set_hidden(aid, hidden):
    # Um unico statement em vez de DELETE+INSERT (2 round-trips).
    if hidden:
        _exec("MERGE INTO dm_hidden t USING (SELECT :id AS assessment_id) s "
              "ON t.assessment_id = s.assessment_id "
              "WHEN NOT MATCHED THEN INSERT (assessment_id) VALUES (s.assessment_id)",
              [("id", aid, "STRING")])
    else:
        _exec("DELETE FROM dm_hidden WHERE assessment_id = :id", [("id", aid, "STRING")])


def _lh_purge(aid):
    p = [("id", aid, "STRING")]
    _exec("DELETE FROM dm_responses_archive WHERE assessment_id = :id", p)
    _exec("DELETE FROM dm_assessments_archive WHERE id = :id", p)


def _lh_create_assessment(client_name, aid, now):
    _exec("INSERT INTO dm_assessments (id, client_name, created_at) VALUES (:id, :n, :ts)",
          [("id", aid, "STRING"), ("n", client_name or "", "STRING"), ("ts", now, "STRING")])


def _lh_get_assessment(aid):
    rows = _exec("SELECT id, client_name, created_at FROM dm_assessments WHERE id = :id",
                 [("id", aid, "STRING")])
    if not rows:
        return None
    r = rows[0]
    return {"id": r[0], "client_name": r[1] or "", "created_at": r[2]}


def _lh_save_responses(aid, area, respondent, answers):
    qids = [a["question_id"] for a in answers if a.get("question_id")]
    if not qids:
        return 0
    # DELETE em lote (respostas anteriores do mesmo respondente p/ as questoes enviadas)
    del_params = [("aid", aid, "STRING"), ("r", respondent, "STRING")]
    markers = []
    for i, q in enumerate(qids):
        del_params.append((f"q{i}", q, "STRING")); markers.append(f":q{i}")
    _exec(f"DELETE FROM dm_responses WHERE assessment_id = :aid AND respondent = :r "
          f"AND question_id IN ({','.join(markers)})", del_params)
    # INSERT em lote (multi-row)
    ins_params, rows_sql = [], []
    for i, a in enumerate(answers):
        qid = a.get("question_id")
        if not qid:
            continue
        lvl = a.get("level")
        ins_params += [
            (f"id{i}", str(uuid.uuid4()), "STRING"), (f"aid{i}", aid, "STRING"),
            (f"ar{i}", area, "STRING"), (f"re{i}", respondent, "STRING"),
            (f"qi{i}", qid, "STRING"),
            (f"lv{i}", None if lvl is None else int(lvl), "INT"),
            (f"ts{i}", _now(), "STRING"),
        ]
        rows_sql.append(f"(:id{i},:aid{i},:ar{i},:re{i},:qi{i},:lv{i},:ts{i})")
    _exec("INSERT INTO dm_responses (id, assessment_id, area, respondent, question_id, level, updated_at) "
          f"VALUES {','.join(rows_sql)}", ins_params)
    return len(qids)


def _lh_get_responses(aid):
    rows = _exec("SELECT area, respondent, question_id, level FROM dm_responses WHERE assessment_id = :aid",
                 [("aid", aid, "STRING")])
    out = []
    for r in rows:
        lvl = r[3]
        out.append({"area": r[0], "respondent": r[1], "question_id": r[2],
                    "level": (int(lvl) if lvl is not None else None)})
    return out


def _lh_get_respondent_answers(aid, respondent):
    rows = _exec("SELECT question_id, level FROM dm_responses WHERE assessment_id = :aid AND respondent = :r",
                 [("aid", aid, "STRING"), ("r", respondent, "STRING")])
    return {r[0]: (int(r[1]) if r[1] is not None else None) for r in rows}


def _lh_get_operating_model(aid):
    rows = _exec("SELECT slot_key, assignee_type, assignee_name FROM dm_operating_model "
                 "WHERE assessment_id = :aid", [("aid", aid, "STRING")])
    return {r[0]: {"type": r[1], "name": r[2] or ""} for r in rows}


def _lh_save_operating_model(aid, assignments):
    _exec("DELETE FROM dm_operating_model WHERE assessment_id = :aid", [("aid", aid, "STRING")])
    items = [(k, v) for k, v in (assignments or {}).items() if v and v.get("type")]
    if not items:
        return 0
    params, rows_sql = [], []
    now = _now()
    for i, (slot, v) in enumerate(items):
        params += [
            (f"a{i}", aid, "STRING"), (f"s{i}", slot, "STRING"),
            (f"t{i}", v.get("type"), "STRING"), (f"n{i}", v.get("name") or "", "STRING"),
            (f"u{i}", now, "STRING"),
        ]
        rows_sql.append(f"(:a{i},:s{i},:t{i},:n{i},:u{i})")
    _exec("INSERT INTO dm_operating_model (assessment_id, slot_key, assignee_type, assignee_name, updated_at) "
          f"VALUES {','.join(rows_sql)}", params)
    return len(items)


# ================================================================== #
# Backend SQLITE (local)
# ================================================================== #
def _sqlite_path() -> str:
    override = os.environ.get("SQLITE_DIR")
    if override:
        data_dir = override
    elif IS_DATABRICKS_APP:
        data_dir = os.path.join(tempfile.gettempdir(), "data_maturity_compass")
    else:
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, "assessment.db")


def _get_sqlite():
    global _sqlite_conn
    if _sqlite_conn is None:
        _sqlite_conn = sqlite3.connect(_sqlite_path(), check_same_thread=False)
        _sqlite_conn.row_factory = sqlite3.Row
    return _sqlite_conn


@contextmanager
def _cursor():
    with _lock:
        conn = _get_sqlite()
        cur = conn.cursor()
        try:
            yield cur
            conn.commit()
        finally:
            cur.close()


def _sq_init():
    with _cursor() as cur:
        cur.execute("CREATE TABLE IF NOT EXISTS dm_assessments "
                    "(id TEXT PRIMARY KEY, client_name TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)")
        cur.execute("CREATE TABLE IF NOT EXISTS dm_responses "
                    "(id TEXT PRIMARY KEY, assessment_id TEXT NOT NULL, area TEXT NOT NULL, "
                    "respondent TEXT NOT NULL, question_id TEXT NOT NULL, level INTEGER, updated_at TEXT NOT NULL)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_resp_assessment ON dm_responses(assessment_id)")
        cur.execute("CREATE TABLE IF NOT EXISTS dm_assessments_archive "
                    "(id TEXT PRIMARY KEY, client_name TEXT, created_at TEXT)")
        cur.execute("CREATE TABLE IF NOT EXISTS dm_responses_archive "
                    "(id TEXT PRIMARY KEY, assessment_id TEXT, area TEXT, respondent TEXT, "
                    "question_id TEXT, level INTEGER, updated_at TEXT)")
        cur.execute("CREATE TABLE IF NOT EXISTS dm_hidden (assessment_id TEXT PRIMARY KEY)")
        cur.execute("CREATE TABLE IF NOT EXISTS dm_operating_model "
                    "(assessment_id TEXT, slot_key TEXT, assignee_type TEXT, assignee_name TEXT, updated_at TEXT, "
                    "PRIMARY KEY (assessment_id, slot_key))")


def _sq_create_assessment(client_name, aid, now):
    with _cursor() as cur:
        cur.execute("INSERT INTO dm_assessments (id, client_name, created_at) VALUES (?, ?, ?)",
                    (aid, client_name or "", now))


def _sq_list_assessments(scope="active"):
    table = "dm_assessments_archive" if scope == "archived" else "dm_assessments"
    with _cursor() as cur:
        cur.execute(f"SELECT id, client_name, created_at FROM {table} ORDER BY created_at DESC")
        rows = cur.fetchall()
        hidden = set()
        if scope != "archived":
            cur.execute("SELECT assessment_id FROM dm_hidden")
            hidden = {r[0] for r in cur.fetchall()}
    return [{"id": r[0], "client_name": r[1], "created_at": r[2],
             "hidden": r[0] in hidden, "archived": scope == "archived"} for r in rows]


def _sq_archive(aid):
    with _cursor() as cur:
        cur.execute("INSERT OR REPLACE INTO dm_assessments_archive SELECT * FROM dm_assessments WHERE id = ?", (aid,))
        cur.execute("INSERT OR REPLACE INTO dm_responses_archive SELECT * FROM dm_responses WHERE assessment_id = ?", (aid,))
        cur.execute("DELETE FROM dm_responses WHERE assessment_id = ?", (aid,))
        cur.execute("DELETE FROM dm_assessments WHERE id = ?", (aid,))
        cur.execute("DELETE FROM dm_hidden WHERE assessment_id = ?", (aid,))


def _sq_restore(aid):
    with _cursor() as cur:
        cur.execute("INSERT OR REPLACE INTO dm_assessments SELECT * FROM dm_assessments_archive WHERE id = ?", (aid,))
        cur.execute("INSERT OR REPLACE INTO dm_responses SELECT * FROM dm_responses_archive WHERE assessment_id = ?", (aid,))
        cur.execute("DELETE FROM dm_responses_archive WHERE assessment_id = ?", (aid,))
        cur.execute("DELETE FROM dm_assessments_archive WHERE id = ?", (aid,))


def _sq_set_hidden(aid, hidden):
    with _cursor() as cur:
        cur.execute("DELETE FROM dm_hidden WHERE assessment_id = ?", (aid,))
        if hidden:
            cur.execute("INSERT INTO dm_hidden (assessment_id) VALUES (?)", (aid,))


def _sq_purge(aid):
    with _cursor() as cur:
        cur.execute("DELETE FROM dm_responses_archive WHERE assessment_id = ?", (aid,))
        cur.execute("DELETE FROM dm_assessments_archive WHERE id = ?", (aid,))


def _sq_get_assessment(aid):
    with _cursor() as cur:
        cur.execute("SELECT id, client_name, created_at FROM dm_assessments WHERE id = ?", (aid,))
        r = cur.fetchone()
    return {"id": r[0], "client_name": r[1], "created_at": r[2]} if r else None


def _sq_save_responses(aid, area, respondent, answers):
    with _cursor() as cur:
        for a in answers:
            qid = a.get("question_id")
            if not qid:
                continue
            cur.execute("DELETE FROM dm_responses WHERE assessment_id=? AND respondent=? AND question_id=?",
                        (aid, respondent, qid))
            cur.execute("INSERT INTO dm_responses (id, assessment_id, area, respondent, question_id, level, updated_at) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (str(uuid.uuid4()), aid, area, respondent, qid, a.get("level"), _now()))
    return len(answers)


def _sq_get_responses(aid):
    with _cursor() as cur:
        cur.execute("SELECT area, respondent, question_id, level FROM dm_responses WHERE assessment_id = ?", (aid,))
        rows = cur.fetchall()
    return [{"area": r[0], "respondent": r[1], "question_id": r[2], "level": r[3]} for r in rows]


def _sq_get_respondent_answers(aid, respondent):
    with _cursor() as cur:
        cur.execute("SELECT question_id, level FROM dm_responses WHERE assessment_id = ? AND respondent = ?",
                    (aid, respondent))
        rows = cur.fetchall()
    return {r[0]: r[1] for r in rows}


def _sq_get_operating_model(aid):
    with _cursor() as cur:
        cur.execute("SELECT slot_key, assignee_type, assignee_name FROM dm_operating_model WHERE assessment_id = ?", (aid,))
        rows = cur.fetchall()
    return {r[0]: {"type": r[1], "name": r[2] or ""} for r in rows}


def _sq_save_operating_model(aid, assignments):
    with _cursor() as cur:
        cur.execute("DELETE FROM dm_operating_model WHERE assessment_id = ?", (aid,))
        n = 0
        for slot, v in (assignments or {}).items():
            if not v or not v.get("type"):
                continue
            cur.execute("INSERT INTO dm_operating_model (assessment_id, slot_key, assignee_type, assignee_name, updated_at) "
                        "VALUES (?, ?, ?, ?, ?)", (aid, slot, v.get("type"), v.get("name") or "", _now()))
            n += 1
    return n


# ================================================================== #
# Interface publica (despacha para o backend ativo)
# ================================================================== #
def init_db():
    _lh_init() if HAS_LAKEHOUSE else _sq_init()


def create_assessment(client_name: str) -> dict:
    aid, now = str(uuid.uuid4()), _now()
    (_lh_create_assessment if HAS_LAKEHOUSE else _sq_create_assessment)(client_name, aid, now)
    return {"id": aid, "client_name": client_name or "", "created_at": now}


def list_assessments(scope: str = "active") -> list:
    return _lh_list_assessments(scope) if HAS_LAKEHOUSE else _sq_list_assessments(scope)


def archive_assessment(aid: str):
    (_lh_archive if HAS_LAKEHOUSE else _sq_archive)(aid)


def restore_assessment(aid: str):
    (_lh_restore if HAS_LAKEHOUSE else _sq_restore)(aid)


def set_hidden(aid: str, hidden: bool):
    (_lh_set_hidden if HAS_LAKEHOUSE else _sq_set_hidden)(aid, hidden)


def purge_assessment(aid: str):
    (_lh_purge if HAS_LAKEHOUSE else _sq_purge)(aid)


def get_assessment(aid: str):
    return _lh_get_assessment(aid) if HAS_LAKEHOUSE else _sq_get_assessment(aid)


def save_responses(aid: str, area: str, respondent: str, answers: list) -> int:
    return (_lh_save_responses if HAS_LAKEHOUSE else _sq_save_responses)(aid, area, respondent, answers)


def get_responses(aid: str) -> list:
    return _lh_get_responses(aid) if HAS_LAKEHOUSE else _sq_get_responses(aid)


def get_respondent_answers(aid: str, respondent: str) -> dict:
    return _lh_get_respondent_answers(aid, respondent) if HAS_LAKEHOUSE else _sq_get_respondent_answers(aid, respondent)


def get_operating_model(aid: str) -> dict:
    return _lh_get_operating_model(aid) if HAS_LAKEHOUSE else _sq_get_operating_model(aid)


def save_operating_model(aid: str, assignments: dict) -> int:
    return (_lh_save_operating_model if HAS_LAKEHOUSE else _sq_save_operating_model)(aid, assignments)
