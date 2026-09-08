"""Cria UM assessment demo que cai em Hub-and-Spoke (harmonizado, ~3.0).
Uso: cd app && UC_CATALOG=... UC_SCHEMA=... WAREHOUSE_ID=... DATABRICKS_PROFILE=... python3 simulations/seed_hubspoke.py"""
from __future__ import annotations
import os, sys, random
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import store
from server.domain.framework import AREAS
from server.domain.questions import questions_for_area
from server.domain.report import build_report

MEAN = {"lideranca": 3.0, "governanca_office": 3.0, "plataforma": 3.05, "arquitetura_area": 3.0,
        "seguranca_area": 3.1, "ciencia_ia": 3.0, "dominios": 3.15}
rng = random.Random(3210)

def gen():
    grouped = defaultdict(list)
    for area in AREAS:
        m = MEAN.get(area["key"], 3.0)
        for q in questions_for_area(area["key"]):
            lvl = None if rng.random() < 0.06 else max(1, min(4, round(rng.gauss(m, 0.5))))
            grouped[(area["key"], area["key"] + "_1")].append({"question_id": q["id"], "level": lvl})
    return grouped

store.init_db()
grouped = gen()
# valida topologia antes de gravar
flat = [{"area": a, "respondent": r, "question_id": x["question_id"], "level": x["level"]}
        for (a, r), ans in grouped.items() for x in ans]
rep = build_report(flat, client_name="Cliente Delta (Hub-and-Spoke)")
print("topologia:", rep["executive_summary"]["recommended_topology"]["name"], "| global:", rep["executive_summary"]["global_score"])
a = store.create_assessment("Cliente Delta (Hub-and-Spoke)")
aid = a["id"]
for (area, resp), ans in grouped.items():
    store.save_responses(aid, area, resp, ans)
print("criado assessment:", aid)
