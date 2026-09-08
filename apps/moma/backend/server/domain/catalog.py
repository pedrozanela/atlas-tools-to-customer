"""
Catalogo de solucoes Databricks por funcao de dados.

Para cada funcao DAMA, lista os produtos/recursos Databricks relevantes e um conjunto
de recomendacoes de evolucao. Cada recomendacao carrega:
  - text:     acao recomendada
  - products: produtos/recursos Databricks envolvidos
  - effort:   complexidade de execucao (Simples | Media | Complexa)
  - target_stage: estagio de maturidade que a acao ajuda a alcancar (2, 3 ou 4)

O gerador de relatorio seleciona, para cada funcao, as recomendacoes cujo target_stage
e maior que o estagio atual da organizacao naquela funcao.
"""

from __future__ import annotations

# Produtos Databricks de referencia (para tooltip/glossario no relatorio).
DATABRICKS_PRODUCTS = {
    "unity_catalog": "Unity Catalog - governança unificada (catálogo, acesso, linhagem, tags).",
    "delta_lake": "Delta Lake - formato transacional aberto (ACID, time travel).",
    "lakeflow_pipelines": "Lakeflow Declarative Pipelines (DLT) - pipelines declarativos com qualidade.",
    "lakeflow_jobs": "Lakeflow Jobs - orquestração de workflows.",
    "lakeflow_connect": "Lakeflow Connect - conectores gerenciados de ingestão.",
    "lakehouse_federation": "Lakehouse Federation - consulta federada a fontes externas sem mover dados.",
    "delta_sharing": "Delta Sharing - compartilhamento aberto de dados sem cópia.",
    "marketplace": "Databricks Marketplace - descoberta e distribuição de produtos de dados.",
    "lakehouse_monitoring": "Lakehouse Monitoring - monitoramento de qualidade e drift.",
    "system_tables": "System Tables - observabilidade de uso, custo, acesso e linhagem.",
    "abac": "ABAC / Row & Column masking - controle de acesso fino baseado em atributos.",
    "clean_rooms": "Clean Rooms - colaboração segura sobre dados sensíveis.",
    "aibi": "Databricks AI/BI (Dashboards + Genie) - BI e analytics em linguagem natural.",
    "metric_views": "Metric Views - métricas de negócio consistentes e governadas.",
    "dabs": "Databricks Asset Bundles - CI/CD e IaC para dados e apps.",
    "compliance": "Compliance Security Profile / PrivateLink - isolamento e conformidade.",
    "lineage": "Data Lineage - linhagem automatizada até nível de coluna.",
    "lakebase": "Lakebase - Postgres gerenciado integrado ao lakehouse.",
}

# Links de documentacao oficial Databricks por produto/recurso.
DATABRICKS_DOCS = {
    "unity_catalog": "https://docs.databricks.com/aws/en/data-governance/unity-catalog/",
    "delta_lake": "https://docs.databricks.com/aws/en/delta/",
    "lakeflow_pipelines": "https://docs.databricks.com/aws/en/dlt/",
    "lakeflow_jobs": "https://docs.databricks.com/aws/en/jobs/",
    "lakeflow_connect": "https://docs.databricks.com/aws/en/ingestion/lakeflow-connect/",
    "lakehouse_federation": "https://docs.databricks.com/aws/en/query-federation/",
    "delta_sharing": "https://docs.databricks.com/aws/en/delta-sharing/",
    "marketplace": "https://docs.databricks.com/aws/en/marketplace/",
    "lakehouse_monitoring": "https://docs.databricks.com/aws/en/lakehouse-monitoring/",
    "system_tables": "https://docs.databricks.com/aws/en/admin/system-tables/",
    "abac": "https://docs.databricks.com/aws/en/tables/row-and-column-filters",
    "clean_rooms": "https://docs.databricks.com/aws/en/clean-rooms/",
    "aibi": "https://docs.databricks.com/aws/en/dashboards/",
    "metric_views": "https://docs.databricks.com/aws/en/metric-views/",
    "dabs": "https://docs.databricks.com/aws/en/dev-tools/bundles/",
    "compliance": "https://docs.databricks.com/aws/en/security/privacy/security-profile",
    "lineage": "https://docs.databricks.com/aws/en/data-governance/unity-catalog/data-lineage",
    "lakebase": "https://docs.databricks.com/aws/en/oltp/",
}


