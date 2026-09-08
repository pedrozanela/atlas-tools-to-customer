"""
Modelo Operacional de Dados: areas/capacidades de dados, suas funcoes e RACI.

Premissa: cada empresa nomeia e estrutura os times de forma diferente, entao cada AREA traz
SINONIMOS (formas comuns de mercado) e nao impoe uma nomenclatura. As funcoes de cada area
recebem uma RACI (Responsavel, Aprovador/Accountable, Consultado, Informado) no MODELO ALVO,
e cada area tem uma leitura de como e provida por ETAPA (1 a 4): quanto menor a maturidade,
mais as areas se acumulam em um unico time central (poucas pessoas, muitos chapeus = risco);
quanto maior a autonomia, mais papeis se distribuem e se multiplicam por dominio.

Base: taxonomia de mercado (Data Platform Engineering, Data Engineering, Analytics Engineering,
Data Science/ML, Data Governance, Data Architecture, etc.) + DAMA-DMBOK + Team Topologies.
"""

from __future__ import annotations

# Papeis RACI.
RACI_ROLES = [
    {"key": "R", "name": "Responsável", "short": "R", "description": "Executa a atividade (mão na massa)."},
    {"key": "A", "name": "Aprovador", "short": "A", "description": "Responde pelo resultado; decisão final (accountable). Idealmente 1 por atividade."},
    {"key": "C", "name": "Consultado", "short": "C", "description": "É consultado antes/durante (via de mão dupla)."},
    {"key": "I", "name": "Informado", "short": "I", "description": "É mantido informado do resultado (via de mão única)."},
]

# Atores da RACI = as proprias areas de dados + dois atores transversais.
EXTRA_ACTORS = [
    {"key": "dominios", "name": "Domínios de Negócio", "synonyms": ["Áreas de negócio", "Business Units", "Squads de domínio"]},
    {"key": "comite_dados", "name": "Comitê / Fórum de Dados", "synonyms": ["Data Council", "Fórum de Governança", "Comitê de Portfólio de Dados"]},
]

# Etapas (alinhadas ao espectro de modelos-alvo de dados). Uma "categoria" por etapa.
STAGES = [
    {"level": 1, "key": "fundacao", "name": "Modelo Centralizado"},
    {"level": 2, "key": "governado", "name": "Modelo Coordenado"},
    {"level": 3, "key": "harmonizado", "name": "Modelo Hub-and-Spoke"},
    {"level": 4, "key": "federado", "name": "Modelo Descentralizado"},
]


def _fn(key, name, description, R, A, C=None, I=None):
    return {"key": key, "name": name, "description": description,
            "raci": {"R": R, "A": A, "C": C or [], "I": I or []}}


