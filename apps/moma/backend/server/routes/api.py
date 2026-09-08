"""Rotas da API do assessment."""

from __future__ import annotations

from collections import defaultdict
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..domain.framework import (AREAS, DIMENSIONS, FUNCTIONS, MATURITY_DIMENSIONS,
                                MATURITY_LEVELS, MESH_PRINCIPLES)
from ..domain.mesh import TOPOLOGIES
from ..domain.operating_model import operating_model_payload
from ..domain.questions import QUESTIONS, QUESTIONS_BY_ID, questions_for_area
from ..domain.references import (CONCEPT_REFERENCES, INTERNAL_REFERENCES,
                                KEY_MESSAGES, PUBLIC_REFERENCES)
from ..domain.report import build_report
from ..domain.i18n import localize_framework, localize_report, localize_operating_model
from ..config import APP_MODE, IS_CLIENT
from .. import store

router = APIRouter()


# ------------------------------------------------------------------ #
# Framework (conteudo estatico do assessment) - consumido pelo frontend
# ------------------------------------------------------------------ #
@router.get("/framework")
def get_framework(lang: str = "pt"):
    payload = {
        "maturity_levels": MATURITY_LEVELS,
        "dimensions": DIMENSIONS,
        "maturity_dimensions": MATURITY_DIMENSIONS,
        "functions": FUNCTIONS,
        "mesh_principles": MESH_PRINCIPLES,
        "areas": AREAS,
        "questions": QUESTIONS,
        "topologies": TOPOLOGIES,
        "key_messages": KEY_MESSAGES,
        # No modo cliente, nao expor recursos internos (go/*, decks internos).
        "references": {"internal": [] if IS_CLIENT else INTERNAL_REFERENCES,
                       "public": PUBLIC_REFERENCES, "concept": CONCEPT_REFERENCES},
        "mode": APP_MODE,
    }
    return localize_framework(payload, lang)


# ------------------------------------------------------------------ #
# Modelo Operacional (areas/capacidades de dados + RACI) - referencia
# ------------------------------------------------------------------ #
@router.get("/operating_model")
def get_operating_model(lang: str = "pt"):
    return localize_operating_model(operating_model_payload(), lang)


@router.get("/assessments/{aid}/operating_model")
def get_local_operating_model(aid: str):
    """Atribuicoes locais (nomes de area/pessoa por funcao) de um assessment."""
    return store.get_operating_model(aid)


class OperatingModelBody(BaseModel):
    assignments: dict = {}  # { "<area_key>.<function_key>": {"type": "tbd|none|named", "name": "..."} }


@router.put("/assessments/{aid}/operating_model")
def save_local_operating_model(aid: str, body: OperatingModelBody):
    store.save_operating_model(aid, body.assignments)
    return {"ok": True, "count": len(body.assignments)}


# ------------------------------------------------------------------ #
# Assessments
# ------------------------------------------------------------------ #
class CreateAssessment(BaseModel):
    client_name: str = ""


@router.post("/assessments")
def create_assessment(body: CreateAssessment):
    return store.create_assessment(body.client_name)


@router.get("/assessments")
def list_assessments(scope: str = "active"):
    return store.list_assessments(scope)


@router.delete("/assessments/{aid}")
def archive_assessment(aid: str):
    """Exclusao logica: move o assessment (e respostas) para as tabelas historicas."""
    if not store.get_assessment(aid):
        raise HTTPException(status_code=404, detail="Assessment nao encontrado")
    store.archive_assessment(aid)
    return {"archived": aid}


@router.post("/assessments/{aid}/restore")
def restore_assessment(aid: str):
    store.restore_assessment(aid)
    return {"restored": aid}


@router.delete("/assessments/{aid}/purge")
def purge_assessment(aid: str):
    """Exclusao DEFINITIVA: remove o assessment das tabelas historicas."""
    store.purge_assessment(aid)
    return {"purged": aid}


class HiddenBody(BaseModel):
    hidden: bool = True


@router.post("/assessments/{aid}/hidden")
def set_hidden(aid: str, body: HiddenBody):
    store.set_hidden(aid, body.hidden)
    return {"id": aid, "hidden": body.hidden}


@router.get("/assessments/{aid}/export")
def export_assessment(aid: str):
    """Exporta o assessment (metadados + respostas) como JSON para reimportacao."""
    a = store.get_assessment(aid)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment nao encontrado")
    return {
        "schema": "data-maturity-compass/assessment-export/v1",
        "client_name": a["client_name"],
        "created_at": a["created_at"],
        "responses": store.get_responses(aid),
    }


class ImportBody(BaseModel):
    client_name: str = ""
    responses: List[Answer] = []  # placeholder; real shape validado abaixo