FUNCTION_SOLUTIONS = {
    "governanca": {
        "products": ["unity_catalog", "system_tables", "abac", "dabs"],
        "recommendations": [
            {"text": "Adotar o Unity Catalog como ponto único de governança (catálogo, controle de acesso, linhagem e auditoria).",
             "products": ["unity_catalog"], "effort": "Media", "target_stage": 2},
            {"text": "Formalizar papéis de data owner e steward por domínio e refletir isso na estrutura de catálogos.",
             "products": ["unity_catalog"], "effort": "Media", "target_stage": 3},
            {"text": "Publicar políticas de dados (classificação, retenção, uso) e aplicá-las via tags e policies no Unity Catalog.",
             "products": ["unity_catalog", "abac"], "effort": "Media", "target_stage": 3},
            {"text": "Evoluir para governança federada computacional: padrões globais aplicados por código (ABAC, tags, policies) com autonomia dos domínios.",
             "products": ["abac", "unity_catalog", "dabs"], "effort": "Complexa", "target_stage": 4},
        ],
    },
    "arquitetura": {
        "products": ["delta_lake", "lakehouse_federation", "delta_sharing", "unity_catalog"],
        "recommendations": [
            {"text": "Consolidar os dados em um lakehouse governado com arquitetura medallion (bronze/silver/gold) sobre Delta Lake.",
             "products": ["delta_lake", "unity_catalog"], "effort": "Media", "target_stage": 2},
            {"text": "Usar Lakehouse Federation para integrar fontes externas sob governança única, sem mover dados (amplia a governança imediatamente).",
             "products": ["lakehouse_federation"], "effort": "Simples", "target_stage": 2},
            {"text": "Organizar catálogos por domínio de dados e definir uma topologia de workspaces adequada à maturidade.",
             "products": ["unity_catalog"], "effort": "Media", "target_stage": 3},
            {"text": "Adotar Delta Sharing para troca de produtos de dados entre domínios sem duplicação, evoluindo para uma malha (mesh).",
             "products": ["delta_sharing", "marketplace"], "effort": "Media", "target_stage": 4},
        ],
    },
    "metadados": {
        "products": ["unity_catalog", "lineage", "marketplace", "aibi"],
        "recommendations": [
            {"text": "Centralizar metadados e descoberta no Unity Catalog, com tags e comentários (inclusive documentação gerada por IA).",
             "products": ["unity_catalog"], "effort": "Simples", "target_stage": 2},
            {"text": "Ativar linhagem automatizada (até nível de coluna) para os pipelines críticos.",
             "products": ["lineage"], "effort": "Simples", "target_stage": 3},
            {"text": "Disponibilizar produtos de dados descobríveis via Marketplace/Discovery interno, com contratos e SLAs.",
             "products": ["marketplace", "unity_catalog"], "effort": "Media", "target_stage": 4},
        ],
    },
    "modelagem": {
        "products": ["delta_lake", "lakeflow_pipelines", "metric_views"],
        "recommendations": [
            {"text": "Estabelecer padrões de modelagem e reúso, versionados junto ao código dos pipelines.",
             "products": ["delta_lake", "dabs"], "effort": "Media", "target_stage": 2},
            {"text": "Modelar a camada de consumo (gold) com padrões consistentes e materializar via Lakeflow Declarative Pipelines.",
             "products": ["lakeflow_pipelines"], "effort": "Media", "target_stage": 3},
            {"text": "Padronizar métricas de negócio com Metric Views para evitar múltiplas 'verdades' entre domínios.",
             "products": ["metric_views"], "effort": "Media", "target_stage": 4},
        ],
    },
    "operacoes": {
        "products": ["lakeflow_jobs", "lakeflow_pipelines", "lakeflow_connect", "system_tables", "dabs"],
        "recommendations": [
            {"text": "Substituir scripts manuais por ingestão gerenciada (Lakeflow Connect) e pipelines declarativos (DLT).",
             "products": ["lakeflow_connect", "lakeflow_pipelines"], "effort": "Media", "target_stage": 2},
            {"text": "Orquestrar com Lakeflow Jobs e versionar tudo com Databricks Asset Bundles (CI/CD).",
             "products": ["lakeflow_jobs", "dabs"], "effort": "Media", "target_stage": 3},
            {"text": "Habilitar provisionamento self-service de ambientes governados por domínio (DABs/IaC + serverless).",
             "products": ["dabs"], "effort": "Complexa", "target_stage": 4},
            {"text": "Implantar FinOps de dados com System Tables: custo por domínio/produto e otimização contínua (serverless).",
             "products": ["system_tables"], "effort": "Media", "target_stage": 4},
        ],
    },
    "qualidade": {
        "products": ["lakeflow_pipelines", "lakehouse_monitoring", "system_tables"],
        "recommendations": [
            {"text": "Definir expectativas de qualidade nos pipelines (DLT expectations) para os dados críticos.",
             "products": ["lakeflow_pipelines"], "effort": "Simples", "target_stage": 2},
            {"text": "Monitorar qualidade e drift continuamente com Lakehouse Monitoring, com SLAs por dado crítico.",
             "products": ["lakehouse_monitoring"], "effort": "Media", "target_stage": 3},
            {"text": "Publicar métricas de qualidade por produto de dado e alertar automaticamente em violações de SLA.",
             "products": ["lakehouse_monitoring", "system_tables"], "effort": "Media", "target_stage": 4},
        ],
    },
    "dados_mestres": {
        "products": ["delta_lake", "unity_catalog", "delta_sharing", "lakeflow_pipelines"],
        "recommendations": [
            {"text": "Definir os conceitos mestres (cliente, produto, etc.) e seus owners; eliminar cadastros redundantes.",
             "products": ["unity_catalog"], "effort": "Media", "target_stage": 2},
            {"text": "Construir uma base única por conceito mestre (golden record) com pipelines de resolução de entidade.",
             "products": ["delta_lake", "lakeflow_pipelines"], "effort": "Complexa", "target_stage": 3},
            {"text": "Disponibilizar dados mestres/referência como produtos governados, consumidos via grants/Delta Sharing (sem cópia).",
             "products": ["delta_sharing", "unity_catalog"], "effort": "Media", "target_stage": 4},
        ],
    },
    "seguranca": {
        "products": ["unity_catalog", "abac", "system_tables", "compliance"],
        "recommendations": [
            {"text": "Centralizar o controle de acesso no Unity Catalog por grupos/papéis.",
             "products": ["unity_catalog"], "effort": "Media", "target_stage": 2},
            {"text": "Aplicar classificação da informação via tags e ativar auditoria de acesso com System Tables.",
             "products": ["unity_catalog", "system_tables"], "effort": "Media", "target_stage": 3},
            {"text": "Adotar controle de acesso fino (linha/coluna) baseado em atributos (ABAC) e mascaramento dinâmico.",
             "products": ["abac"], "effort": "Media", "target_stage": 3},
            {"text": "Isolar por domínio com rede privada e perfis de segurança/compliance (PrivateLink, Compliance Security Profile).",
             "products": ["compliance"], "effort": "Complexa", "target_stage": 4},
        ],
    },
    "privacidade": {
        "products": ["abac", "unity_catalog", "clean_rooms", "system_tables"],
        "recommendations": [
            {"text": "Mapear e marcar dados pessoais/sensíveis com tags no Unity Catalog (base para a LGPD).",
             "products": ["unity_catalog"], "effort": "Media", "target_stage": 2},
            {"text": "Aplicar mascaramento dinâmico por rótulo/atributo aos dados pessoais e sensíveis.",
             "products": ["abac"], "effort": "Media", "target_stage": 3},
            {"text": "Adotar privacy by design e Clean Rooms para colaboração sobre dados sensíveis sem exposição.",
             "products": ["clean_rooms", "abac"], "effort": "Complexa", "target_stage": 4},
        ],
    },
}