# ---------------------------------------------------------------------------
# Areas / capacidades de dados. Cada area: sinonimos, descricao, staffing por etapa
# (como e provida em cada nivel de maturidade) e funcoes (com RACI no modelo alvo).
# ---------------------------------------------------------------------------
DATA_TEAM_AREAS = [
    {
        "key": "lideranca_estrategia",
        "name": "Liderança & Estratégia de Dados",
        "synonyms": ["CDO / Chief Data Officer", "Data & AI Office", "Escritório de Dados", "Head de Dados"],
        "description": "Define a estratégia de dados/IA, garante patrocínio e financiamento, prioriza o portfólio por valor e conduz a gestão de mudança.",
        "staffing_by_stage": {
            "1": "Inexistente ou acumulado por um gestor de TI.",
            "2": "Um patrocinador único (diretoria/gerência sênior).",
            "3": "CDO/Data Office com equipe pequena e comitê inicial.",
            "4": "Estrutura de liderança com comitês de governança e portfólio ativos.",
        },
        "functions": [
            _fn("estrategia", "Definir estratégia de dados & IA", "Visão, objetivos e conexão com a estratégia de negócio.",
                R=["lideranca_estrategia"], A=["lideranca_estrategia"], C=["arquitetura", "governanca", "produto_dominio"], I=["*"]),
            _fn("patrocinio_financiamento", "Patrocínio e financiamento", "Garantir sponsor executivo e orçamento estável para plataforma e domínios.",
                R=["lideranca_estrategia"], A=["comite_dados"], C=["lideranca_estrategia"], I=["*"]),
            _fn("portfolio_valor", "Priorização de portfólio por valor", "Decidir investimento por valor de negócio (árvore de valor).",
                R=["lideranca_estrategia", "produto_dominio"], A=["comite_dados"], C=["arquitetura", "governanca"], I=["*"]),
            _fn("gestao_mudanca", "Gestão de mudança e cultura", "Champions, incentivos e KPIs de dados na avaliação de desempenho.",
                R=["lideranca_estrategia"], A=["lideranca_estrategia"], C=["produto_dominio", "dominios"], I=["*"]),
        ],
    },
    {
        "key": "governanca",
        "name": "Governança de Dados",
        "synonyms": ["Data Governance", "Data Management Office (DGO)", "Data Stewardship", "Gestão de Dados"],
        "description": "Define direitos de decisão, políticas, padrões de qualidade, catálogo/metadados e stewardship, com aderência a LGPD e normas.",
        "staffing_by_stage": {
            "1": "Inexistente; regras ad hoc feitas pelo time central quando quebra algo.",
            "2": "Primeiros stewards nomeados para os domínios principais.",
            "3": "Time de governança com padrões definidos e stewards por domínio.",
            "4": "Governança federada: define padrões globais aplicados por código; stewards em todos os domínios.",
        },
        "functions": [
            _fn("politicas", "Definir políticas de dados", "Políticas de classificação, retenção, uso, acesso e qualidade.",
                R=["governanca"], A=["governanca"], C=["seguranca_privacidade", "arquitetura", "lideranca_estrategia", "data_owner"], I=["*"]),
            _fn("stewardship", "Stewardship e papéis (owner/steward)", "Nomear e apoiar data owners e stewards por domínio.",
                R=["steward", "dominios"], A=["governanca"], C=["produto_dominio", "data_owner"], I=["*"]),
            _fn("catalogo_metadados", "Catálogo, metadados e linhagem", "Curadoria do catálogo, glossário, dicionário e linhagem.",
                R=["steward"], A=["governanca"], C=["engenharia", "plataforma", "arquitetura"], I=["*"]),
            _fn("qualidade_regras", "Regras de qualidade de dados", "Definir e monitorar métricas/SLAs de qualidade por produto.",
                R=["steward"], A=["governanca"], C=["engenharia", "analytics_engineering", "data_owner"], I=["dominios"]),
        ],
    },
    {
        "key": "arquitetura",
        "name": "Arquitetura de Dados",
        "synonyms": ["Data Architecture", "Enterprise/Solution Data Architect", "Information Architect", "Data Modeler"],
        "description": "Define padrões, modelos de referência, contratos e padrões de interoperabilidade, e traduz requisitos de negócio em blueprints técnicos.",
        "staffing_by_stage": {
            "1": "Acumulado por alguém de TI/engenharia, sem padrões formais.",
            "2": "Padrões iniciais definidos para os fluxos principais.",
            "3": "Arquitetura com padrões corporativos e contratos entre domínios.",
            "4": "Arquitetura evolutiva com fitness functions e contratos versionados por produto.",
        },
        "functions": [
            _fn("padroes", "Padrões e blueprints arquiteturais", "Camadas (medallion), padrões de plataforma, blueprints reutilizáveis.",
                R=["arquitetura"], A=["arquitetura"], C=["plataforma", "engenharia"], I=["*"]),
            _fn("contratos", "Contratos de dados e interoperabilidade", "Definir contratos (portas de entrada/saída), schemas e padrões de interop.",
                R=["arquitetura"], A=["arquitetura"], C=["engenharia", "governanca", "produto_dominio"], I=["dominios"]),
            _fn("modelagem", "Modelagem de dados e reúso", "Modelos conceituais/lógicos/físicos e reúso de estruturas.",
                R=["arquitetura", "analytics_engineering"], A=["arquitetura"], C=["engenharia"], I=["dominios"]),
        ],
    },
    {
        "key": "plataforma",
        "name": "Plataforma de Dados",
        "synonyms": ["Data Platform Engineering", "Data Infrastructure", "DataOps Platform", "Internal Data Platform (IDP)", "SRE de Dados"],
        "description": "Constrói e opera a plataforma self-service (lakehouse, catálogo, workspaces, CI/CD, observabilidade, segurança e custo) tratada como produto interno.",
        "staffing_by_stage": {
            "1": "1 time central faz tudo (plataforma + pipelines + acesso).",
            "2": "Time de plataforma central provisiona por chamado.",
            "3": "Plataforma como serviço com recursos self-service; 1 por ambiente/hub.",
            "4": "Plataforma como produto (DevEx); domínios provisionam sob demanda; admin por domínio.",
        },
        "functions": [
            _fn("provisionamento_iac", "Provisionamento e IaC", "Workspaces, catálogos e infra governada via automação (IaC).",
                R=["plataforma"], A=["plataforma"], C=["seguranca_privacidade", "arquitetura"], I=["dominios"]),
            _fn("self_service", "Capacidades self-service (SDK/CLI/blueprints)", "Reduzir atrito e carga cognitiva dos domínios.",
                R=["plataforma"], A=["plataforma"], C=["engenharia", "produto_dominio"], I=["*"]),
            _fn("confiabilidade", "Confiabilidade e sustentação (SRE)", "Disponibilidade, incidentes, observabilidade da plataforma.",
                R=["plataforma"], A=["plataforma"], C=["engenharia"], I=["*"]),
            _fn("admin_ambiente", "Administração do ambiente de dados", "Admin de metastore/workspaces, contas, quotas e políticas.",
                R=["plataforma"], A=["plataforma"], C=["seguranca_privacidade"], I=["dominios"]),
            _fn("finops", "FinOps / gestão de custo", "Visibilidade de custo por domínio/produto, tags, showback/chargeback, otimização.",
                R=["plataforma"], A=["lideranca_estrategia"], C=["dominios", "produto_dominio"], I=["comite_dados"]),
        ],
    },
    {
        "key": "engenharia",
        "name": "Engenharia de Dados",
        "synonyms": ["Data Engineering", "ETL/ELT Engineer", "Pipeline Engineer", "DataOps Engineer", "Big Data Engineer"],
        "description": "Constrói e opera pipelines de ingestão e transformação (medallion), qualidade nos pipelines, orquestração e contratos, em CI/CD.",
        "staffing_by_stage": {
            "1": "Scripts avulsos feitos pelo time central.",
            "2": "Alguns ETLs padronizados, ainda no time central.",
            "3": "Engenharia por área/domínio com padrões centrais.",
            "4": "Times multifuncionais por domínio com CI/CD e contratos.",
        },
        "functions": [
            _fn("pipelines", "Pipelines de ingestão e transformação", "Bronze/silver/gold, batch e streaming, orquestração.",
                R=["engenharia"], A=["engenharia"], C=["arquitetura", "plataforma"], I=["dominios"]),
            _fn("qualidade_pipeline", "Qualidade nos pipelines", "Expectativas/testes de qualidade automatizados nos pipelines.",
                R=["engenharia"], A=["governanca"], C=["analytics_engineering"], I=["dominios"]),
            _fn("cicd_codereview", "CI/CD e code review", "Repositório versionado, PR, quality gates e revisão de código.",
                R=["engenharia"], A=["plataforma"], C=["arquitetura"], I=["*"]),
        ],
    },
    {
        "key": "analytics_engineering",
        "name": "Analytics Engineering",
        "synonyms": ["Analytics Engineer", "BI Engineer", "Metrics Engineer", "Data Modeling Engineer", "dbt Developer"],
        "description": "Aplica práticas de engenharia à camada de transformação analítica (modelos, testes, documentação, camada semântica/métricas) para entregar datasets confiáveis ao negócio.",
        "staffing_by_stage": {
            "1": "Inexistente; análises feitas direto em planilhas.",
            "2": "Papel informal dentro de BI/engenharia.",
            "3": "Analytics engineers apoiando os domínios principais.",
            "4": "Analytics engineering em cada domínio, com camada semântica compartilhada.",
        },
        "functions": [
            _fn("modelos_transformacao", "Modelos de transformação (silver/gold)", "Modelagem para consumo, testes e documentação de datasets.",
                R=["analytics_engineering"], A=["analytics_engineering"], C=["engenharia", "arquitetura"], I=["dominios"]),
            _fn("metricas_semantica", "Métricas e camada semântica", "Definições de métricas consistentes reutilizadas por BI/apps.",
                R=["analytics_engineering"], A=["governanca"], C=["analytics_bi", "produto_dominio"], I=["dominios"]),
        ],
    },
    {
        "key": "ciencia_ml",
        "name": "Ciência de Dados & ML",
        "synonyms": ["Data Science", "ML Engineering", "MLOps", "AI Engineering", "Applied Scientist"],
        "description": "Usa estatística, ML e IA para insights e decisões automatizadas; desenvolve, implanta e monitora modelos (incl. GenAI/agentes).",
        "staffing_by_stage": {
            "1": "Inexistente ou pontual, sem produtização.",
            "2": "Cientistas isolados, sem MLOps.",
            "3": "Ciência de dados com apoio de MLOps da plataforma.",
            "4": "Times de ML por domínio com MLOps e monitoramento de drift.",
        },
        "functions": [
            _fn("modelagem_ml", "Modelagem e experimentação", "Feature engineering, treino, validação e comunicação de resultados.",
                R=["ciencia_ml"], A=["ciencia_ml"], C=["analytics_engineering", "dominios"], I=["*"]),
            _fn("mlops", "Deploy e monitoramento de modelos (MLOps)", "Serving, versionamento e monitoramento de drift.",
                R=["ciencia_ml"], A=["plataforma"], C=["engenharia"], I=["governanca"]),
        ],
    },
    {
        "key": "analytics_bi",
        "name": "Analytics & BI",
        "synonyms": ["Business Intelligence", "Data Analysts", "Insights", "Self-service BI"],
        "description": "Transforma dados em análises, dashboards e relatórios para decisão, incluindo BI/IA self-service sobre dados governados.",
        "staffing_by_stage": {
            "1": "Relatórios feitos pela TI sob demanda.",
            "2": "BI centralizado atendendo por chamado.",
            "3": "BI self-service para parte das áreas.",
            "4": "Analistas nos domínios com BI/IA self-service (inclusive linguagem natural).",
        },
        "functions": [
            _fn("dashboards", "Dashboards e relatórios", "Painéis e relatórios de negócio sobre produtos de dados certificados.",
                R=["analytics_bi", "dominios"], A=["analytics_bi"], C=["analytics_engineering"], I=["*"]),
            _fn("analise_negocio", "Análise e métricas de negócio", "Análises ad-hoc e acompanhamento de KPIs de negócio.",
                R=["analytics_bi", "dominios"], A=["dominios"], C=["analytics_engineering"], I=["produto_dominio"]),
        ],
    },
    {
        "key": "seguranca_privacidade",
        "name": "Segurança & Privacidade de Dados",
        "synonyms": ["Data Security", "Privacy / DPO", "InfoSec de Dados", "Data Protection"],
        "description": "Controle de acesso (RBAC/ABAC), mascaramento/RLS, classificação, conformidade LGPD/consentimento, auditoria e resposta a incidentes.",
        "staffing_by_stage": {
            "1": "Acesso concedido de forma ampla e manual pelo time central.",
            "2": "Controle por sistema, inconsistente; DPO reativo.",
            "3": "Controle centralizado por grupos/papéis; DPO participa de projetos críticos.",
            "4": "Acesso fino por atributo aplicado automaticamente; privacy by design.",
        },
        "functions": [
            _fn("controle_acesso", "Controle de acesso (RBAC/ABAC)", "Políticas de acesso granular, menor privilégio e revogação. O dono do dado aprova quem acessa; segurança executa.",
                R=["seguranca_privacidade"], A=["data_owner"], C=["governanca", "plataforma"], I=["dominios"]),
            _fn("protecao_dados", "Proteção de dados sensíveis", "Mascaramento, RLS, criptografia, pseudonimização.",
                R=["seguranca_privacidade"], A=["seguranca_privacidade"], C=["engenharia", "governanca"], I=["*"]),
            _fn("privacidade_lgpd", "Privacidade e conformidade (LGPD)", "Base legal, consentimento, DPIA e atendimento a titulares.",
                R=["seguranca_privacidade"], A=["seguranca_privacidade"], C=["governanca", "data_owner"], I=["comite_dados"]),
            _fn("auditoria", "Auditoria e resposta a incidentes", "Trilhas de auditoria, SIEM e playbook de incidentes.",
                R=["seguranca_privacidade"], A=["seguranca_privacidade"], C=["plataforma"], I=["comite_dados"]),
        ],
    },
    {
        "key": "produto_dominio",
        "name": "Produto & Domínio de Dados",
        "synonyms": ["Data Product Management", "Domain Ownership", "Data Product Owner", "Domain Data Owner"],
        "description": "Trata dados como produto: dono do domínio e gestor de produto de dados definem visão, roadmap, SLAs/SLOs e prioridades por valor.",
        "staffing_by_stage": {
            "1": "Inexistente; dados são responsabilidade da TI.",
            "2": "Ownership informal; sem papéis nomeados.",
            "3": "Dono de domínio e gestor de produto para os domínios principais.",
            "4": "Dono de domínio e gestor de produto formais em todos os domínios, com SLAs.",
        },
        "functions": [
            _fn("ownership_dominio", "Ownership do domínio", "Estratégia, prioridades e representação do domínio nos fóruns.",
                R=["produto_dominio", "dominios"], A=["produto_dominio"], C=["lideranca_estrategia"], I=["comite_dados"]),
            _fn("gestao_produto", "Gestão do produto de dados", "Visão, roadmap, SLAs/SLOs e critérios de sucesso do produto.",
                R=["produto_dominio"], A=["produto_dominio"], C=["engenharia", "analytics_engineering", "governanca"], I=["dominios"]),
            _fn("publicacao_produto", "Publicação e certificação de produtos", "Publicar produtos com owner, contrato, SLA e documentação.",
                R=["produto_dominio", "engenharia"], A=["produto_dominio"], C=["governanca", "arquitetura", "data_owner"], I=["*"]),
        ],
    },
]

