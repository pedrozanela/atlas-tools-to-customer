"""Semeia o banco local (SQLite) com os 3 cenarios simulados, via a camada store.
Uso: cd app && python -m simulations.seed_local"""
from __future__ import annotations

import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import store  # noqa: E402
from simulations.simulate import SCENARIOS, generate_responses  # noqa: E402


def main():
    store.init_db()
    for key, cfg in SCENARIOS.items():
        a = store.create_assessment(cfg["client"])
        aid = a["id"]
        responses = generate_responses(key)
        # agrupa por (area, respondent)
        grouped = defaultdict(list)
        for r in responses:
            grouped[(r["area"], r["respondent"])].append(
                {"question_id": r["question_id"], "level": r["level"]})
        for (area, respondent), answers in grouped.items():
            store.save_responses(aid, area, respondent, answers)
        print(f"[{key}] {cfg['client']} -> {aid}")


if __name__ == "__main__":
    main()