# Da a cada recomendacao um id estavel (funcao:indice) - usado para i18n robusto.
for _fk, _block in FUNCTION_SOLUTIONS.items():
    for _i, _r in enumerate(_block.get("recommendations", [])):
        _r["id"] = f"{_fk}:{_i}"

# ---------------------------------------------------------------------------
# Codigos de acao (ex.: GOV01, ARQ04) + DEPENDENCIAS entre recomendacoes.
# Dependencia intra-funcao: cada acao depende da acao de estagio anterior da mesma funcao
# (nao se alcanca o estagio 3 sem o 2). Dependencias entre funcoes: mapa CROSS_DEPS.
# ---------------------------------------------------------------------------
FUNCTION_CODE = {
    "governanca": "GOV", "arquitetura": "ARQ", "metadados": "MET", "modelagem": "MOD",
    "operacoes": "OPE", "qualidade": "QUA", "dados_mestres": "MDM", "seguranca": "SEG",
    "privacidade": "PRV",
}

# Dependencias ENTRE FUNCOES (por codigo), estudadas a partir do conteudo de cada acao.
# Regra: so incluir quando a pre-requisito e tecnicamente necessaria para a acao (sem "delirar").
#  - Fundacao no Unity Catalog (GOV01) habilita metadados, acesso e tags de PII / catalogos por dominio.
#  - Pipelines gerenciados (OPE01) habilitam linhagem, qualidade nos pipelines e materializacao da gold.
#  - Produtos de dados e mesh (MET03/ARQ04) exigem owners de dominio (GOV02) e a gold modelada (MOD02).
#  - Governanca computacional (GOV04) aplica-se via ABAC (SEG03). Self-service por dominio (OPE03) exige
#    a topologia de workspaces por dominio (ARQ03).
CROSS_DEPS = {
    "MET01": ["GOV01"], "SEG01": ["GOV01"], "PRV01": ["GOV01"], "ARQ03": ["GOV01"],
    "MET02": ["OPE01"], "QUA01": ["OPE01"], "MOD02": ["OPE01"],
    "OPE03": ["ARQ03"], "ARQ04": ["GOV02"], "GOV04": ["SEG03"],
    "MET03": ["GOV02", "MOD02"],
}

REC_BY_CODE = {}
# 1a passada: atribui codigos.
for _fk, _block in FUNCTION_SOLUTIONS.items():
    _prefix = FUNCTION_CODE.get(_fk, _fk[:3].upper())
    for _i, _r in enumerate(_block.get("recommendations", [])):
        _r["code"] = f"{_prefix}{_i + 1:02d}"
        REC_BY_CODE[_r["code"]] = _r
# 2a passada: dependencia intra-funcao = TODAS as acoes do estagio imediatamente anterior + cross.
for _fk, _block in FUNCTION_SOLUTIONS.items():
    _recs = _block.get("recommendations", [])
    _stages = sorted({r["target_stage"] for r in _recs})
    for _r in _recs:
        _prev = [s for s in _stages if s < _r["target_stage"]]
        _dep = [x["code"] for x in _recs if _prev and x["target_stage"] == max(_prev)]
        _dep += CROSS_DEPS.get(_r["code"], [])
        _r["depends_on"] = list(dict.fromkeys(_dep))