AREA_BY_KEY = {a["key"]: a for a in DATA_TEAM_AREAS}


# ---------------------------------------------------------------------------
# Matriz RACI por ETAPA. Em cada etapa, cada AREA e "encarnada" por um PAPEL (coluna).
# Em baixa maturidade poucos papeis acumulam varias areas (sobrecarga); em alta, distribui
# e multiplica por dominio. As celulas sao derivadas da RACI por area (acima), traduzindo
# cada area para o papel daquela etapa (mantendo o RACI mais forte quando varias colapsam).
# ---------------------------------------------------------------------------
# Metadados de cada PAPEL (nome + sinonimos + o que faz) - alimenta o glossario da UI.
# Sem parenteticos redundantes com o TIME (ex.: nao usar "(por dominio)" pois o time ja diz).
ROLE_META = {
    "lider": {"name": "Líder de dados (C-Level ou equivalente)", "synonyms": ["CDO / Chief Data Officer", "Head de Dados", "Diretor de Dados & IA"],
              "description": "Patrocina, define a estratégia e responde pela área de dados perante a organização."},
    "comite": {"name": "Comitê / Fórum de dados", "synonyms": ["Data Council", "Fórum de Governança", "Comitê de Portfólio de Dados"],
               "description": "Colegiado que decide políticas globais, prioridades e investimento em dados."},
    "central": {"name": "Time central de dados (multidisciplinar)", "synonyms": ["Central data team", "Time único de dados", "Squad de dados inicial"],
                "description": "Equipe central que acumula várias funções (governança, arquitetura, plataforma, engenharia, analytics, segurança) - típico em baixa maturidade; sinaliza sobrecarga de papéis."},
    "eng": {"name": "Engenharia de Dados", "synonyms": ["Data Engineer", "ETL/ELT Engineer", "DataOps Engineer"],
            "description": "Constrói e opera pipelines (ingestão, transformação), qualidade e CI/CD dos dados."},
    "eng_dom": {"name": "Engenharia de Dados", "synonyms": ["Data Engineer", "ETL/ELT Engineer", "DataOps Engineer"],
                "description": "Constrói e opera pipelines, qualidade e CI/CD - alocada no domínio (spoke)."},
    "plataforma": {"name": "Time de Plataforma de Dados", "synonyms": ["Data Platform Engineering", "Data Infrastructure", "SRE de Dados", "Internal Data Platform"],
                   "description": "Provê a plataforma self-service (lakehouse, Unity Catalog, IaC, observabilidade, custo)."},
    "analytics_eng": {"name": "Analytics Engineering", "synonyms": ["Analytics Engineer", "BI Engineer", "Metrics Engineer", "dbt Developer"],
                      "description": "Camada de transformação analítica: modelos, testes, métricas e camada semântica."},
    "ciencia": {"name": "Cientista de dados / ML", "synonyms": ["Data Scientist", "ML Engineer", "MLOps", "AI Engineer"],
                "description": "Desenvolve, implanta e monitora modelos de ML/IA (incl. features e GenAI)."},
    "gov": {"name": "Governança de Dados", "synonyms": ["Data Governance", "Data Management Office (DGO)", "Gestão de Dados"],
            "description": "Define políticas, padrões, catálogo e responde pela governança de dados."},
    "steward": {"name": "Data Steward", "synonyms": ["Steward de dados", "Custodiante de dados", "Data Owner (operacional)"],
                "description": "Executa a governança no domínio: qualidade, metadados/catálogo, glossário e regras de acesso."},
    "arq": {"name": "Arquitetura de Dados", "synonyms": ["Data Architect", "Enterprise/Solution Architect", "Data Modeler"],
            "description": "Padrões, contratos de dados, modelos de referência e interoperabilidade."},
    "seg": {"name": "Segurança & Privacidade", "synonyms": ["Data Security", "Privacy / DPO", "InfoSec de Dados"],
            "description": "Controle de acesso, mascaramento, LGPD/consentimento, auditoria e incidentes."},
    "dpo_owner": {"name": "Dono de domínio / Data Product Owner", "synonyms": ["Domain Owner", "Data Product Manager", "Domain Data Owner"],
                  "description": "Responde pelo domínio e pelos produtos de dados: visão, roadmap, SLAs e prioridades."},
    "data_owner": {"name": "Data Owner (dono do dado)", "synonyms": ["Dono do dado", "Business Data Owner", "Data Owner de negócio", "Accountable de dados"],
                   "description": "Papel de negócio que responde (accountable) pelos dados do seu domínio: aprova quem acessa, a classificação e a publicação dos produtos do domínio. Distingue-se do Data Steward (execução operacional da governança) e do Data Product Owner (gestão do produto de dados)."},
    "negocio": {"name": "Analista de dados", "synonyms": ["Analista de negócio", "Business Analyst", "Analista de BI"],
                "description": "Consome e analisa dados no negócio; ponte entre os dados e a decisão. Papel correlato (fora da área de dados)."},
}
ROLE_NAMES = {k: v["name"] for k, v in ROLE_META.items()}

