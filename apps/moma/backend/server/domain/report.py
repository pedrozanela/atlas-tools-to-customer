"""
Gerador de relatorio.

Consome os scores (scoring.py), a recomendacao de topologia (mesh.py) e o catalogo de
solucoes Databricks (catalog.py) para montar um relatorio estruturado, no espirito do
assessment DAMA-DMBOK, porem sempre direcionado a produtos e solucoes Databricks e
conectado ao modelo de Data Mesh adequado a maturidade aferida.
"""

from __future__ import annotations

from datetime import datetime, timezone

from .catalog import DATABRICKS_DOCS, DATABRICKS_PRODUCTS, FUNCTION_SOLUTIONS
from .framework import FUNCTIONS
from .mesh import recommend_topology
from .references import CONCEPT_REFERENCES, KEY_MESSAGES
from .scoring import aggregate_question_levels, compute_scores, stage_for_score
from .questions import QUESTIONS_BY_ID

_FUNCTIONS_BY_KEY = {f["key"]: f for f in FUNCTIONS}

# Consequencias tipicas de baixa maturidade por funcao (para os pontos de atencao).
_CONSEQUENCES = {
    "governanca": "Decisões sem autoridade clara, retrabalho, risco de conformidade e baixa confiança nos dados.",
    "arquitetura": "Silos, redundância, integrações frágeis e custo elevado de manutenção.",
    "metadados": "Dificuldade de descobrir e confiar nos dados; retrabalho e dependência de pessoas-chave.",
    "modelagem": "Estruturas inconsistentes, baixa reutilização e múltiplas 'verdades' de negócio.",
    "operacoes": "Pipelines frágeis, provisionamento lento, custo sem controle e baixa confiabilidade.",
    "qualidade": "Decisões baseadas em dados incorretos, retrabalho e perda de confiança do negócio.",
    "dados_mestres": "Cadastros redundantes, inconsistência entre sistemas e piora na qualidade dos dados.",
    "seguranca": "Exposição a acessos indevidos, vazamentos e não conformidade regulatória.",
    "privacidade": "Risco de sanções (LGPD), perda de credibilidade e exposição de dados pessoais.",
}

# Funcoes-base ("fundacao"): precisam estar solidas para viabilizar federacao.
_FOUNDATION_KEYS = ["governanca", "seguranca", "qualidade", "operacoes", "arquitetura"]

# Funcoes de maior risco (regulatorio/seguranca): criticidade elevada quando imaturas.
_HIGH_RISK = {"seguranca", "privacidade", "governanca"}


def _foundation_score(scores: dict) -> float | None:
    vals = [scores["by_function"][k]["score"] for k in _FOUNDATION_KEYS
            if scores["by_function"][k]["score"] is not None]
    return round(sum(vals) / len(vals), 2) if vals else None


def _criticidade(score: float, function_key: str = "") -> str:
    if score < 1.8:
        base = "Alta"
    elif score < 2.5:
        base = "Media"
    else:
        base = "Baixa"
    # Para funcoes de alto risco ainda nao consolidadas (< Definido), eleva um nivel.
    if function_key in _HIGH_RISK and score < 3.0:
        order = ["Baixa", "Media", "Alta"]
        base = order[min(2, order.index(base) + 1)]
    return base


def _select_recommendations(function_key: str, current_stage: int) -> list[dict]:
    """Recomendacoes cujo target_stage supera o estagio atual da funcao."""
    block = FUNCTION_SOLUTIONS.get(function_key, {})
    recs = [r for r in block.get("recommendations", []) if r["target_stage"] > current_stage]
    effort_order = {"Simples": 0, "Media": 1, "Complexa": 2}
    recs.sort(key=lambda r: (r["target_stage"], effort_order.get(r["effort"], 1)))
    return recs


def _expand_products(keys: list[str]) -> list[dict]:
    return [{"key": k, "label": DATABRICKS_PRODUCTS.get(k, k)} for k in keys]


def _expand_docs(keys: list[str]) -> list[dict]:
    return [{"key": k, "label": DATABRICKS_PRODUCTS.get(k, k), "url": DATABRICKS_DOCS[k]}
            for k in keys if k in DATABRICKS_DOCS]


_HORIZON_NAME = {2: "Horizonte 1 (0-3m)", 3: "Horizonte 2 (3-9m)", 4: "Horizonte 3 (9+m)"}


def _horizon_name(target_stage: int) -> str:
    return _HORIZON_NAME.get(target_stage, "")


