"""
Localizacao (PT fonte; EN e ES via override por ID estavel).

- localize_framework(fw, lang): traduz o payload de /framework.
- localize_report(report, lang): traduz o relatorio.

Valores "de maquina" (criticidade Alta/Media/Baixa, esforco Simples/Media/Complexa, keys)
sao mantidos em PT de proposito: servem de chave estavel e sao traduzidos apenas para
exibicao no frontend (classes CSS dependem deles).
"""

from __future__ import annotations

import copy
import math

from . import i18n_content as C
from . import i18n_questions as Q

LANGS = [("pt", "Português"), ("en", "English"), ("es", "Español")]
_SUPPORTED = {"en", "es"}


def _supported(lang):
    return lang in _SUPPORTED


def _level_from_score(score):
    if score is None:
        return None
    return min(4, max(1, int(math.floor(score + 0.5))))


def _loc_stage(stage, lang):
    """Traduz um objeto de estagio {level,name,short,description,key}."""
    if not stage:
        return stage
    tr = C.LEVELS[lang].get(stage["level"])
    if tr:
        stage = dict(stage)
        stage["name"] = tr["name"]
        stage["short"] = tr["short"]
        stage["description"] = tr["description"]
    return stage


def _fmt_score(score, lang):
    if score is None:
        return "-"
    s = f"{score:.1f}"
    return s if lang == "en" else s.replace(".", ",")


# ------------------------------------------------------------------ #
def localize_framework(fw, lang):
    if not _supported(lang):
        return fw
    fw = copy.deepcopy(fw)
    for lv in fw.get("maturity_levels", []):
        tr = C.LEVELS[lang].get(lv["level"])
        if tr:
            lv.update({k: tr[k] for k in ("name", "short", "description")})
    for d in fw.get("dimensions", []):
        tr = C.DIMENSIONS[lang].get(d["key"])
        if tr:
            d.update(tr)
    for d in fw.get("maturity_dimensions", []):  # 6 dimensoes operacionais
        tr = C.DIMENSIONS[lang].get(d["key"])
        if tr:
            d["name"] = tr["name"]
            if tr.get("description"):
                d["description"] = tr["description"]
    for f in fw.get("functions", []):
        tr = C.FUNCTIONS[lang].get(f["key"])
        if tr:
            f["name"], f["description"] = tr["name"], tr["description"]
    for p in fw.get("mesh_principles", []):
        tr = C.PRINCIPLES[lang].get(p["key"])
        if tr:
            p["name"], p["description"] = tr["name"], tr["description"]
    for a in fw.get("areas", []):
        tr = C.AREAS[lang].get(a["key"])
        if tr:
            a["name"], a["description"] = tr["name"], tr["description"]
            if "subarea_label" in tr:
                a["subarea_label"] = tr["subarea_label"]
    for q in fw.get("questions", []):
        tq = Q.QUESTIONS[lang].get(q["id"])
        if tq:
            q["text"] = tq["text"]
            for i, opt in enumerate(q["options"]):
                if i < len(tq["options"]):
                    opt["text"] = tq["options"][i]
    for t in fw.get("topologies", []):
        _loc_topology(t, lang)
    fw["key_messages"] = copy.deepcopy(C.KEY_MESSAGES[lang])
    _loc_refs(fw.get("references", {}), lang)
    return fw


def _loc_topology(t, lang):
    tr = C.TOPOLOGIES[lang].get(t["key"])
    if tr:
        for k, v in tr.items():
            t[k] = copy.deepcopy(v)
    delta = C.TOPO_DELTA.get(lang, {}).get(t["key"])
    if delta is not None:
        t["delta"] = list(delta)
    return t


def _loc_refs(refs, lang):
    notes = C.REF_NOTES[lang]
    for group in ("internal", "public", "concept"):
        for r in refs.get(group, []) or []:
            if r.get("url") in notes:
                r["note"] = notes[r["url"]]


def _loc_products(items, lang):
    pr = C.PRODUCTS[lang]
    for it in items or []:
        if it.get("key") in pr:
            it["label"] = pr[it["key"]]


