"""
Modelo de topologias de Data Mesh no Databricks.

Premissa central: Data Mesh nao e um formato unico. E um espectro que vai de mais
centralizado (menos workspaces, menor autonomia, controle central) ate mais federado
(mais workspaces, maior autonomia dos dominios, governanca computacional). A topologia
recomendada depende da MATURIDADE aferida: forcar um mesh federado em uma organizacao
imatura gera caos; manter tudo centralizado em uma organizacao madura vira gargalo.

Cada topologia e ancorada em produtos e recursos concretos do Databricks.
"""

from __future__ import annotations

# Espectro de topologias, do mais centralizado ao mais federado.
TOPOLOGIES = [
    {
        "key": "fundacao",
        "name": "Modelo Centralizado (Fundação)",
        "position": 1,
        "score_range": [1.0, 2.0],
        "tagline": "Ainda não é hora de Data Mesh. Primeiro, construir a fundação.",
        "central_control": "Alto",
        "autonomy": "Baixa",
        "workspaces": "1 a 2 workspaces (dev/prod), operados por um time central.",
        "governance": "1 metastore Unity Catalog central; catálogos por ambiente ou por assunto; time de plataforma único define tudo.",
        "sharing": "Compartilhamento interno via permissões no Unity Catalog; Delta Sharing ainda não necessário.",
        "description": (
            "A organização ainda tem silos, baixa governança e pouca cultura de dados. "
            "Distribuir a propriedade agora amplifica o caos. O objetivo é consolidar os "
            "dados em um lakehouse governado, estabelecer o Unity Catalog como ponto único "
            "de governança e criar as primeiras políticas, papéis e pipelines confiáveis."
        ),
        "databricks_setup": [
            "Unity Catalog como metastore único de governança (catálogo, controle de acesso, linhagem).",
            "Arquitetura medallion (bronze/silver/gold) com Delta Lake.",
            "Lakeflow Declarative Pipelines (DLT) para ingestão/transformação confiáveis.",
            "Lakehouse Federation para consultar fontes externas sem mover dados (amplia a governança desde já).",
            "Catálogo único como fonte de descoberta; tags e comentários (inclusive gerados por IA).",
        ],
        "risk_if_forced": (
            "Distribuir domínios e workspaces sem governança central resulta em novos silos, "
            "duplicação de dados e perda de controle de acesso e custo."
        ),
    },
    {
        "key": "governado",
        "name": "Modelo Coordenado (hub central com domínios lógicos)",
        "position": 2,
        "score_range": [2.0, 2.7],
        "tagline": "Domínios lógicos sobre plataforma central. A autonomia começa a nascer.",
        "central_control": "Médio-alto",
        "autonomy": "Baixa-média",
        "workspaces": "Poucos workspaces (ex.: por ambiente); domínios existem como catálogos, não como workspaces separados.",
        "governance": "1 metastore Unity Catalog; um catálogo por domínio de dados; time central de plataforma com apoio dos primeiros stewards de domínio.",
        "sharing": "Compartilhamento entre domínios via grants no Unity Catalog; início de produtos de dados certificados.",
        "description": (
            "A fundação existe. Agora os domínios de negócio passam a ser representados como "
            "catálogos no Unity Catalog, com owners e stewards nomeados, mas ainda apoiados de "
            "perto pelo time central. Começa a noção de dados como produto: os primeiros "
            "conjuntos são documentados, certificados e disponibilizados para consumo."
        ),
        "databricks_setup": [
            "Um catálogo do Unity Catalog por domínio de dados, com owners/stewards nomeados.",
            "Primeiros produtos de dados: tabelas certificadas, com tags, comentários e contratos simples.",
            "Lakehouse Monitoring e expectativas (DLT) para qualidade dos dados críticos.",
            "System tables para observabilidade de uso e custo por catálogo/domínio.",
            "Databricks Marketplace/Discovery interno para descoberta dos produtos de dados.",
        ],
        "risk_if_forced": (
            "Dar workspaces e infraestrutura totalmente independentes a domínios ainda pouco "
            "maduros gera divergência de padrões e retrabalho de governança."
        ),
    },
    {
        "key": "harmonizado",
        "name": "Modelo Hub-and-Spoke (domínios com workspace próprio)",
        "position": 3,
        "score_range": [2.7, 3.4],
        "tagline": "Domínios com workspace próprio e padrões centrais fortes.",
        "central_control": "Médio (padrões centrais, execução distribuída)",
        "autonomy": "Média-alta",
        "workspaces": "Um workspace por domínio (spoke) sobre um hub central de governança; ambientes dev/prod por domínio.",
        "governance": "Unity Catalog central (1 metastore por região); catálogo(s) por domínio; governança federada: padrões globais definidos pelo hub, execução pelos domínios.",
        "sharing": "Delta Sharing e grants cross-catalog para troca de produtos de dados entre domínios sem cópia.",
        "description": (
            "Os domínios já têm maturidade para operar seus próprios ambientes. Adota-se um "
            "modelo hub-and-spoke: o hub central define padrões de segurança, qualidade e "
            "interoperabilidade (governança federada), enquanto cada domínio (spoke) tem "
            "autonomia para criar e operar seus produtos de dados. Produtos são a unidade de "
            "troca entre domínios."
        ),
        "databricks_setup": [
            "Topologia de workspaces por domínio (spokes) sobre metastore Unity Catalog central (hub).",
            "Governança federada: políticas de acesso baseadas em atributos (ABAC), tags e mascaramento aplicados por padrão.",
            "Delta Sharing para compartilhar produtos de dados entre domínios (e parceiros) sem duplicar.",
            "Contratos de dados e SLAs por produto; certificação e metric views para métricas consistentes.",
            "CI/CD (Databricks Asset Bundles) para pipelines e infraestrutura self-service por domínio.",
        ],
        "risk_if_forced": (
            "Sem padrões centrais fortes (o 'hub'), a autonomia dos spokes degenera em silos "
            "novamente; a governança federada é o que evita isso."
        ),
    },
    {
        "key": "federado",
        "name": "Modelo Descentralizado (domínios autônomos)",
        "position": 4,
        "score_range": [3.4, 4.0],
        "tagline": "Máxima autonomia dos domínios com governança computacional federada.",
        "central_control": "Baixo-médio (governança automatizada, não manual)",
        "autonomy": "Alta",
        "workspaces": "Múltiplos workspaces por domínio (e até metastores por região/BU quando necessário), provisionados via self-service.",
        "governance": "Governança computacional federada: padrões globais aplicados automaticamente via Unity Catalog (ABAC, tags, policies), com autonomia local plena.",
        "sharing": "Delta Sharing e Marketplace como padrão para troca de produtos de dados entre domínios, BUs, parceiros e até entre nuvens.",
        "description": (
            "A organização tem alta maturidade em pessoas, processos e tecnologia. Os quatro "
            "princípios de Data Mesh estão presentes: domínios são donos plenos de seus dados "
            "como produtos, a plataforma é verdadeiramente self-service e a governança é "
            "federada e computacional (aplicada por código/política, não por chamado). O papel "
            "central migra de 'executar' para 'habilitar e definir padrões globais'."
        ),
        "databricks_setup": [
            "Self-service completo: domínios provisionam workspaces, catálogos e pipelines governados sob demanda (DABs/IaC).",
            "Governança computacional federada no Unity Catalog: ABAC, tags, mascaramento e policies globais aplicadas automaticamente.",
            "Delta Sharing + Databricks Marketplace como malha de produtos de dados entre domínios, BUs e organizações.",
            "Clean Rooms para colaboração sobre dados sensíveis entre domínios/parceiros.",
            "FinOps por domínio/produto via system tables; custo e valor atribuídos a cada produto de dado.",
        ],
        "risk_if_forced": (
            "Este modelo exige maturidade real; adotado cedo demais, a autonomia sem cultura e "
            "sem governança automatizada leva a fragmentação e risco de conformidade."
        ),
    },
]