@router.post("/assessments/import")
def import_assessment(payload: dict):
    """Cria um novo assessment a partir de um JSON exportado (respostas de um cliente)."""
    client_name = (payload.get("client_name") or "").strip()
    responses = payload.get("responses") or []
    a = store.create_assessment(client_name)
    aid = a["id"]
    # agrupa por (area, respondente) e grava
    grouped = defaultdict(list)
    for r in responses:
        area = r.get("area"); respondent = r.get("respondent")
        qid = r.get("question_id")
        if not (area and respondent and qid):
            continue
        grouped[(area, respondent)].append({"question_id": qid, "level": r.get("level")})
    for (area, respondent), answers in grouped.items():
        store.save_responses(aid, area, respondent, answers)
    return {"id": aid, "imported_responses": len(responses)}


def _progress(aid: str) -> dict:
    """Progresso por area: respondentes e questoes respondidas x total."""
    resp = store.get_responses(aid)
    respondents_by_area = defaultdict(set)
    answered_by_area = defaultdict(set)
    for r in resp:
        respondents_by_area[r["area"]].add(r["respondent"])
        answered_by_area[r["area"]].add(r["question_id"])
    out = {}
    for area in AREAS:
        total_q = len(questions_for_area(area["key"]))
        out[area["key"]] = {
            "respondents": len(respondents_by_area[area["key"]]),
            "answered": len(answered_by_area[area["key"]]),
            "total": total_q,
        }
    return out


@router.get("/assessments/{aid}")
def get_assessment(aid: str):
    a = store.get_assessment(aid)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment nao encontrado")
    a["progress"] = _progress(aid)
    return a


# ------------------------------------------------------------------ #
# Respostas
# ------------------------------------------------------------------ #
class Answer(BaseModel):
    question_id: str
    level: Optional[int] = None


class SubmitResponses(BaseModel):
    area: str
    respondent: str
    answers: List[Answer]


@router.post("/assessments/{aid}/responses")
def submit_responses(aid: str, body: SubmitResponses):
    if not store.get_assessment(aid):
        raise HTTPException(status_code=404, detail="Assessment nao encontrado")
    if not body.respondent.strip():
        raise HTTPException(status_code=400, detail="Informe o nome do respondente")
    n = store.save_responses(
        aid, body.area, body.respondent.strip(),
        [{"question_id": a.question_id, "level": a.level} for a in body.answers],
    )
    return {"saved": n}


@router.get("/assessments/{aid}/responses")
def get_my_answers(aid: str, respondent: str):
    """Respostas ja dadas por um respondente (para retomar)."""
    return store.get_respondent_answers(aid, respondent)


@router.get("/assessments/{aid}/responses/detail")
def get_responses_detail(aid: str):
    """Respostas detalhadas por area e respondente (para visualizacao)."""
    if not store.get_assessment(aid):
        raise HTTPException(status_code=404, detail="Assessment nao encontrado")
    area_names = {a["key"]: a["name"] for a in AREAS}
    fn_names = {f["key"]: f["name"] for f in FUNCTIONS}
    dim_names = {d["key"]: d["name"] for d in DIMENSIONS}
    resp = store.get_responses(aid)

    by_area = {}
    for r in resp:
        q = QUESTIONS_BY_ID.get(r["question_id"])
        if not q:
            continue
        area = r["area"]
        a = by_area.setdefault(area, {"name": area_names.get(area, area), "respondents": {}})
        person = a["respondents"].setdefault(r["respondent"], [])
        level = r["level"]
        option_text = None
        if level is not None:
            option_text = next((o["text"] for o in q["options"] if o["level"] == level), None)
        person.append({
            "question_id": q["id"],
            "question_text": q["text"],
            "function": fn_names.get(q["function"], q["function"]),
            "dimension": dim_names.get(q["dimension"], q["dimension"]),
            "level": level,
            "option_text": option_text if level is not None else "Nao sei / Nao se aplica",
        })
    # ordena as perguntas de cada respondente por id
    for a in by_area.values():
        for person in a["respondents"].values():
            person.sort(key=lambda x: x["question_id"])
    return {"by_area": by_area}


# ------------------------------------------------------------------ #
# Relatorio
# ------------------------------------------------------------------ #
@router.get("/assessments/{aid}/report")
def get_report(aid: str, lang: str = "pt"):
    a = store.get_assessment(aid)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment nao encontrado")
    responses = store.get_responses(aid)
    report = localize_report(build_report(responses, client_name=a["client_name"]), lang)
    if IS_CLIENT:  # cliente nao ve recursos internos (go/*)
        report.get("references", {})["internal"] = []
    report["mode"] = APP_MODE
    return report