# Papeis agrupados por TIME em cada etapa (mostra a que time cada papel pertence, e o
# conceito hub/spoke nas etapas mais maduras). A ordem das colunas segue os times.
STAGE_TEAMS = {
    "fundacao": [
        {"name": "Liderança", "roles": ["lider"]},
        {"name": "Time de Dados", "roles": ["central", "ciencia"]},
        {"name": "Time de Negócio", "roles": ["negocio"]},
    ],
    "governado": [
        {"name": "Liderança", "roles": ["lider"]},
        {"name": "Time central de dados", "roles": ["plataforma", "gov", "steward", "eng", "ciencia"]},
        {"name": "Time de Negócio", "roles": ["data_owner", "negocio"]},
    ],
    "harmonizado": [
        {"name": "Hub central", "roles": ["lider", "plataforma", "gov", "arq", "seg"]},
        {"name": "Spokes (domínios)", "roles": ["steward", "eng_dom", "ciencia"]},
        {"name": "Time de Negócio", "roles": ["data_owner", "negocio"]},
    ],
    "federado": [
        {"name": "Hub de governança (enxuto)", "roles": ["comite", "plataforma", "gov", "arq", "seg"]},
        {"name": "Domínios (spokes autônomos)", "roles": ["steward", "eng_dom", "analytics_eng", "ciencia", "dpo_owner", "data_owner"]},
        {"name": "Time de Negócio", "roles": ["negocio"]},
    ],
}
STAGE_ROLES = {k: [r for team in teams for r in team["roles"]] for k, teams in STAGE_TEAMS.items()}

