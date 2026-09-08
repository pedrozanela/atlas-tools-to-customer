"""
Mensagens-chave e referencias (internas Databricks + publicas + conceito original)
usadas na parte educacional do app e no relatorio gerado.
"""

from __future__ import annotations

# Mensagens de posicionamento (educacao do cliente e do SA). Cada mensagem tem um texto
# introdutorio curto e uma lista de bullets para leitura rapida.
KEY_MESSAGES = [
    {
        "title": "Maturidade de dados é uma jornada, não um projeto",
        "text": (
            "Gerir dados como ativo evolui por estágios, em Pessoas, Processos e Tecnologia "
            "(base DAMA-DMBOK) - não é algo que se compra ou se liga de uma vez."
        ),
        "bullets": [
            "O diagnóstico mede a maturidade em 6 dimensões, das áreas de negócio à plataforma.",
            "Cada estágio tem um modelo operacional (times, papéis, autonomia) correspondente.",
            "O Databricks Lakehouse fornece os habilitadores técnicos de cada capacidade.",
        ],
    },
    {
        "title": "O modelo-alvo de dados evolui do centralizado ao descentralizado",
        "text": "Como a organização de dados se estrutura é um espectro, do mais centralizado ao mais autônomo.",
        "bullets": [
            "Mais centralizado: um time central provê plataforma, padrões e governança; menor autonomia das áreas.",
            "Mais autônomo: domínios donos de seus dados, sobre uma plataforma self-service, com governança federada.",
            "A estrutura certa depende da maturidade - e a complexidade organizacional cresce com a autonomia.",
        ],
    },
    {
        "title": "Comece pela fundação, distribua a autonomia por etapas",
        "text": (
            "Consolidar e governar antes de distribuir. A autonomia só sustenta valor sobre uma base sólida."
        ),
        "bullets": [
            "Um time central provê plataforma, Unity Catalog, segurança, padrões e guardrails.",
            "À medida que a maturidade cresce, os domínios assumem seus pipelines, qualidade e produtos de dados.",
            "Forçar a distribuição cedo demais (sem base e sem cultura) gera novos silos e caos.",
        ],
    },
    {
        "title": "Produtos de dados, domínios e autonomia: capacidades de uma organização madura",
        "text": (
            "São boas práticas de gestão de dados em escala. Reunidas na ponta federada do espectro, "
            "o mercado as chama de Data Mesh - aqui, uma das lentes do diagnóstico, não o objetivo."
        ),
        "bullets": [
            "Propriedade por domínio -> domínios / workspaces (ownership local e autonomia).",
            "Dados como produto -> ativos com owner, contrato, documentação, qualidade e SLA.",
            "Plataforma self-service -> infraestrutura de dados que reduz o esforço dos domínios.",
            "Governança federada -> Unity Catalog (catálogo, descoberta, linhagem, acesso, classificação, auditoria).",
        ],
    },
]

# Padroes de mercado e referencias de gestao de dados (frameworks oficiais + conceito de Data Mesh).
CONCEPT_REFERENCES = [
    {"label": "DAMA-DMBOK (Data Management Body of Knowledge)",
     "note": "Corpo de conhecimento de referência em gestão de dados (áreas de conhecimento e boas práticas).",
     "url": "https://www.dama.org/cpages/body-of-knowledge"},
    {"label": "EDM Council - DCAM (Data Management Capability Assessment Model)",
     "note": "Modelo de avaliação de capacidades de gestão de dados e analytics.",
     "url": "https://edmcouncil.org/frameworks/dcam/"},
    {"label": "CMMI - Data Management Maturity (DMM)",
     "note": "Modelo de maturidade de gestão de dados por níveis.",
     "url": "https://cmmiinstitute.com/data-management-maturity"},
    {"label": "FinOps Foundation - Framework",
     "note": "Gestão financeira de nuvem (custo x valor), aplicável a dados e IA.",
     "url": "https://www.finops.org/framework/"},
    {"label": "Team Topologies",
     "note": "Desenho de times e modos de interação - base para o modelo operacional de dados.",
     "url": "https://teamtopologies.com/"},
    {"label": "Domain-Driven Design (Eric Evans / Martin Fowler)",
     "note": "Modelagem por domínios de negócio - base conceitual para ownership por domínio.",
     "url": "https://martinfowler.com/bliki/DomainDrivenDesign.html"},
    {"label": "How to Move Beyond a Monolithic Data Lake to a Distributed Data Mesh (Zhamak Dehghani, 2019)",
     "note": "Artigo original que cunhou o termo Data Mesh.",
     "url": "https://martinfowler.com/articles/data-monolith-to-mesh.html"},
    {"label": "Data Mesh Principles and Logical Architecture (Zhamak Dehghani, 2020)",
     "note": "Os 4 princípios e a arquitetura lógica do Data Mesh.",
     "url": "https://martinfowler.com/articles/data-mesh-principles.html"},
]

# Recursos internos (para SAs). go-links + URLs.
INTERNAL_REFERENCES = [
    {"label": "Data Mesh (go/data-mesh)", "note": "Hub principal: POV, decks L100/L200/L300, padrões e casos de uso.",
     "url": "https://databricks.atlassian.net/wiki/spaces/FE/pages/2707785997"},
    {"label": "Data & AI Governance (go/governance)", "note": "Deck completo: modelos operacionais, maturidade e responsabilidades.",
     "url": "https://docs.google.com/presentation/d/1kIwyrbFrNQYtQzdAMxW1L7NAJ5eZxJ4wGf5y2J4kj0Y"},
    {"label": "Unity Catalog Best Practices (go/uc/best-practices)", "note": "Guia base para desenhar governança com Unity Catalog.",
     "url": "https://docs.databricks.com/aws/en/data-governance/unity-catalog/best-practices"},
    {"label": "UC Architecture Patterns (go/uc/arch-patterns)", "note": "Harmonized mesh, hub-and-spoke, publicação distribuída e centralizada.",
     "url": "https://docs.databricks.com/aws/en/data-governance/unity-catalog"},
    {"label": "Data Products (go/data-products)", "note": "Responsabilidades plataforma x domínios, data contracts, qualidade, SLAs, publicação.",
     "url": "https://databricks.atlassian.net/wiki/spaces/FE/pages/3337683824"},
    {"label": "Databricks Lakehouse and Data Mesh - Full Deck", "note": "Narrativa completa Lakehouse + Data Mesh.",
     "url": "https://docs.google.com/presentation/d/12icNRpQOrADr9Ofh6S-edp8eEDwlhGvC1gco9AMZ10g"},
]

# Recursos publicos (para compartilhar com o cliente).
PUBLIC_REFERENCES = [
    {"label": "Unity Catalog: Data Governance", "note": "Documentação oficial de governança de dados e IA.",
     "url": "https://docs.databricks.com/aws/en/data-governance"},
    {"label": "Lakehouse Federation", "note": "Consulta federada a fontes externas sem mover dados.",
     "url": "https://docs.databricks.com/aws/en/query-federation"},
    {"label": "Delta Sharing", "note": "Compartilhamento aberto de dados sem cópia.",
     "url": "https://docs.databricks.com/aws/en/delta-sharing"},
]