def _quartile_fn(values):
    """Retorna funcao que classifica um valor no quartil 1..4 da distribuicao."""
    import statistics
    vals = [v for v in values if v is not None]
    cuts = None
    if len(vals) >= 2 and len(set(vals)) > 1:
        try:
            cuts = statistics.quantiles(vals, n=4)
        except Exception:
            cuts = None
    mx = max(vals) if vals else 0

    def q(c):
        if cuts:
            return 1 + sum(1 for t in cuts if c > t)
        return max(1, min(4, round(4 * c / mx))) if mx else 1
    return q


_COMPLEX = {"Simples": 1, "Media": 2, "Complexa": 3}
_VALOR_LABEL = {4: "Alto", 3: "Medio", 2: "Medio", 1: "Baixo"}

# ---------------------------------------------------------------------------
# Complexidade CONTINUA (0-10). Em vez de 3 baldes (Simples/Media/Complexa,
# que geravam so 3.3/6.7/10), estima a complexidade de CADA recomendacao a
# partir de sinais quantitativos:
#   - esforco base da acao (Simples/Media/Complexa);
#   - estagio-alvo (capacidades mais avancadas custam mais);
#   - nº de produtos/recursos Databricks envolvidos (mais partes moveis);
#   - nº de dependencias (mais integracao e sequenciamento).
# O score bruto de TODAS as recomendacoes possiveis do catalogo e normalizado
# (min-max) para 0-10 -> baseline estavel. As recomendacoes trazidas no
# assessment usam essa mesma escala 0-10.
# ---------------------------------------------------------------------------
_EFFORT_BASE = {"Simples": 2.0, "Media": 4.5, "Complexa": 7.5}


def _complexity_raw(rec: dict) -> float:
    base = _EFFORT_BASE.get(rec.get("effort"), 4.5)
    stage = (rec.get("target_stage", 2) - 2) * 1.1              # 0.0 / 1.1 / 2.2
    prods = max(min(len(rec.get("products", [])), 5) - 1, 0) * 0.7  # 0 .. 2.8
    deps = min(len(rec.get("depends_on", [])), 4) * 0.8         # 0 .. 3.2
    return base + stage + prods + deps


# Baseline sobre o catalogo INTEIRO (todas as recomendacoes possiveis).
_ALL_RECS = [r for b in FUNCTION_SOLUTIONS.values() for r in b.get("recommendations", [])]
_RAW_ALL = {r["code"]: _complexity_raw(r) for r in _ALL_RECS if r.get("code")}
_RAW_MIN = min(_RAW_ALL.values()) if _RAW_ALL else 0.0
_RAW_MAX = max(_RAW_ALL.values()) if _RAW_ALL else 1.0


def _complexity10(rec: dict) -> float:
    raw = _RAW_ALL.get(rec.get("code"))
    if raw is None:
        raw = _complexity_raw(rec)
    span = (_RAW_MAX - _RAW_MIN) or 1.0
    return round(10 * (raw - _RAW_MIN) / span, 1)


