"""
Simulacao de 3 cenarios (baixa, media e alta maturidade).

Preenche o assessment como se TODAS as areas tivessem respondido, gera o relatorio
final para cada cenario e salva um resumo em texto + o JSON completo. Serve tanto como
validacao do motor quanto como material de demonstracao para os SAs.

Uso:  cd app && python -m simulations.simulate
"""

from __future__ import annotations

import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server.domain.framework import AREAS  # noqa: E402
from server.domain.questions import QUESTIONS, questions_for_area  # noqa: E402
from server.domain.report import build_report  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
os.makedirs(OUT_DIR, exist_ok=True)


def _biased_level(target_mean: float, rng: random.Random) -> int:
    """Sorteia um nivel 1-4 em torno de uma media alvo, com dispersao realista."""
    val = rng.gauss(target_mean, 0.7)
    return max(1, min(4, round(val)))


# Perfis por cenario. Alguns cenarios tem funcoes mais fortes/fracas para realismo.
SCENARIOS = {
    "baixa": {
        "label": "Baixa maturidade",
        "client": "Cliente Alfa (baixa maturidade)",
        "base_mean": 1.3,
        # ajustes por dimensao para dar textura (ex.: tecnologia um pouco a frente de processos)
        "dimension_bias": {"pessoas": -0.1, "processos": -0.2, "tecnologia": 0.2},
    },
    "media": {
        "label": "Media maturidade",
        "client": "Cliente Beta (media maturidade)",
        "base_mean": 2.3,
        "dimension_bias": {"pessoas": -0.2, "processos": 0.0, "tecnologia": 0.3},
    },
    "alta": {
        "label": "Alta maturidade",
        "client": "Cliente Gama (alta maturidade)",
        "base_mean": 3.5,
        "dimension_bias": {"pessoas": -0.1, "processos": 0.1, "tecnologia": 0.1},
    },
}

# Multiplos respondentes por area para exercitar a promediacao (algumas areas 2 respondentes).
RESPONDENTS_PER_AREA = {a["key"]: (2 if i % 2 == 0 else 1) for i, a in enumerate(AREAS)}


# Seeds fixas por cenario -> simulacoes reprodutiveis (independe do PYTHONHASHSEED).
_SEEDS = {"baixa": 101, "media": 202, "alta": 303}


def generate_responses(scenario_key: str, seed: int = None) -> list[dict]:
    cfg = SCENARIOS[scenario_key]
    rng = random.Random(seed if seed is not None else _SEEDS[scenario_key])
    responses = []
    for area in AREAS:
        n_resp = RESPONDENTS_PER_AREA[area["key"]]
        for r in range(n_resp):
            for q in questions_for_area(area["key"]):
                bias = cfg["dimension_bias"].get(q["dimension"], 0.0)
                target = cfg["base_mean"] + bias
                # ~8% de "nao sei" para realismo
                if rng.random() < 0.08:
                    level = None
                else:
                    level = _biased_level(target, rng)
                responses.append({
                    "area": area["key"],
                    "respondent": f"{area['key']}_{r+1}",
                    "question_id": q["id"],
                    "level": level,
                })
    return responses


def summarize(report: dict) -> str:
    es = report["executive_summary"]
    lines = []
    lines.append("=" * 78)
    lines.append(f"CLIENTE: {report['meta']['client_name']}")
    lines.append(f"Cobertura: {report['meta']['coverage']['answered']}/{report['meta']['coverage']['total']} questoes ({report['meta']['coverage']['pct']}%)")
    lines.append("-" * 78)
    lines.append(f"NOTA GLOBAL: {es['global_score']} / 4.0  ->  Estagio: {es['global_stage']['name']}")
    lines.append(f"Prontidao para Data Mesh (media dos 4 principios): {es['mesh_readiness']}")
    lines.append(f"TOPOLOGIA RECOMENDADA: {es['recommended_topology']['name']}")
    if es["next_topology"]:
        lines.append(f"Proxima topologia (evolucao): {es['next_topology']['name']}")
    lines.append("")
    lines.append("HEADLINE:")
    lines.append("  " + es["headline"])
    lines.append("")
    lines.append("NOTAS POR FUNCAO DE DADOS:")
    for fkey, fs in report["scores"]["by_function"].items():
        st = fs["stage"]["name"] if fs["stage"] else "-"
        lines.append(f"  - {fs['name']:<38} {str(fs['score']):>5}  ({st})")
    lines.append("")
    lines.append("NOTAS POR DIMENSAO:")
    for dkey, ds in report["scores"]["by_dimension"].items():
        st = ds["stage"]["name"] if ds["stage"] else "-"
        lines.append(f"  - {ds['name']:<14} {str(ds['score']):>5}  ({st})")
    lines.append("")
    lines.append("NOTAS POR PRINCIPIO DE DATA MESH:")
    for pkey, ps in report["scores"]["by_principle"].items():
        st = ps["stage"]["name"] if ps["stage"] else "-"
        lines.append(f"  - {ps['name']:<38} {str(ps['score']):>5}  ({st})")
    lines.append("")
    lines.append(f"PONTOS DE DESTAQUE: {len(report['strengths'])}")
    for s in report["strengths"]:
        lines.append(f"  + {s['text']}")
    lines.append("")
    lines.append(f"PONTOS DE ATENCAO: {len(report['attention_points'])}")
    for a in report["attention_points"]:
        lines.append(f"  [{a['id']}] {a['function']} | nota {a['score']} | criticidade {a['criticidade']} | resolucao {a['resolucao']}")
        lines.append(f"       Consequencias: {a['consequencias']}")
        for rec in a["recomendacoes_databricks"][:2]:
            prods = ", ".join(p["key"] for p in rec["products_detail"])
            lines.append(f"       -> [{rec['effort']}] {rec['text']}  ({prods})")
    lines.append("")
    lines.append("ROADMAP:")
    for h in report["roadmap"]:
        lines.append(f"  {h['name']} ({h['window']}) - {h['goal']}  [{len(h['items'])} acoes]")
    lines.append("=" * 78)
    lines.append("")
    return "\n".join(lines)


def main():
    all_summaries = []
    for key, cfg in SCENARIOS.items():
        responses = generate_responses(key)
        report = build_report(responses, client_name=cfg["client"])
        # salva JSON completo
        with open(os.path.join(OUT_DIR, f"report_{key}.json"), "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        summary = summarize(report)
        all_summaries.append(summary)
        with open(os.path.join(OUT_DIR, f"resumo_{key}.txt"), "w", encoding="utf-8") as f:
            f.write(summary)
        print(summary)

    with open(os.path.join(OUT_DIR, "resumo_todos.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(all_summaries))


if __name__ == "__main__":
    main()