# area (ou ator) -> papel, por etapa.
AREA_ROLE = {
    "fundacao": {
        "lideranca_estrategia": "lider", "comite_dados": "lider", "data_owner": "central",
        "governanca": "central", "steward": "central", "arquitetura": "central", "plataforma": "central",
        "engenharia": "central", "analytics_engineering": "central", "analytics_bi": "central",
        "seguranca_privacidade": "central",
        "ciencia_ml": "ciencia",
        "produto_dominio": "negocio", "dominios": "negocio",
    },
    "governado": {
        "lideranca_estrategia": "lider", "comite_dados": "lider", "data_owner": "data_owner",
        "governanca": "gov", "steward": "steward", "seguranca_privacidade": "gov",
        "arquitetura": "plataforma", "plataforma": "plataforma",
        "engenharia": "eng", "analytics_engineering": "eng", "analytics_bi": "eng",
        "ciencia_ml": "ciencia",
        "produto_dominio": "negocio", "dominios": "negocio",
    },
    "harmonizado": {
        "lideranca_estrategia": "lider", "comite_dados": "lider", "data_owner": "data_owner",
        "governanca": "gov", "steward": "steward", "arquitetura": "arq", "plataforma": "plataforma",
        "engenharia": "eng_dom", "analytics_engineering": "eng_dom", "analytics_bi": "eng_dom",
        "ciencia_ml": "ciencia", "seguranca_privacidade": "seg",
        "produto_dominio": "negocio", "dominios": "negocio",
    },
    "federado": {
        "lideranca_estrategia": "comite", "comite_dados": "comite", "data_owner": "data_owner",
        "governanca": "gov", "steward": "steward", "arquitetura": "arq", "plataforma": "plataforma",
        "engenharia": "eng_dom", "analytics_engineering": "analytics_eng",
        "ciencia_ml": "ciencia", "seguranca_privacidade": "seg", "analytics_bi": "negocio",
        "produto_dominio": "dpo_owner", "dominios": "negocio",
    },
}

