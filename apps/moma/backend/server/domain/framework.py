"""
Framework de avaliacao de maturidade em Gestao de Dados e prontidao para Data Mesh.

Base metodologica: DAMA-DMBOK (9 funcoes de dados x 3 dimensoes: Pessoas, Processos,
Tecnologia), escala de maturidade em 4 estagios (Reativo, Inicial, Definido, Otimizado),
sempre direcionada a produtos e solucoes Databricks e conectada aos 4 principios de Data Mesh.

Este modulo e a "fonte da verdade": e consumido pelo motor de scoring, pelo gerador de
relatorio e serializado como JSON para o frontend.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Escala de maturidade (1 a 4) - base DAMA-DMBOK
# ---------------------------------------------------------------------------

MATURITY_LEVELS = [
    {
        "level": 1,
        "key": "reativo",
        "name": "Reativo",
        "short": "Ad-hoc",
        "description": (
            "Práticas de gestão e governança desconhecidas ou realizadas de forma "
            "eventual. Necessidades identificadas, mas não adotadas. Dados em silos, "
            "ações reativas e dependentes de esforço individual."
        ),
    },
    {
        "level": 2,
        "key": "inicial",
        "name": "Inicial",
        "short": "Em estruturação",
        "description": (
            "Necessidades mapeadas e em estágio inicial de uso. Práticas adotadas em "
            "poucas unidades de negócio. Poucos conceitos de dados corporativos são "
            "acompanhados de forma consistente."
        ),
    },
    {
        "level": 3,
        "key": "definido",
        "name": "Definido",
        "short": "Padronizado",
        "description": (
            "Práticas adotadas em várias unidades de negócio. Processos de governança "
            "mapeados e padronizados, porém ainda com monitoramento parcial. A maioria "
            "dos conceitos de dados corporativos é acompanhada."
        ),
    },
    {
        "level": 4,
        "key": "coordenado",
        "name": "Otimizado",
        "short": "Otimizado",
        "description": (
            "Práticas adotadas de forma corporativa. Processos conhecidos por todos os "
            "envolvidos e monitorados continuamente. Governança federada e automatizada; "
            "todos os conceitos de dados corporativos são acompanhados."
        ),
    },
]

# ---------------------------------------------------------------------------
# Dimensoes (Pessoas, Processos, Tecnologia)
# ---------------------------------------------------------------------------

DIMENSIONS = [
    {
        "key": "pessoas",
        "name": "Pessoas",
        "description": (
            "Papéis e responsabilidades ligados à gestão e governança de dados, "
            "identificação de owners, stewards e patrocinadores executivos."
        ),
    },
    {
        "key": "processos",
        "name": "Processos",
        "description": (
            "Políticas, processos e padrões que sustentam as competências de gestão e "
            "governança de dados (fluxos de governança, métricas de qualidade, etc.)."
        ),
    },
    {
        "key": "tecnologia",
        "name": "Tecnologia",
        "description": (
            "Ferramentas e plataformas que viabilizam a execução dos processos de gestão "
            "de dados (catálogo, controle de acesso, pipelines, observabilidade)."
        ),
    },
]

# ---------------------------------------------------------------------------
# Funcoes de dados (DAMA) - com mapeamento para principios de Data Mesh
# ---------------------------------------------------------------------------

FUNCTIONS = [
    {
        "key": "governanca",
        "name": "Governança de Dados",
        "mesh_principle": "federated_governance",
        "description": (
            "Autoridade e controle sobre os ativos de dados: papéis, políticas, padrões, "
            "processos e indicadores. É a 'gestão da gestão de dados'."
        ),
    },
    {
        "key": "arquitetura",
        "name": "Arquitetura de Dados",
        "mesh_principle": "domain_ownership",
        "description": (
            "Representação de alto nível dos componentes de dados corporativos e suas "
            "relações: como os dados são adquiridos, processados, armazenados e servidos."
        ),
    },
    {
        "key": "metadados",
        "name": "Gestão de Metadados",
        "mesh_principle": "data_as_product",
        "description": (
            "Catalogação, descoberta, dicionário de dados, linhagem e documentação dos "
            "ativos de dados corporativos."
        ),
    },
    {
        "key": "modelagem",
        "name": "Projeto e Modelagem de Dados",
        "mesh_principle": "data_as_product",
        "description": (
            "Design de modelos de dados conceituais, lógicos e físicos; padrões de "
            "modelagem e reúso de estruturas."
        ),
    },
    {
        "key": "operacoes",
        "name": "Operações e Infraestrutura de Dados",
        "mesh_principle": "self_serve",
        "description": (
            "Ingestão, orquestração, provisionamento de ambientes, confiabilidade e "
            "eficiência de custo das plataformas de dados."
        ),
    },
    {
        "key": "qualidade",
        "name": "Qualidade de Dados",
        "mesh_principle": "data_as_product",
        "description": (
            "Regras, métricas, monitoramento e melhoria contínua da qualidade dos dados "
            "(completude, acurácia, consistência, atualidade)."
        ),
    },
    {
        "key": "dados_mestres",
        "name": "Gestão de Dados Mestres e Referência",
        "mesh_principle": "data_as_product",
        "description": (
            "Definição, integração e governança de dados mestres (clientes, produtos) e "
            "dados de referência compartilhados."
        ),
    },
    {
        "key": "seguranca",
        "name": "Segurança de Dados",
        "mesh_principle": "federated_governance",
        "description": (
            "Controle de acesso, classificação da informação, proteção de credenciais e "
            "isolamento de ambientes."
        ),
    },
    {
        "key": "privacidade",
        "name": "Privacidade de Dados",
        "mesh_principle": "federated_governance",
        "description": (
            "Proteção de dados pessoais, conformidade com a LGPD, mascaramento, "
            "minimização e privacy by design."
        ),
    },
]

# ---------------------------------------------------------------------------
# Dimensoes de MATURIDADE (eixo executivo). Sao o "guarda-chuva" da narrativa:
# maturidade de gestao de dados + modelo operacional. As 9 funcoes DAMA ficam como
# camada de detalhe; cada questao mapeia para 1 dimensao de maturidade (primaria).
# Base: DAMA-DMBOK + DCAM (EDM Council) + praticas modernas (DataOps, FinOps Foundation,
# Team Topologies). Data Mesh entra como UMA lente, nao como o eixo.
# ---------------------------------------------------------------------------

MATURITY_DIMENSIONS = [
    {
        "key": "estrategia_cultura",
        "name": "Estratégia & Cultura de Dados",
        "icon": "compass",
        "description": (
            "Patrocínio executivo, estratégia de dados/IA, dado como ativo e como produto, "
            "financiamento estável, cultura data-driven e medição de valor."
        ),
    },
    {
        "key": "arquitetura_plataforma",
        "name": "Arquitetura & Plataforma",
        "icon": "layout",
        "description": (
            "Lakehouse, arquitetura em camadas (medallion), catálogo, integração/federação, "
            "tempo real e capacidade self-service da plataforma."
        ),
    },
    {
        "key": "modelo_operacional",
        "name": "Modelo Operacional & Organização",
        "icon": "users",
        "description": (
            "Estrutura de times de dados, papéis (owners, product managers), domínios, "
            "autonomia, path-to-production e distância entre produtor e consumidor."
        ),
    },
    {
        "key": "governanca_seguranca",
        "name": "Governança, Segurança & Privacidade",
        "icon": "shield",
        "description": (
            "Políticas, stewardship, catálogo/linhagem, controle de acesso, classificação, "
            "LGPD/privacidade e auditoria."
        ),
    },
    {
        "key": "engenharia_dataops",
        "name": "Engenharia & DataOps",
        "icon": "git",
        "description": (
            "CI/CD para dados, IaC, contratos de dados, qualidade automatizada, "
            "observabilidade, code review e ambientes DEV/STG/PROD."
        ),
    },
    {
        "key": "finops_valor",
        "name": "FinOps & Valor",
        "icon": "coin",
        "description": (
            "Visibilidade de custo por domínio/produto, tags, showback/chargeback, "
            "otimização contínua e custo como métrica no ciclo de vida do produto de dados."
        ),
    },
]

# ---------------------------------------------------------------------------
# Principios de Data Mesh (uma das LENTES do diagnostico, nao o eixo principal)
# ---------------------------------------------------------------------------

MESH_PRINCIPLES = [
    {
        "key": "domain_ownership",
        "name": "Propriedade orientada a domínios",
        "description": (
            "Dados de propriedade e responsabilidade dos domínios de negócio que os "
            "conhecem melhor, e não de um time central único."
        ),
    },
    {
        "key": "data_as_product",
        "name": "Dados como produto",
        "description": (
            "Dados tratados como produtos, com owner, SLA, documentação, qualidade "
            "garantida e fácil descoberta/consumo pelos demais domínios."
        ),
    },
    {
        "key": "self_serve",
        "name": "Plataforma self-service",
        "description": (
            "Infraestrutura de dados como plataforma self-service, que reduz o esforço "
            "dos domínios para criar e operar produtos de dados."
        ),
    },
    {
        "key": "federated_governance",
        "name": "Governança federada computacional",
        "description": (
            "Padrões globais (segurança, qualidade, interoperabilidade) definidos "
            "centralmente e aplicados de forma automatizada, com autonomia local."
        ),
    },
]

# ---------------------------------------------------------------------------
# Areas respondentes (personas). O assessment e multi-area e assincrono:
# cada area responde a sua secao, e o relatorio consolida as perspectivas.
#
# O campo "weight" pondera a CREDIBILIDADE/CONHECIMENTO de cada grupo sobre a maturidade
# REAL da plataforma de dados. Grupos mais tecnicos e proximos da operacao (plataforma,
# governanca) pesam mais; areas de negocio, que trazem a perspectiva de consumo mas conhecem
# menos a realidade tecnica, pesam menos. Isso evita que a media seja dominada por grupos com
# menor conhecimento. Os pesos sao usados na consolidacao por funcao/dimensao/principio e na
# nota global.
# ---------------------------------------------------------------------------

AREAS = [
    {
        "key": "lideranca",
        "name": "Liderança / Patrocínio",
        "icon": "crown",
        "weight": 1.0,
        "description": (
            "CDO, diretoria de dados, patrocinadores executivos. Respondem sobre "
            "estratégia, patrocínio, financiamento e organização de dados."
        ),
    },
    {
        "key": "governanca_office",
        "name": "Governança / Data Office",
        "icon": "scale",
        "weight": 1.0,
        "description": (
            "Time de governança, data stewards, escritório de dados. Respondem sobre "
            "políticas, catálogo, qualidade e metadados."
        ),
    },
    {
        "key": "plataforma",
        "name": "Plataforma / Engenharia de Dados",
        "icon": "server",
        "weight": 1.0,
        "description": (
            "Time de plataforma e engenharia de dados. Respondem sobre infraestrutura, "
            "pipelines, provisionamento e operações."
        ),
    },
    {
        "key": "arquitetura_area",
        "name": "Arquitetura de Dados / Soluções",
        "icon": "layout",
        "weight": 1.0,
        "description": (
            "Arquitetos de dados e soluções. Respondem sobre padrões de arquitetura, "
            "integração, modelagem e reúso."
        ),
    },
    {
        "key": "seguranca_area",
        "name": "Segurança & Privacidade",
        "icon": "shield",
        "weight": 1.0,
        "description": (
            "Time de segurança da informação, privacidade e conformidade (DPO). Respondem "
            "sobre controle de acesso, classificação, LGPD e proteção de dados pessoais."
        ),
    },
    {
        "key": "ciencia_ia",
        "name": "Ciência de Dados & IA",
        "icon": "sparkles",
        "weight": 1.0,
        "description": (
            "Times de ciência de dados, ML e IA. Respondem sobre MLOps, feature store, "
            "registro e monitoramento de modelos, GenAI e a colaboração com engenharia."
        ),
    },
    {
        "key": "dominios",
        "name": "Domínios de Negócio / Analytics",
        "icon": "briefcase",
        "weight": 1.0,
        "collect_subarea": True,
        "subarea_label": "Área de negócio (ex.: Crédito, Cartões, Investimentos)",
        "description": (
            "Áreas de negócio e analistas que produzem e consomem dados. Trazem a "
            "perspectiva de consumo (descoberta, confiança, self-service), com menor "
            "profundidade técnica - por isso peso menor na maturidade."
        ),
    },
]

# Mapa auxiliar de pesos por area.
AREA_WEIGHT = {a["key"]: a.get("weight", 1.0) for a in AREAS}