def build_report(responses: list[dict], client_name: str = "") -> dict:
    scores = compute_scores(responses)
    foundation = _foundation_score(scores)
    topo = recommend_topology(scores["global_score"], scores["mesh_readiness"], foundation)

    # ---------------- Pontos de destaque e de atencao ----------------
    strengths = []
    attention = []
    pa_seq = 1
    for fn in FUNCTIONS:
        fkey = fn["key"]
        fs = scores["by_function"][fkey]
        if fs["score"] is None:
            continue
        score = fs["score"]
        current_stage = fs["stage"]["level"]
        if score >= 3.0:
            strengths.append({
                "function": fn["name"],
                "function_key": fkey,
                "score": score,
                "stage": fs["stage"]["name"],
                "text": f"{fn['name']} em estágio '{fs['stage']['name']}' (nota {score:.1f}) - manter e usar como referência para os demais domínios.",
            })
        else:
            recs = _select_recommendations(fkey, current_stage)
            effort_rank = {"Simples": 1, "Media": 2, "Complexa": 3}
            top_recs = recs[:2]
            resolution = "Media"
            if top_recs:
                resolution = max(top_recs, key=lambda r: effort_rank[r["effort"]])["effort"]
            attention.append({
                "id": f"PA{pa_seq:02d}",
                "function": fn["name"],
                "function_key": fkey,
                "score": score,
                "stage": fs["stage"]["name"],
                "criticidade": _criticidade(score, fkey),
                "consequencias": _CONSEQUENCES.get(fkey, ""),
                "resolucao": resolution,
                "recomendacoes_databricks": [
                    {**r, "horizonte": _horizon_name(r["target_stage"]),
                     "products_detail": _expand_products(r["products"]),
                     "docs": _expand_docs(r["products"])} for r in recs
                ],
            })
            pa_seq += 1

    crit_order = {"Alta": 0, "Media": 1, "Baixa": 2}
    attention.sort(key=lambda a: (crit_order[a["criticidade"]], a["score"]))

    # ---------------- Footprint por funcao (client-specific) ----------------
    # "Valor para evolucao" = quantas perguntas DEFICIENTES (nivel < 3) a funcao ajuda a
    # resolver. Client-specific: muda conforme o que o cliente pontuou baixo.
    q_levels = aggregate_question_levels(responses)
    footprint = {}
    for fn in FUNCTIONS:
        fk = fn["key"]
        qs = [{"id": qid, "text": QUESTIONS_BY_ID[qid]["text"], "level": round(lv, 2)}
              for qid, lv in q_levels.items()
              if lv < 3.0 and fk in QUESTIONS_BY_ID[qid].get("functions", [QUESTIONS_BY_ID[qid]["function"]])]
        qs.sort(key=lambda x: x["level"])
        footprint[fk] = qs

    # ---------------- Recomendacoes (uma linha por acao) ----------------
    # Tres eixos: CRITICIDADE (urgencia, por score+risco), VALOR (impacto/quartil) e COMPLEXIDADE (esforco).
    recommendations = []
    for fn in FUNCTIONS:
        fkey = fn["key"]
        fs = scores["by_function"][fkey]
        if fs["score"] is None:
            continue
        recs = _select_recommendations(fkey, fs["stage"]["level"])
        if not recs:
            continue
        crit = _criticidade(fs["score"], fkey)
        for r in recs:
            recommendations.append({
                "horizonte": _horizon_name(r["target_stage"]),
                "target_stage": r["target_stage"],
                "function": fn["name"],
                "function_key": fkey,
                "score": fs["score"],
                "stage": fs["stage"]["name"],
                "criticidade": crit,
                "consequencias": _CONSEQUENCES.get(fkey, ""),
                "effort": r["effort"],
                "complexity": _COMPLEX.get(r["effort"], 2),
                "impact_count": len(footprint[fkey]),
                "impact_questions": footprint[fkey],
                "text": r["text"],
                "rec_id": r["id"],
                "code": r.get("code"),
                "depends_on": list(r.get("depends_on", [])),
                "products_detail": _expand_products(r["products"]),
                "docs": _expand_docs(r["products"]),
            })

    # VALOR para evolucao por QUARTIL do impacto (nº de perguntas deficientes resolvidas).
    _qf = _quartile_fn([x["impact_count"] for x in recommendations])
    for x in recommendations:
        x["quartil"] = _qf(x["impact_count"])
        x["valor"] = _VALOR_LABEL[x["quartil"]]

    # ---------------- Iniciativas (por funcao) para a matriz de priorizacao ----------------
    initiatives = []
    for fn in FUNCTIONS:
        fkey = fn["key"]
        fs = scores["by_function"][fkey]
        if fs["score"] is None:
            continue
        recs = _select_recommendations(fkey, fs["stage"]["level"])
        if not recs:
            continue
        value = len(footprint[fkey])
        next_rec = min(recs, key=lambda r: r["target_stage"])  # complexidade do proximo passo
        complexity = _COMPLEX.get(next_rec["effort"], 2)
        effort_sum = sum(_COMPLEX.get(r["effort"], 2) for r in recs)  # esforco total p/ evoluir
        initiatives.append({"function": fn["name"], "function_key": fkey, "value": value,
                            "complexity": complexity, "effort_sum": effort_sum, "n_recs": len(recs),
                            "criticidade": _criticidade(fs["score"], fkey)})
    _qi = _quartile_fn([i["value"] for i in initiatives])
    _max_v = max([i["value"] for i in initiatives], default=1) or 1
    _max_e = max([i["effort_sum"] for i in initiatives], default=1) or 1
    for i in initiatives:
        i["quartil"] = _qi(i["value"])
        i["valor"] = _VALOR_LABEL[i["quartil"]]
        i["priority_score"] = round(i["value"] / i["complexity"], 2) if i["complexity"] else float(i["value"])
        # Escalas 0-10 para a matriz (valor = nº de perguntas; complexidade = esforço total)
        i["value10"] = round(10 * i["value"] / _max_v, 1)
        i["complexity10"] = round(10 * i["effort_sum"] / _max_e, 1)
    initiatives.sort(key=lambda i: (-i["priority_score"], i["complexity"], -i["value"]))

    # Ordena recomendacoes por PRIORIDADE (quick-wins: mais VALOR por unidade de COMPLEXIDADE).
    _prio = {i["function_key"]: i["priority_score"] for i in initiatives}
    _v10 = {i["function_key"]: i["value10"] for i in initiatives}
    for x in recommendations:
        x["priority_score"] = _prio.get(x["function_key"], 0)
        x["value10"] = _v10.get(x["function_key"], 0)          # valor da funcao (0-10), p/ matriz e tabela
        x["complexity10"] = _complexity10(x)  # complexidade continua da acao (0-10, baseline do catalogo)
    recommendations.sort(key=lambda x: (-x["priority_score"], x["target_stage"], x["complexity"], x["function"]))

    # Pre-requisitos PENDENTES = dependencias que tambem estao no conjunto recomendado (ainda por fazer).
    _rec_codes = {x["code"] for x in recommendations if x.get("code")}
    for x in recommendations:
        x["prereqs"] = [c for c in x.get("depends_on", []) if c in _rec_codes]
    # Reordena respeitando dependencias (A nunca antes de seu pre-requisito B), mantendo a prioridade.
    _placed, _placed_codes, _remaining = [], set(), list(recommendations)
    while _remaining:
        _picked = next((x for x in _remaining if all(c in _placed_codes for c in x["prereqs"])), None)
        if _picked is None:  # ciclo ou nao resolvido: mantem o restante na ordem atual
            _placed.extend(_remaining)
            break
        _placed.append(_picked)
        _placed_codes.add(_picked.get("code"))
        _remaining.remove(_picked)
    recommendations = _placed

    # ---------------- Roadmap por horizontes ----------------
    horizons = {
        2: {"key": "h1", "name": "Horizonte 1 - Fundação", "window": "0 a 3 meses",
            "goal": "Consolidar o lakehouse governado e sair do estágio Reativo.", "items": []},
        3: {"key": "h2", "name": "Horizonte 2 - Padronização", "window": "3 a 9 meses",
            "goal": "Padronizar práticas em várias áreas e habilitar produtos de dados.", "items": []},
        4: {"key": "h3", "name": "Horizonte 3 - Federação", "window": "9+ meses",
            "goal": "Evoluir para governança federada e malha de produtos de dados.", "items": []},
    }
    for fn in FUNCTIONS:
        fkey = fn["key"]
        fs = scores["by_function"][fkey]
        if fs["score"] is None:
            continue
        current_stage = fs["stage"]["level"]
        for r in _select_recommendations(fkey, current_stage):
            horizons[r["target_stage"]]["items"].append({
                "function": fn["name"],
                "function_key": fkey,
                "rec_id": r["id"],
                "target_stage": r["target_stage"],
                "action": r["text"],
                "effort": r["effort"],
                "products": _expand_products(r["products"]),
            })
    # Sempre os 3 horizontes (os sem acoes ficam em branco no relatorio).
    roadmap = [horizons[k] for k in (2, 3, 4)]

    # ---------------- Sumario executivo ----------------
    gstage = scores["global_stage"]
    gscore = scores["global_score"]
    headline = _headline(client_name, gscore, gstage, topo, scores["mesh_readiness"])

    data_products_guidance = _data_products_guidance(topo["current"]["key"])

    # Recursos publicos = docs uteis que aparecem nas recomendacoes do cliente (dedup).
    # Quanto mais maduro (menos lacunas), menos recomendacoes -> menos links.
    _seen_doc, public_refs = set(), []
    for x in recommendations:
        for d in x.get("docs", []):
            if not d.get("url") or d["url"] in _seen_doc:
                continue
            _seen_doc.add(d["url"])
            _lbl = d.get("label", "")
            name = _lbl.split(" - ")[0] if " - " in _lbl else _lbl
            note = _lbl.split(" - ", 1)[1] if " - " in _lbl else ""
            public_refs.append({"label": name, "note": note, "url": d["url"]})
    if not public_refs:
        public_refs = [{"label": "Unity Catalog", "note": "Governança unificada de dados e IA.",
                        "url": DATABRICKS_DOCS["unity_catalog"]}]

    federation = {
        "title": "Federação de dados como ganho rápido de governança",
        "text": (
            "Mesmo com dados ainda fora da plataforma, é possível ampliar a governança "
            "imediatamente: a Lakehouse Federation permite consultar fontes externas (bancos "
            "relacionais, data warehouses) sob a mesma governança do Unity Catalog, sem mover "
            "os dados. É um caminho de baixo esforço para estender catálogo, linhagem e controle "
            "de acesso a dados que ainda não foram migrados."
        ),
        "products": _expand_products(["lakehouse_federation", "unity_catalog"]),
    }

    return {
        "meta": {
            "client_name": client_name,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "coverage": {
                "answered": scores["answered_questions"],
                "total": scores["total_questions"],
                "pct": round(100 * scores["answered_questions"] / scores["total_questions"]) if scores["total_questions"] else 0,
            },
        },
        "executive_summary": {
            "global_score": gscore,
            "global_stage": gstage,
            "mesh_readiness": scores["mesh_readiness"],
            "mesh_readiness_raw": scores.get("mesh_readiness_raw"),
            "cultural_readiness": scores.get("cultural_readiness"),
            "foundation_score": foundation,
            "recommended_topology": topo["current"],
            "next_topology": topo["next"],
            "headline": headline,
        },
        "scores": scores,
        "topology": topo,
        "strengths": strengths,
        "attention_points": attention,
        "recommendations": recommendations,
        "roadmap": roadmap,
        "prioritization": {"initiatives": initiatives},
        "data_products": data_products_guidance,
        "federation": federation,
        "key_messages": KEY_MESSAGES,
        "references": {"public": public_refs, "concept": CONCEPT_REFERENCES},
    }