# ------------------------------------------------------------------ #
def localize_report(rep, lang):
    if not _supported(lang):
        return rep
    rep = copy.deepcopy(rep)
    FN = C.FUNCTIONS[lang]
    DIM = C.DIMENSIONS[lang]
    PR = C.PRINCIPLES[lang]

    scores = rep.get("scores", {})
    for k, fs in scores.get("by_function", {}).items():
        if k in FN:
            fs["name"] = FN[k]["name"]
        fs["stage"] = _loc_stage(fs.get("stage"), lang)
    for k, ds in scores.get("by_dimension", {}).items():
        if k in DIM:
            ds["name"] = DIM[k]["name"]
        ds["stage"] = _loc_stage(ds.get("stage"), lang)
    for k, ms in scores.get("by_maturity", {}).items():  # 6 dimensoes operacionais (radar)
        if k in DIM:
            ms["name"] = DIM[k]["name"]
        ms["stage"] = _loc_stage(ms.get("stage"), lang)
    for k, ps in scores.get("by_principle", {}).items():
        if k in PR:
            ps["name"] = PR[k]["name"]
        ps["stage"] = _loc_stage(ps.get("stage"), lang)

    es = rep.get("executive_summary", {})
    es["global_stage"] = _loc_stage(es.get("global_stage"), lang)
    if es.get("recommended_topology"):
        _loc_topology(es["recommended_topology"], lang)
    if es.get("next_topology"):
        _loc_topology(es["next_topology"], lang)
    es["headline"] = _headline(rep, lang)

    topo = rep.get("topology", {})
    if topo.get("current"):
        _loc_topology(topo["current"], lang)
    if topo.get("next"):
        _loc_topology(topo["next"], lang)
    for t in topo.get("spectrum", []) or []:
        _loc_topology(t, lang)

    # strengths -> regenera texto
    for s in rep.get("strengths", []) or []:
        fk = s.get("function_key")
        s["function"] = FN.get(fk, {}).get("name", s.get("function"))
        lvl = _level_from_score(s.get("score"))
        stage_name = C.LEVELS[lang].get(lvl, {}).get("name", s.get("stage"))
        s["stage"] = stage_name
        s["text"] = C.STRENGTH[lang].format(function=s["function"], stage=stage_name,
                                            score=_fmt_score(s.get("score"), lang))

    # recommendations (lista achatada usada pelo frontend)
    for rec in rep.get("recommendations", []) or []:
        fk = rec.get("function_key")
        rec["function"] = FN.get(fk, {}).get("name", rec.get("function"))
        rec["stage"] = _loc_stage({"level": _level_from_score(rec.get("score"))}, lang).get("name", rec.get("stage")) if rec.get("score") is not None else rec.get("stage")
        rec["consequencias"] = C.CONSEQUENCES[lang].get(fk, rec.get("consequencias"))
        if rec.get("rec_id") in C.RECS[lang]:
            rec["text"] = C.RECS[lang][rec["rec_id"]]
        if rec.get("target_stage") in C.HORIZON[lang]:
            rec["horizonte"] = C.HORIZON[lang][rec["target_stage"]]
        _loc_products(rec.get("products_detail"), lang)
        _loc_products(rec.get("docs"), lang)

    # roadmap
    stage_by_key = {"h1": 2, "h2": 3, "h3": 4}
    for h in rep.get("roadmap", []) or []:
        st = stage_by_key.get(h.get("key"))
        meta = C.ROADMAP_META[lang].get(st)
        if meta:
            h.update(meta)
        for it in h.get("items", []) or []:
            fk = it.get("function_key")
            it["function"] = FN.get(fk, {}).get("name", it.get("function"))
            if it.get("rec_id") in C.RECS[lang]:
                it["action"] = C.RECS[lang][it["rec_id"]]
            _loc_products(it.get("products"), lang)

    # data products
    dp = rep.get("data_products", {})
    tdp = C.DATA_PRODUCTS[lang]
    dp["title"] = tdp["title"]
    dp["intro"] = tdp["intro"]
    dp["checklist"] = list(tdp["checklist"])
    topo_key = (rep.get("executive_summary", {}).get("recommended_topology") or {}).get("key")
    if topo_key in tdp["rec"]:
        dp["recommendation"] = tdp["rec"][topo_key]

    # federation
    fed = rep.get("federation", {})
    fed["title"] = C.FEDERATION[lang]["title"]
    fed["text"] = C.FEDERATION[lang]["text"]
    _loc_products(fed.get("products"), lang)

    rep["key_messages"] = copy.deepcopy(C.KEY_MESSAGES[lang])
    _loc_refs(rep.get("references", {}), lang)
    return rep