_STRENGTH = {"A": 4, "R": 3, "C": 2, "I": 1}


def _cell_letters(letters: set) -> str:
    """Combina o conjunto de RACI de um papel numa celula. A e R coexistem (A/R);
    caso contrario, mostra o mais forte. Garante que o R apareca (RACI valida)."""
    if not letters:
        return ""
    if "A" in letters and "R" in letters:
        return "A/R"
    for lv in ("A", "R", "C", "I"):
        if lv in letters:
            return lv
    return ""


def _stage_matrix(stage_key: str) -> dict:
    roles = STAGE_ROLES[stage_key]
    amap = AREA_ROLE[stage_key]
    groups = []
    for a in DATA_TEAM_AREAS:
        fns = []
        for fn in a["functions"]:
            byrole = {}  # role -> set de letras
            for level in ("R", "A", "C", "I"):
                for act in fn["raci"].get(level, []):
                    if act == "*":
                        continue
                    role = amap.get(act)
                    if role:
                        byrole.setdefault(role, set()).add(level)
            cells = {r: _cell_letters(s) for r, s in byrole.items()}
            # Garante 1 Responsavel: se nenhum papel ficou com R (ou A/R), promove o
            # papel Accountable a A/R (accountable tambem executa neste modelo enxuto).
            has_r = any("R" in v for v in cells.values())
            if not has_r:
                for r, v in cells.items():
                    if v == "A":
                        cells[r] = "A/R"
                        has_r = True
                        break
            fns.append({"key": fn["key"], "name": fn["name"], "description": fn["description"], "cells": cells})
        groups.append({"area": a["key"], "area_name": a["name"],
                       "synonyms": a["synonyms"], "description": a["description"], "functions": fns})
    teams = [{"name": t["name"], "count": len(t["roles"])} for t in STAGE_TEAMS[stage_key]]
    return {"roles": [{"key": r, "name": ROLE_NAMES[r]} for r in roles],
            "teams": teams, "groups": groups}