def _headline(client_name, gscore, gstage, topo, mesh_readiness) -> str:
    if gscore is None:
        return "Assessment ainda sem respostas suficientes para gerar um diagnóstico."
    who = client_name or "A organização"
    cur = topo["current"]
    txt = (
        f"{who} está em estágio de maturidade '{gstage['name']}' (nota global {gscore:.1f} de 4,0). "
        f"Dada essa maturidade, a topologia de Data Mesh recomendada é '{cur['name']}': {cur['tagline']} "
    )
    if topo["next"]:
        txt += f"O próximo passo de evolução é '{topo['next']['name']}'. "
    txt += (
        "Data Mesh é um paradigma que se adota por etapas: as recomendações a seguir mostram como "
        "elevar a maturidade com produtos e soluções Databricks até viabilizar esse modelo."
    )
    return txt


def _data_products_guidance(topology_key: str) -> dict:
    base = {
        "title": "Primeiros produtos de dados",
        "intro": (
            "Um produto de dados é um ativo com owner, contrato, documentação, regras de uso, "
            "qualidade garantida e SLA - descobrível e consumível pelos demais domínios. No "
            "Databricks, materializa-se como tabelas/visões certificadas no Unity Catalog, com "
            "tags, linhagem, metric views e distribuição via Marketplace/Delta Sharing."
        ),
        "checklist": [
            "Owner e steward nomeados (dimensão Pessoas).",
            "Contrato de dados: schema, semântica e garantias (dimensão Processos).",
            "Qualidade monitorada (DLT expectations + Lakehouse Monitoring).",
            "Documentação e descoberta (comentários, tags, catálogo).",
            "SLA de atualização e disponibilidade publicado.",
            "Controle de acesso e classificação aplicados (Unity Catalog / ABAC).",
        ],
    }
    if topology_key == "fundacao":
        base["recommendation"] = (
            "Comece com 1 a 2 produtos de dados-piloto sobre os dados mais confiáveis, dentro de "
            "um catálogo central, para criar referência antes de distribuir a propriedade."
        )
    elif topology_key == "governado":
        base["recommendation"] = (
            "Estabeleça um produto de dados por domínio prioritário, cada um em seu catálogo, "
            "com owner do próprio domínio e apoio do time central."
        )
    elif topology_key == "harmonizado":
        base["recommendation"] = (
            "Cada domínio publica seus produtos de dados no próprio workspace/catálogo e os "
            "compartilha via Delta Sharing; padronize contratos e SLAs pelo hub central."
        )
    else:
        base["recommendation"] = (
            "Trate produtos de dados como padrão operacional: publicação self-service, contratos "
            "versionados e distribuição via Marketplace/Delta Sharing entre domínios e organizações."
        )
    return base
