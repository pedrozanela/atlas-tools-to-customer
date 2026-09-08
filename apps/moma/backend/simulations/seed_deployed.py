"""Semeia o app publicado (lakehouse) com empresas-exemplo, uma por topologia + nota maxima.
Uso: APP_URL=... APP_TOKEN=... python3 -m simulations.seed_deployed"""
from __future__ import annotations
import json, os, random, urllib.request

URL=os.environ["APP_URL"]; TOKEN=os.environ["APP_TOKEN"]
def api(path, method="GET", body=None):
    data=json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(URL+path, data=data, method=method,
        headers={"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json"})
    with urllib.request.urlopen(req, timeout=90) as r: return json.load(r)

fw=api("/api/framework")
QBY={}
for q in fw["questions"]: QBY.setdefault(q["area"],[]).append(q["id"])

TECH=[("lideranca","Patrícia Nunes (CDO)"),("governanca_office","Rafael Gomes (Data Office)"),
      ("plataforma","Bruno Tavares (Eng. de Dados)"),("arquitetura_area","Carla Menezes (Arquitetura)"),
      ("seguranca_area","Diego Alves (Segurança / DPO)")]

def lvl(mean, rng):
    if mean>=9: return 4  # modo "nota maxima"
    return max(1,min(4,round(rng.gauss(mean,0.45))))

def seed(aid, means, biz, seed_n):
    rng=random.Random(seed_n)
    for area,name in TECH:
        ans=[{"question_id":q,"level":lvl(means[area],rng)} for q in QBY[area]]
        api(f"/api/assessments/{aid}/responses","POST",{"area":area,"respondent":name,"answers":ans})
    for bizarea,person in biz:
        ans=[{"question_id":q,"level":lvl(means["dominios"],rng)} for q in QBY["dominios"]]
        api(f"/api/assessments/{aid}/responses","POST",
            {"area":"dominios","respondent":f"{bizarea} - {person}","answers":ans})

M=9.9  # sentinela p/ nota maxima
COMPANIES=[
    ("Cosin Bank",
     {"lideranca":1.4,"governanca_office":1.3,"plataforma":1.3,"arquitetura_area":1.4,"seguranca_area":1.6,"dominios":2.4},
     [("Crédito","Ana Prado"),("Cartões","Marcelo Reis"),("Investimentos","Juliana Costa"),("Seguros","Felipe Aragão"),("Atendimento","Sofia Lima")],11),
    ("Cosin Pay S/A",
     {"lideranca":2.5,"governanca_office":2.3,"plataforma":2.3,"arquitetura_area":2.4,"seguranca_area":2.6,"dominios":2.7},
     [("Emissão","Ana Prado"),("Adquirência","Marcelo Reis"),("PIX/Pagamentos","Juliana Costa"),("Antifraude","Felipe Aragão"),("Atendimento","Sofia Lima")],21),
    ("Cosin Varejo S.A.",
     {"lideranca":3.1,"governanca_office":3.0,"plataforma":3.0,"arquitetura_area":3.0,"seguranca_area":3.1,"dominios":3.2},
     [("Vendas","Paulo Freitas"),("Marketing","Renata Dias"),("Logística","Caio Nogueira"),("Financeiro","Beatriz Rocha"),("E-commerce","Thiago Melo")],32),
    ("Cosin Seguros S.A.",
     {"lideranca":3.6,"governanca_office":3.6,"plataforma":3.7,"arquitetura_area":3.6,"seguranca_area":3.7,"dominios":3.7},
     [("Sinistros","Larissa Pinto"),("Atuária","Gustavo Ramos"),("Subscrição","Helena Castro"),("Investimentos","Rodrigo Sá"),("Clientes","Marina Lopes")],43),
    ("Cosin Max S.A. (nota máxima)",
     {"lideranca":M,"governanca_office":M,"plataforma":M,"arquitetura_area":M,"seguranca_area":M,"dominios":M},
     [("Varejo","Rep 1"),("Crédito","Rep 2"),("Investimentos","Rep 3"),("Seguros","Rep 4"),("Operações","Rep 5")],55),
]

for name,means,biz,sd in COMPANIES:
    a=api("/api/assessments","POST",{"client_name":name}); aid=a["id"]
    seed(aid,means,biz,sd)
    r=api(f"/api/assessments/{aid}/report"); e=r["executive_summary"]
    print(f"{name:32} {aid} | global {e['global_score']} | {e['recommended_topology']['name']}")
print("RESEED OK")