def actor_label(key: str) -> str:
    if key == "*":
        return "Todos"
    a = AREA_BY_KEY.get(key)
    if a:
        return a["name"]
    for x in EXTRA_ACTORS:
        if x["key"] == key:
            return x["name"]
    return key


def operating_model_payload() -> dict:
    """Serializa o modelo operacional de referencia para o frontend.

    stage_models: uma matriz RACI (funcao x papel) por etapa/categoria.
    """
    # Glossario de papeis: todos os papeis usados em qualquer etapa, deduplicados por nome
    # (inclui correlatos fora da area de dados, ex.: Analista de dados/negocio).
    used = []
    for rs in STAGE_ROLES.values():
        for r in rs:
            if r not in used:
                used.append(r)
    glossary, seen_names = [], set()
    for r in used:
        meta = ROLE_META.get(r)
        if meta and meta["name"] not in seen_names:
            seen_names.add(meta["name"])
            glossary.append({"key": r, "name": meta["name"], "synonyms": meta["synonyms"], "description": meta["description"]})
    return {
        "raci_roles": RACI_ROLES,
        "stages": STAGES,
        "stage_models": [{"key": s["key"], "name": s["name"], "level": s["level"],
                          "matrix": _stage_matrix(s["key"])} for s in STAGES],
        "areas": DATA_TEAM_AREAS,
        "roles_glossary": glossary,
        "extra_actors": EXTRA_ACTORS,
    }