def _headline(rep, lang):
    es = rep.get("executive_summary", {})
    if es.get("global_score") is None:
        return C.HEADLINE_EMPTY[lang]
    who = rep.get("meta", {}).get("client_name") or C.HEADLINE_WHO[lang]
    cur = es.get("recommended_topology", {})
    nxt = ""
    if es.get("next_topology"):
        nxt = C.HEADLINE_NEXT[lang].format(next=es["next_topology"].get("name", ""))
    return C.HEADLINE[lang].format(
        who=who, stage=(es.get("global_stage") or {}).get("name", ""),
        score=_fmt_score(es.get("global_score"), lang),
        topo=cur.get("name", ""), tagline=cur.get("tagline", ""), nxt=nxt)


def localize_operating_model(pm, lang):
    """Traduz o payload do modelo operacional (stages, areas, funcoes, papeis, RACI) por chave."""
    if not _supported(lang):
        return pm
    T = getattr(C, "OPMODEL", {}).get(lang)
    if not T:
        return pm
    pm = copy.deepcopy(pm)
    st, raci, act = T.get("stages", {}), T.get("raci", {}), T.get("actors", {})
    teams, areas, fns, roles = T.get("teams", {}), T.get("areas", {}), T.get("functions", {}), T.get("roles", {})

    def _tr_role(obj, key):
        r = roles.get(key)
        if r:
            obj["name"] = r.get("name", obj.get("name"))
            if "synonyms" in r:
                obj["synonyms"] = r["synonyms"]
            if r.get("description") is not None and "description" in obj:
                obj["description"] = r["description"]

    def _tr_fn(fn):
        f = fns.get(fn.get("key"))
        if f:
            fn["name"] = f.get("name", fn.get("name"))
            fn["description"] = f.get("description", fn.get("description"))

    def _tr_area(a, incl_staffing=True):
        atr = areas.get(a.get("key") or a.get("area"))
        if atr:
            if "name" in a:
                a["name"] = atr.get("name", a["name"])
            if "area_name" in a:
                a["area_name"] = atr.get("name", a["area_name"])
            if "synonyms" in a:
                a["synonyms"] = atr.get("synonyms", a["synonyms"])
            if "description" in a:
                a["description"] = atr.get("description", a["description"])
            if incl_staffing and a.get("staffing_by_stage") and "staffing" in atr:
                for k, v in atr["staffing"].items():
                    a["staffing_by_stage"][k] = v
        for fn in a.get("functions", []) or []:
            _tr_fn(fn)

    for r in pm.get("raci_roles", []):
        tr = raci.get(r.get("key"))
        if tr:
            r["name"], r["description"] = tr.get("name", r["name"]), tr.get("description", r.get("description"))
    for s in pm.get("stages", []):
        if s.get("key") in st:
            s["name"] = st[s["key"]]
    for a in pm.get("extra_actors", []):
        tr = act.get(a.get("key"))
        if tr:
            a["name"] = tr.get("name", a["name"])
            if "synonyms" in tr:
                a["synonyms"] = tr["synonyms"]
    for a in pm.get("areas", []):
        _tr_area(a)
    for g in pm.get("roles_glossary", []):
        _tr_role(g, g.get("key"))
    for sm in pm.get("stage_models", []):
        if sm.get("key") in st:
            sm["name"] = st[sm["key"]]
        m = sm.get("matrix", {})
        for r in m.get("roles", []):
            _tr_role(r, r.get("key"))
        for tm in m.get("teams", []):
            if tm.get("name") in teams:
                tm["name"] = teams[tm["name"]]
        for grp in m.get("groups", []):
            _tr_area(grp, incl_staffing=False)
    return pm