TOPOLOGIES_BY_KEY = {t["key"]: t for t in TOPOLOGIES}

# "delta": o que esta etapa tem A MAIS que a anterior (bullets), para o modal.
_DELTA_PT = {
    "fundacao": ["Ponto de partida: consolidar e governar os dados antes de distribuir a propriedade."],
    "governado": [
        "Domínios ganham identidade: 1 catálogo por domínio, com owners e stewards nomeados.",
        "Surgem os primeiros produtos de dados certificados.",
        "Qualidade e observabilidade começam a ser medidas por domínio.",
    ],
    "harmonizado": [
        "Cada domínio ganha seu próprio workspace (antes eram só catálogos lógicos).",
        "Governança federada: o hub define os padrões; os domínios executam com autonomia.",
        "Delta Sharing troca produtos entre domínios sem cópia.",
    ],
    "federado": [
        "Autonomia plena: cada domínio pode ter seus próprios workspaces (e até metastores) e seu setup.",
        "Governança 100% computacional (aplicada por código/política, não por chamado).",
        "Marketplace + Delta Sharing como malha de produtos entre domínios, BUs e organizações.",
        "O papel do time central migra de 'executar' para 'habilitar e definir padrões globais'.",
    ],
}
for _t in TOPOLOGIES:
    _t["delta"] = _DELTA_PT.get(_t["key"], [])


def recommend_topology(global_score: float | None, mesh_readiness: float | None,
                       foundation_score: float | None = None) -> dict:
    """
    Recomenda a topologia de Data Mesh dada a maturidade.

    Filosofia (boas praticas de maturidade DAMA-DMBOK/DCAM): a maturidade
    GERAL e a base para viabilizar o modelo, e a prontidao especifica para mesh e um
    sinal secundario. Alem disso, a topologia e LIMITADA pela fundacao (governanca,
    seguranca, qualidade, operacoes, arquitetura): nao se federa alem do que a base
    sustenta, por maior que seja a vontade dos dominios de assumir autonomia.
    """
    if global_score is None:
        # Sem dados suficientes: recomenda comecar pela fundacao.
        base = 1.0
    elif mesh_readiness is None:
        base = global_score
    else:
        base = 0.55 * global_score + 0.45 * mesh_readiness

    # Teto pela fundacao: a topologia nao pode ultrapassar a maturidade da base + 0,5.
    if foundation_score is not None:
        base = min(base, foundation_score + 0.5)

    chosen = TOPOLOGIES[0]
    for t in TOPOLOGIES:
        lo, hi = t["score_range"]
        # A ultima faixa e inclusiva no topo.
        if lo <= base < hi or (t["position"] == 4 and base >= lo):
            chosen = t
            break

    # Proxima topologia (destino de evolucao), se houver.
    nxt = None
    if chosen["position"] < len(TOPOLOGIES):
        nxt = TOPOLOGIES_BY_KEY[
            next(t["key"] for t in TOPOLOGIES if t["position"] == chosen["position"] + 1)
        ]

    return {
        "index": round(base, 2),
        "current": chosen,
        "next": nxt,
        "spectrum": TOPOLOGIES,
    }
