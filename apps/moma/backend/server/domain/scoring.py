"""
Motor de scoring do assessment.

Recebe respostas de multiplas areas e consolida em notas (escala 1-4) por:
  - funcao de dados (DAMA)
  - dimensao (pessoas / processos / tecnologia)
  - principio de Data Mesh
  - nota global

Respostas de multiplos respondentes para a mesma questao sao promediadas.
Respostas nulas ("Nao sei / Nao se aplica") sao excluidas do calculo.
"""

from __future__ import annotations

from collections import defaultdict
from statistics import mean

from .framework import (AREA_WEIGHT, DIMENSIONS, FUNCTIONS, MATURITY_DIMENSIONS,
                        MATURITY_LEVELS, MESH_PRINCIPLES)
from .questions import CULTURAL_READINESS_IDS, QUESTIONS_BY_ID


def _eff_weight(q: dict) -> float:
    """Peso efetivo da questao. Politica atual: TODAS as areas tem peso igual (1x) -
    o conceito de peso por grupo foi removido. A consolidacao das areas de negocio
    (multiplos respondentes promediados por pergunta em aggregate_question_levels) garante
    que o negocio conte como UMA voz, sem sobressair frente as demais areas.
    """
    return q.get("weight", 1.0) * AREA_WEIGHT.get(q.get("area"), 1.0)


def stage_for_score(score: float | None) -> dict | None:
    """Mapeia uma nota continua (1-4) para o estagio de maturidade dominante."""
    if score is None:
        return None
    # Arredondamento "half-up" consistente (evita o banker's rounding do round()),
    # limitado a [1,4]. Ex.: 2.5 -> 3, 3.5 -> 4.
    import math
    idx = min(4, max(1, int(math.floor(score + 0.5))))
    return next(l for l in MATURITY_LEVELS if l["level"] == idx)


def _weighted_mean(pairs: list[tuple[float, float]]) -> float | None:
    """pairs = lista de (valor, peso). Retorna media ponderada ou None se vazio."""
    pairs = [(v, w) for v, w in pairs if v is not None]
    if not pairs:
        return None
    total_w = sum(w for _, w in pairs)
    if total_w == 0:
        return None
    return sum(v * w for v, w in pairs) / total_w


def aggregate_question_levels(responses: list[dict]) -> dict[str, float]:
    """
    responses: [{"area", "question_id", "level"}]. level pode ser None (excluido).
    Retorna {question_id: nivel_medio} promediando entre respondentes.
    """
    buckets: dict[str, list[int]] = defaultdict(list)
    for r in responses:
        lvl = r.get("level")
        qid = r.get("question_id")
        if lvl is None or qid not in QUESTIONS_BY_ID:
            continue
        buckets[qid].append(int(lvl))
    return {qid: mean(levels) for qid, levels in buckets.items() if levels}


def compute_scores(responses: list[dict]) -> dict:
    """
    Consolida as respostas em um objeto de scores completo.
    """
    q_levels = aggregate_question_levels(responses)

    # ---- por funcao ----
    by_function = {}
    for fn in FUNCTIONS:
        pairs = []
        for qid, lvl in q_levels.items():
            q = QUESTIONS_BY_ID[qid]
            if fn["key"] in q.get("functions", [q["function"]]):
                pairs.append((lvl, _eff_weight(q)))
        score = _weighted_mean(pairs)
        by_function[fn["key"]] = {
            "key": fn["key"],
            "name": fn["name"],
            "score": round(score, 2) if score is not None else None,
            "stage": stage_for_score(score),
            "answered": len(pairs),
        }

    # ---- por dimensao ----
    by_dimension = {}
    for dim in DIMENSIONS:
        pairs = []
        for qid, lvl in q_levels.items():
            q = QUESTIONS_BY_ID[qid]
            if dim["key"] in q.get("dimensions", [q["dimension"]]):
                pairs.append((lvl, _eff_weight(q)))
        score = _weighted_mean(pairs)
        by_dimension[dim["key"]] = {
            "key": dim["key"],
            "name": dim["name"],
            "score": round(score, 2) if score is not None else None,
            "stage": stage_for_score(score),
            "answered": len(pairs),
        }

    # ---- por principio de data mesh ----
    by_principle = {}
    for pr in MESH_PRINCIPLES:
        pairs = []
        for qid, lvl in q_levels.items():
            q = QUESTIONS_BY_ID[qid]
            if pr["key"] in q.get("mesh_principles", []):
                pairs.append((lvl, _eff_weight(q)))
        score = _weighted_mean(pairs)
        by_principle[pr["key"]] = {
            "key": pr["key"],
            "name": pr["name"],
            "score": round(score, 2) if score is not None else None,
            "stage": stage_for_score(score),
            "answered": len(pairs),
        }

    # ---- por dimensao de MATURIDADE (eixo executivo) ----
    by_maturity = {}
    for md in MATURITY_DIMENSIONS:
        pairs = []
        for qid, lvl in q_levels.items():
            q = QUESTIONS_BY_ID[qid]
            if q.get("maturity_dimension") == md["key"]:
                pairs.append((lvl, _eff_weight(q)))
        score = _weighted_mean(pairs)
        by_maturity[md["key"]] = {
            "key": md["key"],
            "name": md["name"],
            "icon": md.get("icon"),
            "score": round(score, 2) if score is not None else None,
            "stage": stage_for_score(score),
            "answered": len(pairs),
        }

    # ---- nota global (media ponderada de todas as questoes respondidas) ----
    all_pairs = [(lvl, _eff_weight(QUESTIONS_BY_ID[qid])) for qid, lvl in q_levels.items()]
    global_score = _weighted_mean(all_pairs)

    # Prontidao para data mesh (uma das lentes): media dos 4 principios, com TETO CULTURAL.
    principle_scores = [p["score"] for p in by_principle.values() if p["score"] is not None]
    mesh_raw = round(mean(principle_scores), 2) if principle_scores else None

    # Prontidao cultural (pre-condicao sociotecnica): patrocinio, estrategia, cultura, etc.
    cult_pairs = [(lvl, _eff_weight(QUESTIONS_BY_ID[qid]))
                  for qid, lvl in q_levels.items() if qid in CULTURAL_READINESS_IDS]
    cultural_readiness = _weighted_mean(cult_pairs)
    cultural_readiness = round(cultural_readiness, 2) if cultural_readiness is not None else None

    # Teto suave: sem base cultural, capacidade tecnica nao vira Mesh real (espelha o teto de
    # fundacao usado na topologia). mesh_efetiva = min(media_principios, cultural + 0,5).
    if mesh_raw is not None and cultural_readiness is not None:
        mesh_readiness = round(min(mesh_raw, cultural_readiness + 0.5), 2)
    else:
        mesh_readiness = mesh_raw

    return {
        "global_score": round(global_score, 2) if global_score is not None else None,
        "global_stage": stage_for_score(global_score),
        "mesh_readiness": mesh_readiness,
        "mesh_readiness_raw": mesh_raw,
        "cultural_readiness": cultural_readiness,
        "by_function": by_function,
        "by_dimension": by_dimension,
        "by_maturity": by_maturity,
        "by_principle": by_principle,
        "answered_questions": len(q_levels),
        "total_questions": len(QUESTIONS_BY_ID),
    }
