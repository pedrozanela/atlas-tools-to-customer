"""Traducoes de conteudo (EN, ES) indexadas por IDs estaveis. PT e a fonte (sem override)."""

from __future__ import annotations

LEVELS = {
    "en": {
        1: {"name": "Reactive", "short": "Ad-hoc", "description": "Management and governance practices unknown or done occasionally. Needs identified but not adopted. Data in silos, reactive actions dependent on individual effort."},
        2: {"name": "Initial", "short": "Structuring", "description": "Needs mapped and in early use. Practices adopted in a few business units. Few corporate data concepts consistently tracked."},
        3: {"name": "Defined", "short": "Standardized", "description": "Practices adopted across several business units. Governance processes mapped and standardized, but still partially monitored. Most corporate data concepts are tracked."},
        4: {"name": "Optimized", "short": "Optimized", "description": "Practices adopted corporate-wide. Processes known by all and continuously monitored. Federated, automated governance; all corporate data concepts tracked."},
    },
    "es": {
        1: {"name": "Reactivo", "short": "Ad-hoc", "description": "Practicas de gestion y gobierno desconocidas o realizadas de forma eventual. Necesidades identificadas pero no adoptadas. Datos en silos, acciones reactivas dependientes del esfuerzo individual."},
        2: {"name": "Inicial", "short": "En estructuracion", "description": "Necesidades mapeadas y en uso inicial. Practicas adoptadas en pocas unidades de negocio. Pocos conceptos de datos corporativos monitoreados de forma consistente."},
        3: {"name": "Definido", "short": "Estandarizado", "description": "Practicas adoptadas en varias unidades de negocio. Procesos de gobierno mapeados y estandarizados, aun con monitoreo parcial. La mayoria de los conceptos de datos corporativos son monitoreados."},
        4: {"name": "Optimizado", "short": "Optimizado", "description": "Practicas adoptadas a nivel corporativo. Procesos conocidos por todos y monitoreados continuamente. Gobierno federado y automatizado; todos los conceptos de datos corporativos monitoreados."},
    },
}

DIMENSIONS = {
    "en": {
        "pessoas": {"name": "People", "description": "Roles and responsibilities for data management and governance, identification of owners, stewards and executive sponsors."},
        "processos": {"name": "Processes", "description": "Policies, processes and standards that sustain data management and governance (governance flows, quality metrics, etc.)."},
        "tecnologia": {"name": "Technology", "description": "Tools and platforms that enable the data management processes (catalog, access control, pipelines, observability)."},
    },
    "es": {
        "pessoas": {"name": "Personas", "description": "Roles y responsabilidades de gestion y gobierno de datos, identificacion de owners, stewards y patrocinadores ejecutivos."},
        "processos": {"name": "Procesos", "description": "Politicas, procesos y estandares que sustentan la gestion y el gobierno de datos (flujos de gobierno, metricas de calidad, etc.)."},
        "tecnologia": {"name": "Tecnologia", "description": "Herramientas y plataformas que habilitan los procesos de gestion de datos (catalogo, control de acceso, pipelines, observabilidad)."},
    },
}

FUNCTIONS = {
    "en": {
        "governanca": {"name": "Data Governance", "description": "Authority and control over data assets: roles, policies, standards, processes and indicators. It is the 'management of data management'."},
        "arquitetura": {"name": "Data Architecture", "description": "High-level representation of corporate data components and their relationships: how data is acquired, processed, stored and served."},
        "metadados": {"name": "Metadata Management", "description": "Cataloging, discovery, data dictionary, lineage and documentation of corporate data assets."},
        "modelagem": {"name": "Data Design & Modeling", "description": "Design of conceptual, logical and physical data models; modeling standards and structure reuse."},
        "operacoes": {"name": "Data Operations & Infrastructure", "description": "Ingestion, orchestration, environment provisioning, reliability and cost efficiency of data platforms."},
        "qualidade": {"name": "Data Quality", "description": "Rules, metrics, monitoring and continuous improvement of data quality (completeness, accuracy, consistency, timeliness)."},
        "dados_mestres": {"name": "Master & Reference Data Management", "description": "Definition, integration and governance of master data (customers, products) and shared reference data."},
        "seguranca": {"name": "Data Security", "description": "Access control, information classification, credential protection and environment isolation."},
        "privacidade": {"name": "Data Privacy", "description": "Protection of personal data, LGPD/GDPR compliance, masking, minimization and privacy by design."},
    },
    "es": {
        "governanca": {"name": "Gobierno de Datos", "description": "Autoridad y control sobre los activos de datos: roles, politicas, estandares, procesos e indicadores. Es la 'gestion de la gestion de datos'."},
        "arquitetura": {"name": "Arquitectura de Datos", "description": "Representacion de alto nivel de los componentes de datos corporativos y sus relaciones: como se adquieren, procesan, almacenan y sirven los datos."},
        "metadados": {"name": "Gestion de Metadatos", "description": "Catalogacion, descubrimiento, diccionario de datos, linaje y documentacion de los activos de datos corporativos."},
        "modelagem": {"name": "Diseno y Modelado de Datos", "description": "Diseno de modelos de datos conceptuales, logicos y fisicos; estandares de modelado y reuso de estructuras."},
        "operacoes": {"name": "Operaciones e Infraestructura de Datos", "description": "Ingesta, orquestacion, aprovisionamiento de ambientes, confiabilidad y eficiencia de costo de las plataformas de datos."},
        "qualidade": {"name": "Calidad de Datos", "description": "Reglas, metricas, monitoreo y mejora continua de la calidad de los datos (completitud, exactitud, consistencia, actualidad)."},
        "dados_mestres": {"name": "Gestion de Datos Maestros y de Referencia", "description": "Definicion, integracion y gobierno de datos maestros (clientes, productos) y datos de referencia compartidos."},
        "seguranca": {"name": "Seguridad de Datos", "description": "Control de acceso, clasificacion de la informacion, proteccion de credenciales y aislamiento de ambientes."},
        "privacidade": {"name": "Privacidad de Datos", "description": "Proteccion de datos personales, cumplimiento LGPD/GDPR, enmascaramiento, minimizacion y privacy by design."},
    },
}

PRINCIPLES = {
    "en": {
        "domain_ownership": {"name": "Domain-oriented ownership", "description": "Data owned by and the responsibility of the business domains that know it best, rather than a single central team."},
        "data_as_product": {"name": "Data as a product", "description": "Data treated as products with owner, SLA, documentation, guaranteed quality and easy discovery/consumption by other domains."},
        "self_serve": {"name": "Self-service platform", "description": "Data infrastructure as a self-service platform that reduces the effort for domains to build and operate data products."},
        "federated_governance": {"name": "Federated computational governance", "description": "Global standards (security, quality, interoperability) defined centrally and applied automatically, with local autonomy."},
    },
    "es": {
        "domain_ownership": {"name": "Propiedad orientada a dominios", "description": "Datos de propiedad y responsabilidad de los dominios de negocio que mejor los conocen, y no de un unico equipo central."},
        "data_as_product": {"name": "Datos como producto", "description": "Datos tratados como productos con owner, SLA, documentacion, calidad garantizada y facil descubrimiento/consumo por los demas dominios."},
        "self_serve": {"name": "Plataforma self-service", "description": "Infraestructura de datos como plataforma self-service que reduce el esfuerzo de los dominios para crear y operar productos de datos."},
        "federated_governance": {"name": "Gobierno computacional federado", "description": "Estandares globales (seguridad, calidad, interoperabilidad) definidos centralmente y aplicados automaticamente, con autonomia local."},
    },
}

AREAS = {
    "en": {
        "lideranca": {"name": "Leadership / Sponsorship", "description": "CDO, data leadership, executive sponsors. Answer about strategy, sponsorship, funding and data organization."},
        "governanca_office": {"name": "Governance / Data Office", "description": "Governance team, data stewards, data office. Answer about policies, catalog, quality and metadata."},
        "plataforma": {"name": "Platform / Data Engineering", "description": "Platform and data engineering team. Answer about infrastructure, pipelines, provisioning and operations."},
        "arquitetura_area": {"name": "Data Architecture / Solutions", "description": "Data and solution architects. Answer about architecture standards, integration, modeling and reuse."},
        "seguranca_area": {"name": "Security & Privacy", "description": "Information security, privacy and compliance team (DPO). Answer about access control, classification, data protection and personal data."},
        "dominios": {"name": "Business Domains / Analytics", "description": "Business areas and analysts who produce and consume data. Bring the consumption perspective (discovery, trust, self-service), with less technical depth - hence lower weight in maturity.", "subarea_label": "Business area (e.g., Credit, Cards, Investments)"},
    },
    "es": {
        "lideranca": {"name": "Liderazgo / Patrocinio", "description": "CDO, direccion de datos, patrocinadores ejecutivos. Responden sobre estrategia, patrocinio, financiamiento y organizacion de datos."},
        "governanca_office": {"name": "Gobierno / Data Office", "description": "Equipo de gobierno, data stewards, oficina de datos. Responden sobre politicas, catalogo, calidad y metadatos."},
        "plataforma": {"name": "Plataforma / Ingenieria de Datos", "description": "Equipo de plataforma e ingenieria de datos. Responden sobre infraestructura, pipelines, aprovisionamiento y operaciones."},
        "arquitetura_area": {"name": "Arquitectura de Datos / Soluciones", "description": "Arquitectos de datos y soluciones. Responden sobre estandares de arquitectura, integracion, modelado y reuso."},
        "seguranca_area": {"name": "Seguridad y Privacidad", "description": "Equipo de seguridad de la informacion, privacidad y compliance (DPO). Responden sobre control de acceso, clasificacion, proteccion de datos y datos personales."},
        "dominios": {"name": "Dominios de Negocio / Analytics", "description": "Areas de negocio y analistas que producen y consumen datos. Aportan la perspectiva de consumo (descubrimiento, confianza, self-service), con menor profundidad tecnica - por eso menor peso en la madurez.", "subarea_label": "Area de negocio (ej.: Credito, Tarjetas, Inversiones)"},
    },
}

# Topologias: todos os campos textuais.
TOPOLOGIES = {
    "en": {
        "fundacao": {"name": "Centralized Model (Foundation)", "tagline": "Not yet time for Data Mesh. First, build the foundation.",
            "central_control": "High", "autonomy": "Low",
            "workspaces": "1-2 workspaces (dev/prod), run by a central team.",
            "governance": "1 central Unity Catalog metastore; catalogs by environment or subject; a single platform team defines everything.",
            "sharing": "Internal sharing via Unity Catalog permissions; Delta Sharing not yet needed.",
            "description": "The organization still has silos, low governance and little data culture. Distributing ownership now amplifies the chaos. The goal is to consolidate data in a governed lakehouse, establish Unity Catalog as the single governance point, and create the first policies, roles and reliable pipelines.",
            "databricks_setup": ["Unity Catalog as the single governance metastore (catalog, access control, lineage).", "Medallion architecture (bronze/silver/gold) with Delta Lake.", "Lakeflow Declarative Pipelines (DLT) for reliable ingestion/transformation.", "Lakehouse Federation to query external sources without moving data (extends governance right away).", "Single catalog as the discovery source; tags and comments (including AI-generated)."],
            "risk_if_forced": "Distributing domains and workspaces without central governance results in new silos, data duplication and loss of access and cost control."},
        "governado": {"name": "Coordinated Model (central hub with logical domains)", "tagline": "Logical domains on a central platform. Autonomy starts to emerge.",
            "central_control": "Medium-high", "autonomy": "Low-medium",
            "workspaces": "Few workspaces (e.g., per environment); domains exist as catalogs, not as separate workspaces.",
            "governance": "1 Unity Catalog metastore; one catalog per data domain; central platform team supported by the first domain stewards.",
            "sharing": "Cross-domain sharing via Unity Catalog grants; first certified data products.",
            "description": "The foundation exists. Now business domains are represented as catalogs in Unity Catalog, with named owners and stewards but still closely supported by the central team. The notion of data as a product begins: the first datasets are documented, certified and made available for consumption.",
            "databricks_setup": ["One Unity Catalog catalog per data domain, with named owners/stewards.", "First data products: certified tables, with tags, comments and simple contracts.", "Lakehouse Monitoring and expectations (DLT) for critical data quality.", "System tables for usage and cost observability per catalog/domain.", "Databricks Marketplace/internal Discovery to find data products."],
            "risk_if_forced": "Giving fully independent workspaces and infrastructure to still-immature domains creates standard divergence and governance rework."},
        "harmonizado": {"name": "Hub-and-Spoke Model (domains with their own workspace)", "tagline": "Domains with their own workspace and strong central standards.",
            "central_control": "Medium (central standards, distributed execution)", "autonomy": "Medium-high",
            "workspaces": "One workspace per domain (spoke) on a central governance hub; dev/prod environments per domain.",
            "governance": "Central Unity Catalog (1 metastore per region); catalog(s) per domain; federated governance: global standards defined by the hub, execution by the domains.",
            "sharing": "Delta Sharing and cross-catalog grants to exchange data products across domains without copying.",
            "description": "Domains are mature enough to run their own environments. A hub-and-spoke model is adopted: the central hub defines standards for security, quality and interoperability (federated governance), while each domain (spoke) has autonomy to build and operate its data products. Products are the unit of exchange between domains.",
            "databricks_setup": ["Workspace topology per domain (spokes) on a central Unity Catalog metastore (hub).", "Federated governance: attribute-based access policies (ABAC), tags and masking applied by default.", "Delta Sharing to share data products across domains (and partners) without duplication.", "Data contracts and SLAs per product; certification and metric views for consistent metrics.", "CI/CD (Databricks Asset Bundles) for self-service pipelines and infrastructure per domain."],
            "risk_if_forced": "Without strong central standards (the 'hub'), spoke autonomy degenerates into silos again; federated governance is what prevents this."},
        "federado": {"name": "Decentralized Model (autonomous domains)", "tagline": "Maximum domain autonomy with federated computational governance.",
            "central_control": "Low-medium (automated governance, not manual)", "autonomy": "High",
            "workspaces": "Multiple workspaces per domain (and even metastores per region/BU when needed), provisioned via self-service.",
            "governance": "Federated computational governance: global standards applied automatically via Unity Catalog (ABAC, tags, policies), with full local autonomy.",
            "sharing": "Delta Sharing and Marketplace as the standard to exchange data products across domains, BUs, partners and even clouds.",
            "description": "The organization has high maturity in people, processes and technology. The four Data Mesh principles are present: domains fully own their data as products, the platform is truly self-service, and governance is federated and computational (applied by code/policy, not by ticket). The central role shifts from 'executing' to 'enabling and defining global standards'.",
            "databricks_setup": ["Full self-service: domains provision governed workspaces, catalogs and pipelines on demand (DABs/IaC).", "Federated computational governance in Unity Catalog: ABAC, tags, masking and global policies applied automatically.", "Delta Sharing + Databricks Marketplace as a mesh of data products across domains, BUs and organizations.", "Clean Rooms for collaboration on sensitive data across domains/partners.", "FinOps per domain/product via system tables; cost and value attributed to each data product."],
            "risk_if_forced": "This model requires real maturity; adopted too early, autonomy without culture and automated governance leads to fragmentation and compliance risk."},
    },
    "es": {
        "fundacao": {"name": "Modelo Centralizado (Fundación)", "tagline": "Aun no es momento de Data Mesh. Primero, construir la fundacion.",
            "central_control": "Alto", "autonomy": "Baja",
            "workspaces": "1-2 workspaces (dev/prod), operados por un equipo central.",
            "governance": "1 metastore Unity Catalog central; catalogos por ambiente o por tema; un unico equipo de plataforma define todo.",
            "sharing": "Comparticion interna via permisos de Unity Catalog; Delta Sharing aun no necesario.",
            "description": "La organizacion aun tiene silos, bajo gobierno y poca cultura de datos. Distribuir la propiedad ahora amplifica el caos. El objetivo es consolidar los datos en un lakehouse gobernado, establecer Unity Catalog como punto unico de gobierno y crear las primeras politicas, roles y pipelines confiables.",
            "databricks_setup": ["Unity Catalog como metastore unico de gobierno (catalogo, control de acceso, linaje).", "Arquitectura medallion (bronze/silver/gold) con Delta Lake.", "Lakeflow Declarative Pipelines (DLT) para ingesta/transformacion confiables.", "Lakehouse Federation para consultar fuentes externas sin mover datos (amplia el gobierno de inmediato).", "Catalogo unico como fuente de descubrimiento; tags y comentarios (incluso generados por IA)."],
            "risk_if_forced": "Distribuir dominios y workspaces sin gobierno central resulta en nuevos silos, duplicacion de datos y perdida de control de acceso y costo."},
        "governado": {"name": "Modelo Coordinado (hub central con dominios lógicos)", "tagline": "Dominios logicos sobre plataforma central. La autonomia empieza a nacer.",
            "central_control": "Medio-alto", "autonomy": "Baja-media",
            "workspaces": "Pocos workspaces (ej.: por ambiente); los dominios existen como catalogos, no como workspaces separados.",
            "governance": "1 metastore Unity Catalog; un catalogo por dominio de datos; equipo central de plataforma con apoyo de los primeros stewards de dominio.",
            "sharing": "Comparticion entre dominios via grants de Unity Catalog; primeros productos de datos certificados.",
            "description": "La fundacion existe. Ahora los dominios de negocio se representan como catalogos en Unity Catalog, con owners y stewards nombrados pero aun apoyados de cerca por el equipo central. Comienza la nocion de datos como producto: los primeros conjuntos se documentan, certifican y ponen a disposicion para consumo.",
            "databricks_setup": ["Un catalogo de Unity Catalog por dominio de datos, con owners/stewards nombrados.", "Primeros productos de datos: tablas certificadas, con tags, comentarios y contratos simples.", "Lakehouse Monitoring y expectativas (DLT) para la calidad de los datos criticos.", "System tables para observabilidad de uso y costo por catalogo/dominio.", "Databricks Marketplace/Discovery interno para descubrir los productos de datos."],
            "risk_if_forced": "Dar workspaces e infraestructura totalmente independientes a dominios aun poco maduros genera divergencia de estandares y retrabajo de gobierno."},
        "harmonizado": {"name": "Modelo Hub-and-Spoke (dominios con workspace propio)", "tagline": "Dominios con workspace propio y estandares centrales fuertes.",
            "central_control": "Medio (estandares centrales, ejecucion distribuida)", "autonomy": "Media-alta",
            "workspaces": "Un workspace por dominio (spoke) sobre un hub central de gobierno; ambientes dev/prod por dominio.",
            "governance": "Unity Catalog central (1 metastore por region); catalogo(s) por dominio; gobierno federado: estandares globales definidos por el hub, ejecucion por los dominios.",
            "sharing": "Delta Sharing y grants cross-catalog para intercambiar productos de datos entre dominios sin copia.",
            "description": "Los dominios ya tienen madurez para operar sus propios ambientes. Se adopta un modelo hub-and-spoke: el hub central define estandares de seguridad, calidad e interoperabilidad (gobierno federado), mientras cada dominio (spoke) tiene autonomia para crear y operar sus productos de datos. Los productos son la unidad de intercambio entre dominios.",
            "databricks_setup": ["Topologia de workspaces por dominio (spokes) sobre metastore Unity Catalog central (hub).", "Gobierno federado: politicas de acceso basadas en atributos (ABAC), tags y enmascaramiento aplicados por defecto.", "Delta Sharing para compartir productos de datos entre dominios (y socios) sin duplicar.", "Contratos de datos y SLA por producto; certificacion y metric views para metricas consistentes.", "CI/CD (Databricks Asset Bundles) para pipelines e infraestructura self-service por dominio."],
            "risk_if_forced": "Sin estandares centrales fuertes (el 'hub'), la autonomia de los spokes degenera en silos otra vez; el gobierno federado es lo que lo evita."},
        "federado": {"name": "Modelo Descentralizado (dominios autónomos)", "tagline": "Maxima autonomia de los dominios con gobierno computacional federado.",
            "central_control": "Bajo-medio (gobierno automatizado, no manual)", "autonomy": "Alta",
            "workspaces": "Multiples workspaces por dominio (e incluso metastores por region/BU cuando es necesario), aprovisionados via self-service.",
            "governance": "Gobierno computacional federado: estandares globales aplicados automaticamente via Unity Catalog (ABAC, tags, policies), con autonomia local plena.",
            "sharing": "Delta Sharing y Marketplace como estandar para intercambiar productos de datos entre dominios, BUs, socios e incluso entre nubes.",
            "description": "La organizacion tiene alta madurez en personas, procesos y tecnologia. Los cuatro principios de Data Mesh estan presentes: los dominios son duenos plenos de sus datos como productos, la plataforma es verdaderamente self-service y el gobierno es federado y computacional (aplicado por codigo/politica, no por ticket). El rol central pasa de 'ejecutar' a 'habilitar y definir estandares globales'.",
            "databricks_setup": ["Self-service completo: los dominios aprovisionan workspaces, catalogos y pipelines gobernados bajo demanda (DABs/IaC).", "Gobierno computacional federado en Unity Catalog: ABAC, tags, enmascaramiento y politicas globales aplicadas automaticamente.", "Delta Sharing + Databricks Marketplace como malla de productos de datos entre dominios, BUs y organizaciones.", "Clean Rooms para colaboracion sobre datos sensibles entre dominios/socios.", "FinOps por dominio/producto via system tables; costo y valor atribuidos a cada producto de datos."],
            "risk_if_forced": "Este modelo exige madurez real; adoptado demasiado pronto, la autonomia sin cultura y sin gobierno automatizado lleva a la fragmentacion y al riesgo de cumplimiento."},
    },
}

# Rotulos dos produtos Databricks (parte antes do '-').
PRODUCTS = {
    "en": {
        "unity_catalog": "Unity Catalog - unified governance (catalog, access, lineage, tags).",
        "delta_lake": "Delta Lake - open transactional format (ACID, time travel).",
        "lakeflow_pipelines": "Lakeflow Declarative Pipelines (DLT) - declarative pipelines with quality.",
        "lakeflow_jobs": "Lakeflow Jobs - workflow orchestration.",
        "lakeflow_connect": "Lakeflow Connect - managed ingestion connectors.",
        "lakehouse_federation": "Lakehouse Federation - federated queries to external sources without moving data.",
        "delta_sharing": "Delta Sharing - open data sharing without copying.",
        "marketplace": "Databricks Marketplace - discovery and distribution of data products.",
        "lakehouse_monitoring": "Lakehouse Monitoring - quality and drift monitoring.",
        "system_tables": "System Tables - usage, cost, access and lineage observability.",
        "abac": "ABAC / Row & Column masking - fine-grained attribute-based access control.",
        "clean_rooms": "Clean Rooms - secure collaboration on sensitive data.",
        "aibi": "Databricks AI/BI (Dashboards + Genie) - BI and analytics in natural language.",
        "metric_views": "Metric Views - consistent, governed business metrics.",
        "dabs": "Databricks Asset Bundles - CI/CD and IaC for data and apps.",
        "compliance": "Compliance Security Profile / PrivateLink - isolation and compliance.",
        "lineage": "Data Lineage - automated lineage down to column level.",
        "lakebase": "Lakebase - managed Postgres integrated with the lakehouse.",
    },
    "es": {
        "unity_catalog": "Unity Catalog - gobierno unificado (catalogo, acceso, linaje, tags).",
        "delta_lake": "Delta Lake - formato transaccional abierto (ACID, time travel).",
        "lakeflow_pipelines": "Lakeflow Declarative Pipelines (DLT) - pipelines declarativos con calidad.",
        "lakeflow_jobs": "Lakeflow Jobs - orquestacion de workflows.",
        "lakeflow_connect": "Lakeflow Connect - conectores gestionados de ingesta.",
        "lakehouse_federation": "Lakehouse Federation - consultas federadas a fuentes externas sin mover datos.",
        "delta_sharing": "Delta Sharing - comparticion abierta de datos sin copia.",
        "marketplace": "Databricks Marketplace - descubrimiento y distribucion de productos de datos.",
        "lakehouse_monitoring": "Lakehouse Monitoring - monitoreo de calidad y drift.",
        "system_tables": "System Tables - observabilidad de uso, costo, acceso y linaje.",
        "abac": "ABAC / Row & Column masking - control de acceso fino basado en atributos.",
        "clean_rooms": "Clean Rooms - colaboracion segura sobre datos sensibles.",
        "aibi": "Databricks AI/BI (Dashboards + Genie) - BI y analitica en lenguaje natural.",
        "metric_views": "Metric Views - metricas de negocio consistentes y gobernadas.",
        "dabs": "Databricks Asset Bundles - CI/CD e IaC para datos y apps.",
        "compliance": "Compliance Security Profile / PrivateLink - aislamiento y cumplimiento.",
        "lineage": "Data Lineage - linaje automatizado hasta nivel de columna.",
        "lakebase": "Lakebase - Postgres gestionado integrado al lakehouse.",
    },
}

# Recomendacoes por id (funcao:indice).
RECS = {
    "en": {
        "governanca:0": "Adopt Unity Catalog as the single governance point (catalog, access control, lineage and auditing).",
        "governanca:1": "Formalize data owner and steward roles per domain and reflect that in the catalog structure.",
        "governanca:2": "Publish data policies (classification, retention, use) and apply them via tags and policies in Unity Catalog.",
        "governanca:3": "Evolve to federated computational governance: global standards applied by code (ABAC, tags, policies) with domain autonomy.",
        "arquitetura:0": "Consolidate data in a governed lakehouse with medallion architecture (bronze/silver/gold) on Delta Lake.",
        "arquitetura:1": "Use Lakehouse Federation to integrate external sources under single governance, without moving data (extends governance immediately).",
        "arquitetura:2": "Organize catalogs by data domain and define a workspace topology suited to the maturity level.",
        "arquitetura:3": "Adopt Delta Sharing to exchange data products across domains without duplication, evolving into a mesh.",
        "metadados:0": "Centralize metadata and discovery in Unity Catalog, with tags and comments (including AI-generated documentation).",
        "metadados:1": "Enable automated lineage (down to column level) for critical pipelines.",
        "metadados:2": "Make data products discoverable via Marketplace/internal Discovery, with contracts and SLAs.",
        "modelagem:0": "Establish modeling and reuse standards, versioned alongside the pipeline code.",
        "modelagem:1": "Model the consumption layer (gold) with consistent standards and materialize it via Lakeflow Declarative Pipelines.",
        "modelagem:2": "Standardize business metrics with Metric Views to avoid multiple 'truths' across domains.",
        "operacoes:0": "Replace manual scripts with managed ingestion (Lakeflow Connect) and declarative pipelines (DLT).",
        "operacoes:1": "Orchestrate with Lakeflow Jobs and version everything with Databricks Asset Bundles (CI/CD).",
        "operacoes:2": "Enable self-service provisioning of governed environments per domain (DABs/IaC + serverless).",
        "operacoes:3": "Implement data FinOps with System Tables: cost per domain/product and continuous optimization (serverless).",
        "qualidade:0": "Define quality expectations in the pipelines (DLT expectations) for critical data.",
        "qualidade:1": "Continuously monitor quality and drift with Lakehouse Monitoring, with SLAs per critical data.",
        "qualidade:2": "Publish quality metrics per data product and alert automatically on SLA violations.",
        "dados_mestres:0": "Define the master concepts (customer, product, etc.) and their owners; eliminate redundant records.",
        "dados_mestres:1": "Build a single base per master concept (golden record) with entity-resolution pipelines.",
        "dados_mestres:2": "Provide master/reference data as governed products, consumed via grants/Delta Sharing (without copying).",
        "seguranca:0": "Centralize access control in Unity Catalog by groups/roles.",
        "seguranca:1": "Apply information classification via tags and enable access auditing with System Tables.",
        "seguranca:2": "Adopt fine-grained access control (row/column) based on attributes (ABAC) and dynamic masking.",
        "seguranca:3": "Isolate per domain with private network and security/compliance profiles (PrivateLink, Compliance Security Profile).",
        "privacidade:0": "Map and tag personal/sensitive data in Unity Catalog (the basis for LGPD/GDPR).",
        "privacidade:1": "Apply dynamic masking by label/attribute to personal and sensitive data.",
        "privacidade:2": "Adopt privacy by design and Clean Rooms for collaboration on sensitive data without exposure.",
    },
    "es": {
        "governanca:0": "Adoptar Unity Catalog como punto unico de gobierno (catalogo, control de acceso, linaje y auditoria).",
        "governanca:1": "Formalizar los roles de data owner y steward por dominio y reflejarlo en la estructura de catalogos.",
        "governanca:2": "Publicar politicas de datos (clasificacion, retencion, uso) y aplicarlas via tags y policies en Unity Catalog.",
        "governanca:3": "Evolucionar a gobierno computacional federado: estandares globales aplicados por codigo (ABAC, tags, policies) con autonomia de los dominios.",
        "arquitetura:0": "Consolidar los datos en un lakehouse gobernado con arquitectura medallion (bronze/silver/gold) sobre Delta Lake.",
        "arquitetura:1": "Usar Lakehouse Federation para integrar fuentes externas bajo gobierno unico, sin mover datos (amplia el gobierno de inmediato).",
        "arquitetura:2": "Organizar catalogos por dominio de datos y definir una topologia de workspaces adecuada a la madurez.",
        "arquitetura:3": "Adoptar Delta Sharing para intercambiar productos de datos entre dominios sin duplicacion, evolucionando a una malla.",
        "metadados:0": "Centralizar metadatos y descubrimiento en Unity Catalog, con tags y comentarios (incluida documentacion generada por IA).",
        "metadados:1": "Habilitar linaje automatizado (hasta nivel de columna) para los pipelines criticos.",
        "metadados:2": "Poner productos de datos descubribles via Marketplace/Discovery interno, con contratos y SLA.",
        "modelagem:0": "Establecer estandares de modelado y reuso, versionados junto al codigo de los pipelines.",
        "modelagem:1": "Modelar la capa de consumo (gold) con estandares consistentes y materializarla via Lakeflow Declarative Pipelines.",
        "modelagem:2": "Estandarizar metricas de negocio con Metric Views para evitar multiples 'verdades' entre dominios.",
        "operacoes:0": "Reemplazar scripts manuales por ingesta gestionada (Lakeflow Connect) y pipelines declarativos (DLT).",
        "operacoes:1": "Orquestar con Lakeflow Jobs y versionar todo con Databricks Asset Bundles (CI/CD).",
        "operacoes:2": "Habilitar aprovisionamiento self-service de ambientes gobernados por dominio (DABs/IaC + serverless).",
        "operacoes:3": "Implementar FinOps de datos con System Tables: costo por dominio/producto y optimizacion continua (serverless).",
        "qualidade:0": "Definir expectativas de calidad en los pipelines (DLT expectations) para datos criticos.",
        "qualidade:1": "Monitorear continuamente calidad y drift con Lakehouse Monitoring, con SLA por dato critico.",
        "qualidade:2": "Publicar metricas de calidad por producto de datos y alertar automaticamente ante violaciones de SLA.",
        "dados_mestres:0": "Definir los conceptos maestros (cliente, producto, etc.) y sus owners; eliminar registros redundantes.",
        "dados_mestres:1": "Construir una base unica por concepto maestro (golden record) con pipelines de resolucion de entidad.",
        "dados_mestres:2": "Poner los datos maestros/de referencia como productos gobernados, consumidos via grants/Delta Sharing (sin copia).",
        "seguranca:0": "Centralizar el control de acceso en Unity Catalog por grupos/roles.",
        "seguranca:1": "Aplicar clasificacion de la informacion via tags y habilitar auditoria de acceso con System Tables.",
        "seguranca:2": "Adoptar control de acceso fino (fila/columna) basado en atributos (ABAC) y enmascaramiento dinamico.",
        "seguranca:3": "Aislar por dominio con red privada y perfiles de seguridad/compliance (PrivateLink, Compliance Security Profile).",
        "privacidade:0": "Mapear y etiquetar datos personales/sensibles en Unity Catalog (base para LGPD/GDPR).",
        "privacidade:1": "Aplicar enmascaramiento dinamico por etiqueta/atributo a los datos personales y sensibles.",
        "privacidade:2": "Adoptar privacy by design y Clean Rooms para colaboracion sobre datos sensibles sin exposicion.",
    },
}

CONSEQUENCES = {
    "en": {
        "governanca": "Decisions without clear authority, rework, compliance risk and low trust in data.",
        "arquitetura": "Silos, redundancy, fragile integrations and high maintenance cost.",
        "metadados": "Hard to discover and trust data; rework and dependence on key people.",
        "modelagem": "Inconsistent structures, low reuse and multiple business 'truths'.",
        "operacoes": "Fragile pipelines, slow provisioning, uncontrolled cost and low reliability.",
        "qualidade": "Decisions based on incorrect data, rework and loss of business trust.",
        "dados_mestres": "Redundant records, inconsistency across systems and worse data quality.",
        "seguranca": "Exposure to improper access, leaks and regulatory non-compliance.",
        "privacidade": "Risk of sanctions (LGPD/GDPR), loss of credibility and exposure of personal data.",
    },
    "es": {
        "governanca": "Decisiones sin autoridad clara, retrabajo, riesgo de cumplimiento y baja confianza en los datos.",
        "arquitetura": "Silos, redundancia, integraciones fragiles y alto costo de mantenimiento.",
        "metadados": "Dificultad para descubrir y confiar en los datos; retrabajo y dependencia de personas clave.",
        "modelagem": "Estructuras inconsistentes, bajo reuso y multiples 'verdades' de negocio.",
        "operacoes": "Pipelines fragiles, aprovisionamiento lento, costo sin control y baja confiabilidad.",
        "qualidade": "Decisiones basadas en datos incorrectos, retrabajo y perdida de confianza del negocio.",
        "dados_mestres": "Registros redundantes, inconsistencia entre sistemas y peor calidad de datos.",
        "seguranca": "Exposicion a accesos indebidos, fugas e incumplimiento regulatorio.",
        "privacidade": "Riesgo de sanciones (LGPD/GDPR), perdida de credibilidad y exposicion de datos personales.",
    },
}

HORIZON = {
    "en": {2: "Horizon 1 (0-3m)", 3: "Horizon 2 (3-9m)", 4: "Horizon 3 (9+m)"},
    "es": {2: "Horizonte 1 (0-3m)", 3: "Horizonte 2 (3-9m)", 4: "Horizonte 3 (9+m)"},
}

ROADMAP_META = {
    "en": {
        2: {"name": "Horizon 1 - Foundation", "window": "0 to 3 months", "goal": "Consolidate the governed lakehouse and leave the Reactive stage."},
        3: {"name": "Horizon 2 - Standardization", "window": "3 to 9 months", "goal": "Standardize practices across areas and enable data products."},
        4: {"name": "Horizon 3 - Federation", "window": "9+ months", "goal": "Evolve to federated governance and a mesh of data products."},
    },
    "es": {
        2: {"name": "Horizonte 1 - Fundacion", "window": "0 a 3 meses", "goal": "Consolidar el lakehouse gobernado y salir de la etapa Reactiva."},
        3: {"name": "Horizonte 2 - Estandarizacion", "window": "3 a 9 meses", "goal": "Estandarizar practicas en varias areas y habilitar productos de datos."},
        4: {"name": "Horizonte 3 - Federacion", "window": "9+ meses", "goal": "Evolucionar a gobierno federado y una malla de productos de datos."},
    },
}

DATA_PRODUCTS = {
    "en": {
        "title": "First data products",
        "intro": "A data product is an asset with owner, contract, documentation, usage rules, guaranteed quality and SLA - discoverable and consumable by other domains. In Databricks it materializes as certified tables/views in Unity Catalog, with tags, lineage, metric views and distribution via Marketplace/Delta Sharing.",
        "checklist": ["Owner and steward named (People dimension).", "Data contract: schema, semantics and guarantees (Process dimension).", "Quality monitored (DLT expectations + Lakehouse Monitoring).", "Documentation and discovery (comments, tags, catalog).", "Update and availability SLA published.", "Access control and classification applied (Unity Catalog / ABAC)."],
        "rec": {
            "fundacao": "Start with 1-2 pilot data products on the most reliable data, within a central catalog, to create a reference before distributing ownership.",
            "governado": "Establish one data product per priority domain, each in its catalog, with an owner from the domain itself and central support.",
            "harmonizado": "Each domain publishes its data products in its own workspace/catalog and shares them via Delta Sharing; standardize contracts and SLAs through the central hub.",
            "federado": "Treat data products as the operational standard: self-service publishing, versioned contracts and distribution via Marketplace/Delta Sharing across domains and organizations.",
        },
    },
    "es": {
        "title": "Primeros productos de datos",
        "intro": "Un producto de datos es un activo con owner, contrato, documentacion, reglas de uso, calidad garantizada y SLA - descubrible y consumible por los demas dominios. En Databricks se materializa como tablas/vistas certificadas en Unity Catalog, con tags, linaje, metric views y distribucion via Marketplace/Delta Sharing.",
        "checklist": ["Owner y steward nombrados (dimension Personas).", "Contrato de datos: schema, semantica y garantias (dimension Procesos).", "Calidad monitoreada (DLT expectations + Lakehouse Monitoring).", "Documentacion y descubrimiento (comentarios, tags, catalogo).", "SLA de actualizacion y disponibilidad publicado.", "Control de acceso y clasificacion aplicados (Unity Catalog / ABAC)."],
        "rec": {
            "fundacao": "Comience con 1-2 productos de datos piloto sobre los datos mas confiables, dentro de un catalogo central, para crear referencia antes de distribuir la propiedad.",
            "governado": "Establezca un producto de datos por dominio prioritario, cada uno en su catalogo, con owner del propio dominio y apoyo central.",
            "harmonizado": "Cada dominio publica sus productos de datos en su propio workspace/catalogo y los comparte via Delta Sharing; estandarice contratos y SLA por el hub central.",
            "federado": "Trate los productos de datos como estandar operativo: publicacion self-service, contratos versionados y distribucion via Marketplace/Delta Sharing entre dominios y organizaciones.",
        },
    },
}

FEDERATION = {
    "en": {"title": "Data federation as a quick governance win",
           "text": "Even with data still outside the platform, you can extend governance immediately: Lakehouse Federation lets you query external sources (relational databases, data warehouses) under the same Unity Catalog governance, without moving the data. It is a low-effort path to extend catalog, lineage and access control to data that has not yet been migrated."},
    "es": {"title": "Federacion de datos como ganancia rapida de gobierno",
           "text": "Incluso con datos aun fuera de la plataforma, es posible ampliar el gobierno de inmediato: Lakehouse Federation permite consultar fuentes externas (bases relacionales, data warehouses) bajo el mismo gobierno de Unity Catalog, sin mover los datos. Es un camino de bajo esfuerzo para extender catalogo, linaje y control de acceso a datos aun no migrados."},
}

KEY_MESSAGES = {
    "en": [
        {"title": "Data Mesh is a paradigm, not a product", "text": "Data Mesh is an organizational and architectural approach to data at scale - not something you buy.",
         "bullets": ["The Databricks Lakehouse provides the technical enablers (Unity Catalog, domains/workspaces, data products, Delta Sharing).", "You can apply data-product and governance principles without adopting a full Data Mesh.", "The change involves people and processes, not only technology."]},
        {"title": "There is no single Data Mesh format", "text": "Data Mesh is a spectrum, ranging from more centralized to more federated.",
         "bullets": ["More centralized: fewer workspaces, less domain autonomy, strong central control.", "More federated: more workspaces, greater domain autonomy, computational governance.", "The right topology depends on the organization's maturity - and it evolves over time."]},
        {"title": "Start centralized, evolve to federated", "text": "For most enterprise customers, the recommended model is federated / hub-and-spoke, reached in stages.",
         "bullets": ["A central team provides platform, Unity Catalog, security, standards and guardrails.", "Domains are responsible for their pipelines, quality and data products.", "Maturity evolves from centralized to federated; forcing the final stage too early creates chaos."]},
        {"title": "The 4 principles, mapped to Databricks", "text": "Each Data Mesh principle has a technical enabler in Databricks:",
         "bullets": ["Domain ownership -> domains / workspaces (local ownership and autonomy).", "Data as a product -> assets with owner, contract, documentation, quality and SLA.", "Self-service platform -> infrastructure that reduces the domains' effort.", "Federated governance -> Unity Catalog (catalog, discovery, lineage, access, classification, auditing)."]},
    ],
    "es": [
        {"title": "Data Mesh es un paradigma, no un producto", "text": "Data Mesh es un enfoque organizacional y arquitectonico para datos a escala - no es algo que se compra.",
         "bullets": ["El Databricks Lakehouse provee los habilitadores tecnicos (Unity Catalog, dominios/workspaces, productos de datos, Delta Sharing).", "Es posible aplicar principios de productos de datos y gobierno sin adoptar un Data Mesh completo.", "El cambio involucra personas y procesos, no solo tecnologia."]},
        {"title": "No existe un unico formato de Data Mesh", "text": "Data Mesh es un espectro, que va de mas centralizado a mas federado.",
         "bullets": ["Mas centralizado: menos workspaces, menor autonomia de los dominios, control central fuerte.", "Mas federado: mas workspaces, mayor autonomia de los dominios, gobierno computacional.", "La topologia correcta depende de la madurez de la organizacion - y evoluciona con el tiempo."]},
        {"title": "Empiece centralizado, evolucione a federado", "text": "Para la mayoria de los clientes enterprise, el modelo recomendado es federado / hub-and-spoke, alcanzado por etapas.",
         "bullets": ["Un equipo central provee plataforma, Unity Catalog, seguridad, estandares y guardrails.", "Los dominios son responsables de sus pipelines, calidad y productos de datos.", "La madurez evoluciona de centralizada a federada; forzar la etapa final demasiado pronto genera caos."]},
        {"title": "Los 4 principios, mapeados a Databricks", "text": "Cada principio de Data Mesh tiene un habilitador tecnico en Databricks:",
         "bullets": ["Propiedad por dominio -> dominios / workspaces (propiedad local y autonomia).", "Datos como producto -> activos con owner, contrato, documentacion, calidad y SLA.", "Plataforma self-service -> infraestructura que reduce el esfuerzo de los dominios.", "Gobierno federado -> Unity Catalog (catalogo, descubrimiento, linaje, acceso, clasificacion, auditoria)."]},
    ],
}

# Templates para strings dinamicas do relatorio.
HEADLINE = {
    "en": "{who} is at maturity stage '{stage}' (global score {score} of 4.0). Given this maturity, the recommended Data Mesh topology is '{topo}': {tagline} {nxt}Data Mesh is a paradigm adopted in stages: the recommendations below show how to raise maturity with Databricks products and solutions until this model becomes viable.",
    "es": "{who} esta en la etapa de madurez '{stage}' (nota global {score} de 4,0). Dada esta madurez, la topologia de Data Mesh recomendada es '{topo}': {tagline} {nxt}Data Mesh es un paradigma que se adopta por etapas: las recomendaciones a continuacion muestran como elevar la madurez con productos y soluciones Databricks hasta viabilizar este modelo.",
}
HEADLINE_NEXT = {
    "en": "The next evolution step is '{next}'. ",
    "es": "El siguiente paso de evolucion es '{next}'. ",
}
HEADLINE_WHO = {"en": "The organization", "es": "La organizacion"}
HEADLINE_EMPTY = {"en": "Assessment does not have enough responses yet to generate a diagnosis.",
                  "es": "El assessment aun no tiene respuestas suficientes para generar un diagnostico."}
STRENGTH = {
    "en": "{function} at '{stage}' stage (score {score}) - maintain and use as a reference for the other domains.",
    "es": "{function} en etapa '{stage}' (nota {score}) - mantener y usar como referencia para los demas dominios.",
}

# Notas das referencias (por url).
REF_NOTES = {
    "en": {
        "https://martinfowler.com/articles/data-monolith-to-mesh.html": "Original article that coined the term Data Mesh.",
        "https://martinfowler.com/articles/data-mesh-principles.html": "The 4 principles and the logical architecture of Data Mesh.",
        "https://databricks.atlassian.net/wiki/spaces/FE/pages/2707785997": "Main hub: POV, L100/L200/L300 decks, patterns and use cases.",
        "https://docs.google.com/presentation/d/1kIwyrbFrNQYtQzdAMxW1L7NAJ5eZxJ4wGf5y2J4kj0Y": "Full deck: operating models, maturity and responsibilities.",
        "https://docs.databricks.com/aws/en/data-governance/unity-catalog/best-practices": "Base guide to design governance with Unity Catalog.",
        "https://docs.databricks.com/aws/en/data-governance/unity-catalog": "Harmonized mesh, hub-and-spoke, distributed and centralized publishing.",
        "https://databricks.atlassian.net/wiki/spaces/FE/pages/3337683824": "Platform vs domain responsibilities, data contracts, quality, SLAs, publishing.",
        "https://docs.google.com/presentation/d/12icNRpQOrADr9Ofh6S-edp8eEDwlhGvC1gco9AMZ10g": "Full Lakehouse + Data Mesh narrative.",
        "https://docs.databricks.com/aws/en/data-governance": "Official data and AI governance documentation.",
        "https://docs.databricks.com/aws/en/query-federation": "Federated queries to external sources without moving data.",
        "https://docs.databricks.com/aws/en/delta-sharing": "Open data sharing without copying.",
    },
    "es": {
        "https://martinfowler.com/articles/data-monolith-to-mesh.html": "Articulo original que acuno el termino Data Mesh.",
        "https://martinfowler.com/articles/data-mesh-principles.html": "Los 4 principios y la arquitectura logica del Data Mesh.",
        "https://databricks.atlassian.net/wiki/spaces/FE/pages/2707785997": "Hub principal: POV, decks L100/L200/L300, patrones y casos de uso.",
        "https://docs.google.com/presentation/d/1kIwyrbFrNQYtQzdAMxW1L7NAJ5eZxJ4wGf5y2J4kj0Y": "Deck completo: modelos operativos, madurez y responsabilidades.",
        "https://docs.databricks.com/aws/en/data-governance/unity-catalog/best-practices": "Guia base para disenar gobierno con Unity Catalog.",
        "https://docs.databricks.com/aws/en/data-governance/unity-catalog": "Harmonized mesh, hub-and-spoke, publicacion distribuida y centralizada.",
        "https://databricks.atlassian.net/wiki/spaces/FE/pages/3337683824": "Responsabilidades plataforma vs dominios, data contracts, calidad, SLAs, publicacion.",
        "https://docs.google.com/presentation/d/12icNRpQOrADr9Ofh6S-edp8eEDwlhGvC1gco9AMZ10g": "Narrativa completa Lakehouse + Data Mesh.",
        "https://docs.databricks.com/aws/en/data-governance": "Documentacion oficial de gobierno de datos e IA.",
        "https://docs.databricks.com/aws/en/query-federation": "Consultas federadas a fuentes externas sin mover datos.",
        "https://docs.databricks.com/aws/en/delta-sharing": "Comparticion abierta de datos sin copia.",
    },
}


# "delta" (o que muda vs. etapa anterior) por topologia - traducoes.
TOPO_DELTA = {
    "en": {
        "fundacao": ["Starting point: consolidate and govern data before distributing ownership."],
        "governado": [
            "Domains get an identity: 1 catalog per domain, with named owners and stewards.",
            "The first certified data products appear.",
            "Quality and observability start being measured per domain.",
        ],
        "harmonizado": [
            "Each domain gets its own workspace (previously only logical catalogs).",
            "Federated governance: the hub sets the standards; domains execute with autonomy.",
            "Delta Sharing exchanges products across domains without copying.",
        ],
        "federado": [
            "Full autonomy: each domain can have its own workspaces (and even metastores) and setup.",
            "Fully computational governance (applied by code/policy, not by ticket).",
            "Marketplace + Delta Sharing as a product mesh across domains, BUs and organizations.",
            "The central team shifts from 'executing' to 'enabling and defining global standards'.",
        ],
    },
    "es": {
        "fundacao": ["Punto de partida: consolidar y gobernar los datos antes de distribuir la propiedad."],
        "governado": [
            "Los dominios ganan identidad: 1 catalogo por dominio, con owners y stewards nombrados.",
            "Aparecen los primeros productos de datos certificados.",
            "Calidad y observabilidad empiezan a medirse por dominio.",
        ],
        "harmonizado": [
            "Cada dominio gana su propio workspace (antes eran solo catalogos logicos).",
            "Gobierno federado: el hub define los estandares; los dominios ejecutan con autonomia.",
            "Delta Sharing intercambia productos entre dominios sin copia.",
        ],
        "federado": [
            "Autonomia plena: cada dominio puede tener sus propios workspaces (y hasta metastores) y su setup.",
            "Gobierno 100% computacional (aplicado por codigo/politica, no por ticket).",
            "Marketplace + Delta Sharing como malla de productos entre dominios, BUs y organizaciones.",
            "El equipo central pasa de 'ejecutar' a 'habilitar y definir estandares globales'.",
        ],
    },
}

# ---- Traducoes anexadas: 6 dimensoes operacionais, key messages e notas de referencia ----
DIMENSIONS["en"].update({
    "estrategia_cultura": {"name": "Strategy & Data Culture", "description": "Executive sponsorship, data/AI strategy, data as asset and product, stable funding, data-driven culture and value measurement."},
    "arquitetura_plataforma": {"name": "Architecture & Platform", "description": "Lakehouse, layered architecture (medallion), catalog, integration/federation, real-time and platform self-service capability."},
    "modelo_operacional": {"name": "Operating Model & Organization", "description": "Data team structure, roles (owners, product managers), domains, autonomy, path-to-production and distance between producer and consumer."},
    "governanca_seguranca": {"name": "Governance, Security & Privacy", "description": "Policies, stewardship, catalog/lineage, access control, classification, LGPD/privacy and audit trails."},
    "engenharia_dataops": {"name": "Engineering & DataOps", "description": "CI/CD for data, IaC, data contracts, automated quality, observability, code review and DEV/STG/PROD environments."},
    "finops_valor": {"name": "FinOps & Value", "description": "Cost visibility per domain/product, tags, showback/chargeback, continuous optimization and cost as a metric in the data product lifecycle."},
})
DIMENSIONS["es"].update({
    "estrategia_cultura": {"name": "Estrategia y Cultura de Datos", "description": "Patrocinio ejecutivo, estrategia de datos/IA, dato como activo y como producto, financiamiento estable, cultura data-driven y medición de valor."},
    "arquitetura_plataforma": {"name": "Arquitectura y Plataforma", "description": "Lakehouse, arquitectura en capas (medallion), catálogo, integración/federación, tiempo real y capacidad self-service de la plataforma."},
    "modelo_operacional": {"name": "Modelo Operacional y Organización", "description": "Estructura de equipos de datos, roles (owners, product managers), dominios, autonomía, path-to-production y distancia entre productor y consumidor."},
    "governanca_seguranca": {"name": "Gobernanza, Seguridad y Privacidad", "description": "Políticas, stewardship, catálogo/linaje, control de acceso, clasificación, LGPD/privacidad y auditoría."},
    "engenharia_dataops": {"name": "Ingeniería y DataOps", "description": "CI/CD para datos, IaC, contratos de datos, calidad automatizada, observabilidad, code review y ambientes DEV/STG/PROD."},
    "finops_valor": {"name": "FinOps y Valor", "description": "Visibilidad de costo por dominio/producto, tags, showback/chargeback, optimización continua y costo como métrica en el ciclo de vida del producto de datos."},
})
KEY_MESSAGES["en"] = [
    {"title": "Data maturity is a journey, not a project", "text": "Managing data as an asset evolves in stages, across People, Processes and Technology (DAMA-DMBOK foundation) - it is not something you buy or switch on once.", "bullets": ["The diagnostic measures maturity across 6 dimensions, from business domains to platform.", "Each stage has a corresponding operating model (teams, roles, autonomy).", "The Databricks Lakehouse provides the technical enablers for each capability."]},
    {"title": "The target data model evolves from centralized to decentralized", "text": "How a data organization is structured is a spectrum, from most centralized to most autonomous.", "bullets": ["More centralized: a central team provides platform, standards and governance; less autonomy for areas.", "More autonomous: domains own their data, on a self-service platform, with federated governance.", "The right structure depends on maturity - and organizational complexity grows with autonomy."]},
    {"title": "Start with the foundation, distribute autonomy in stages", "text": "Consolidate and govern before distributing. Autonomy only sustains value on a solid foundation.", "bullets": ["A central team provides platform, Unity Catalog, security, standards and guardrails.", "As maturity grows, domains assume their pipelines, quality and data products.", "Forcing distribution too early (without foundation and culture) creates new silos and chaos."]},
    {"title": "Data products, domains and autonomy: capabilities of a mature organization", "text": "These are data management best practices at scale. When combined at the federated end of the spectrum, the market calls it Data Mesh - here, it is one lens of the diagnostic, not the goal.", "bullets": ["Domain ownership -> domains/workspaces (local ownership and autonomy).", "Data as a product -> assets with owner, contract, documentation, quality and SLA.", "Self-service platform -> data infrastructure that reduces domain effort.", "Federated governance -> Unity Catalog (catalog, discovery, lineage, access, classification, audit)."]},
]
KEY_MESSAGES["es"] = [
    {"title": "La madurez de datos es una jornada, no un proyecto", "text": "Gestionar datos como activo evoluciona por etapas, en Personas, Procesos y Tecnología (base DAMA-DMBOK) - no es algo que se compra o se enciende de una vez.", "bullets": ["El diagnóstico mide la madurez en 6 dimensiones, desde las áreas de negocio a la plataforma.", "Cada etapa tiene un modelo operativo (equipos, roles, autonomía) correspondiente.", "El Databricks Lakehouse proporciona los habilitadores técnicos de cada capacidad."]},
    {"title": "El modelo objetivo de datos evoluciona de centralizado a descentralizado", "text": "Cómo se estructura la organización de datos es un espectro, del más centralizado al más autónomo.", "bullets": ["Más centralizado: un equipo central provee plataforma, estándares y gobernanza; menor autonomía de las áreas.", "Más autónomo: dominios dueños de sus datos, sobre una plataforma self-service, con gobernanza federada.", "La estructura correcta depende de la madurez - y la complejidad organizacional crece con la autonomía."]},
    {"title": "Comience por la fundación, distribuya la autonomía por etapas", "text": "Consolidar y gobernar antes de distribuir. La autonomía solo sustenta valor sobre una base sólida.", "bullets": ["Un equipo central provee plataforma, Unity Catalog, seguridad, estándares y guardrails.", "Conforme crece la madurez, los dominios asumen sus pipelines, calidad y productos de datos.", "Forzar la distribución demasiado pronto (sin base y sin cultura) genera nuevos silos y caos."]},
    {"title": "Productos de datos, dominios y autonomía: capacidades de una organización madura", "text": "Son buenas prácticas de gestión de datos a escala. Reunidas en el extremo federado del espectro, el mercado las llama Data Mesh - aquí, una de las lentes del diagnóstico, no el objetivo.", "bullets": ["Propiedad por dominio -> dominios/workspaces (ownership local y autonomía).", "Datos como producto -> activos con owner, contrato, documentación, calidad y SLA.", "Plataforma self-service -> infraestructura de datos que reduce el esfuerzo de los dominios.", "Gobernanza federada -> Unity Catalog (catálogo, descubrimiento, linaje, acceso, clasificación, auditoría)."]},
]
_NEW_REF_NOTES = {
    "en": {
        "https://www.dama.org/cpages/body-of-knowledge": "Reference body of knowledge on data management areas and best practices.",
        "https://edmcouncil.org/frameworks/dcam/": "Data management capability assessment model and maturity framework.",
        "https://cmmiinstitute.com/data-management-maturity": "Data management maturity model by levels.",
        "https://www.finops.org/framework/": "Cloud financial management (cost vs. value), applicable to data and AI.",
        "https://teamtopologies.com/": "Team design and interaction modes - foundation for the data operating model.",
        "https://martinfowler.com/bliki/DomainDrivenDesign.html": "Business domain modeling - conceptual basis for domain ownership.",
    },
    "es": {
        "https://www.dama.org/cpages/body-of-knowledge": "Cuerpo de conocimiento de referencia en gestión de datos (áreas de conocimiento y buenas prácticas).",
        "https://edmcouncil.org/frameworks/dcam/": "Modelo de evaluación de capacidades de gestión de datos y analítica.",
        "https://cmmiinstitute.com/data-management-maturity": "Modelo de madurez de gestión de datos por niveles.",
        "https://www.finops.org/framework/": "Gestión financiera en la nube (costo vs. valor), aplicable a datos e IA.",
        "https://teamtopologies.com/": "Diseño de equipos y modos de interacción - base para el modelo operacional de datos.",
        "https://martinfowler.com/bliki/DomainDrivenDesign.html": "Modelado por dominios de negocio - base conceptual para la propiedad por dominio.",
    },
}
for _l in ("en", "es"):
    REF_NOTES.setdefault(_l, {}).update(_NEW_REF_NOTES[_l])

# ---- Traducoes do Modelo Operacional (EN/ES) - anexado ----
_OM_EN = {
  "stages": {"fundacao": "Centralized Model", "governado": "Coordinated Model", "harmonizado": "Hub-and-Spoke Model", "federado": "Decentralized Model"},
  "raci": {"R": {"name": "Responsible", "description": "Executes the activity (hands on)."},
           "A": {"name": "Accountable", "description": "Accountable for the result; final decision. Ideally 1 per activity."},
           "C": {"name": "Consulted", "description": "Is consulted before/during (two-way communication)."},
           "I": {"name": "Informed", "description": "Is kept informed of the result (one-way communication)."}},
  "actors": {"dominios": {"name": "Business Domains", "synonyms": ["Business Areas", "Business Units", "Domain Squads"]},
             "comite_dados": {"name": "Data Council/Forum", "synonyms": ["Data Council", "Governance Forum", "Data Portfolio Committee"]}},
  "teams": {"Liderança": "Leadership", "Time de Dados": "Data Team", "Time de Negócio": "Business Team",
            "Time central de dados": "Central Data Team", "Hub central": "Central Hub", "Spokes (domínios)": "Spokes (Domains)",
            "Hub de governança (enxuto)": "Governance Hub (Lean)", "Domínios (spokes autônomos)": "Domains (Autonomous Spokes)"},
  "areas": {
    "lideranca_estrategia": {"name": "Data Leadership & Strategy", "synonyms": ["CDO / Chief Data Officer", "Data & AI Office", "Data Office", "Head of Data"], "description": "Defines data/AI strategy, ensures sponsorship and funding, prioritizes portfolio by value and drives change management.", "staffing": {"1": "Non-existent or accumulated by an IT manager.", "2": "Single sponsor (senior director/management).", "3": "CDO/Data Office with small team and initial committee.", "4": "Leadership structure with active governance and portfolio committees."}},
    "governanca": {"name": "Data Governance", "synonyms": ["Data Governance", "Data Management Office (DMO)", "Data Stewardship", "Data Management"], "description": "Defines decision rights, policies, quality standards, catalog/metadata and stewardship, with LGPD and compliance adherence.", "staffing": {"1": "Non-existent; ad hoc rules made by the central team when something breaks.", "2": "First stewards named for main domains.", "3": "Governance team with defined standards and stewards per domain.", "4": "Federated governance: defines global standards applied by code; stewards in all domains."}},
    "arquitetura": {"name": "Data Architecture", "synonyms": ["Data Architecture", "Enterprise/Solution Data Architect", "Information Architect", "Data Modeler"], "description": "Defines patterns, reference models, contracts and interoperability standards, and translates business requirements into technical blueprints.", "staffing": {"1": "Accumulated by someone in IT/engineering, without formal patterns.", "2": "Initial patterns defined for main flows.", "3": "Architecture with corporate standards and contracts between domains.", "4": "Evolutionary architecture with fitness functions and versioned contracts per product."}},
    "plataforma": {"name": "Data Platform", "synonyms": ["Data Platform Engineering", "Data Infrastructure", "DataOps Platform", "Internal Data Platform (IDP)", "Data SRE"], "description": "Builds and operates the self-service platform (lakehouse, catalog, workspaces, CI/CD, observability, security and cost) treated as an internal product.", "staffing": {"1": "1 central team does everything (platform, pipelines, access).", "2": "Central platform team provisions by ticket.", "3": "Platform as a service with self-service capabilities; 1 per environment/hub.", "4": "Platform as a product (DevEx); domains provision on-demand; admin per domain."}},
    "engenharia": {"name": "Data Engineering", "synonyms": ["Data Engineering", "ETL/ELT Engineer", "Pipeline Engineer", "DataOps Engineer", "Big Data Engineer"], "description": "Builds and operates ingestion and transformation pipelines (medallion), quality in pipelines, orchestration and contracts, in CI/CD.", "staffing": {"1": "Ad hoc scripts made by the central team.", "2": "Some standardized ETLs, still in the central team.", "3": "Engineering per area/domain with central patterns.", "4": "Cross-functional teams per domain with CI/CD and contracts."}},
    "analytics_engineering": {"name": "Analytics Engineering", "synonyms": ["Analytics Engineer", "BI Engineer", "Metrics Engineer", "Data Modeling Engineer", "dbt Developer"], "description": "Applies engineering practices to the analytical transformation layer (models, tests, documentation, semantic layer/metrics) to deliver reliable datasets to the business.", "staffing": {"1": "Non-existent; analyses done directly in spreadsheets.", "2": "Informal role within BI/engineering.", "3": "Analytics engineers supporting main domains.", "4": "Analytics engineering in each domain, with shared semantic layer."}},
    "ciencia_ml": {"name": "Data Science & ML", "synonyms": ["Data Science", "ML Engineering", "MLOps", "AI Engineering", "Applied Scientist"], "description": "Uses statistics, ML and AI for insights and automated decisions; develops, deploys and monitors models (incl. GenAI/agents).", "staffing": {"1": "Non-existent or occasional, without productionization.", "2": "Isolated scientists, without MLOps.", "3": "Data science with MLOps support from the platform.", "4": "ML teams per domain with MLOps and drift monitoring."}},
    "analytics_bi": {"name": "Analytics & BI", "synonyms": ["Business Intelligence", "Data Analysts", "Insights", "Self-service BI"], "description": "Transforms data into analyses, dashboards and reports for decision-making, including self-service BI/AI on governed data.", "staffing": {"1": "Reports made by IT on demand.", "2": "Centralized BI serving by ticket.", "3": "Self-service BI for some areas.", "4": "Analysts in domains with self-service BI/AI (including natural language)."}},
    "seguranca_privacidade": {"name": "Data Security & Privacy", "synonyms": ["Data Security", "Privacy / DPO", "Data InfoSec", "Data Protection"], "description": "Access control (RBAC/ABAC), masking/RLS, classification, LGPD/consent compliance, auditing and incident response.", "staffing": {"1": "Access granted broadly and manually by the central team.", "2": "System control, inconsistent; DPO reactive.", "3": "Centralized control by groups/roles; DPO participates in critical projects.", "4": "Fine-grained attribute access applied automatically; privacy by design."}},
    "produto_dominio": {"name": "Data Product & Domain", "synonyms": ["Data Product Management", "Domain Ownership", "Data Product Owner", "Domain Data Owner"], "description": "Treats data as a product: domain owner and data product manager define vision, roadmap, SLAs/SLOs and priorities by value.", "staffing": {"1": "Non-existent; data is IT responsibility.", "2": "Informal ownership; no named roles.", "3": "Domain owner and product manager for main domains.", "4": "Formal domain owner and product manager in all domains, with SLAs."}}
  },
  "functions": {
    "estrategia": {"name": "Define Data & AI Strategy", "description": "Vision, objectives and connection to business strategy."},
    "patrocinio_financiamento": {"name": "Sponsorship and Funding", "description": "Ensure executive sponsor and stable budget for platform and domains."},
    "portfolio_valor": {"name": "Portfolio Prioritization by Value", "description": "Decide investment by business value (value tree)."},
    "gestao_mudanca": {"name": "Change Management and Culture", "description": "Champions, incentives and data KPIs in performance evaluation."},
    "politicas": {"name": "Define Data Policies", "description": "Classification, retention, use, access and quality policies."},
    "stewardship": {"name": "Stewardship and Roles (Owner/Steward)", "description": "Name and support data owners and stewards per domain."},
    "catalogo_metadados": {"name": "Catalog, Metadata and Lineage", "description": "Catalog curation, glossary, data dictionary and lineage."},
    "qualidade_regras": {"name": "Data Quality Rules", "description": "Define and monitor quality metrics/SLAs per product."},
    "padroes": {"name": "Architectural Patterns and Blueprints", "description": "Layers (medallion), platform patterns, reusable blueprints."},
    "contratos": {"name": "Data Contracts and Interoperability", "description": "Define contracts (entry/exit points), schemas and interop patterns."},
    "modelagem": {"name": "Data Modeling and Reuse", "description": "Conceptual/logical/physical models and structure reuse."},
    "provisionamento_iac": {"name": "Provisioning and IaC", "description": "Workspaces, catalogs and governed infrastructure via automation (IaC)."},
    "self_service": {"name": "Self-service Capabilities (SDK/CLI/Blueprints)", "description": "Reduce friction and cognitive load for domains."},
    "confiabilidade": {"name": "Reliability and Support (SRE)", "description": "Availability, incidents, platform observability."},
    "admin_ambiente": {"name": "Data Environment Administration", "description": "Admin of metastore/workspaces, accounts, quotas and policies."},
    "finops": {"name": "FinOps / Cost Management", "description": "Cost visibility per domain/product, tags, showback/chargeback, optimization."},
    "pipelines": {"name": "Ingestion and Transformation Pipelines", "description": "Bronze/silver/gold, batch and streaming, orchestration."},
    "qualidade_pipeline": {"name": "Pipeline Quality", "description": "Automated quality expectations/tests in pipelines."},
    "cicd_codereview": {"name": "CI/CD and Code Review", "description": "Versioned repository, PR, quality gates and code review."},
    "modelos_transformacao": {"name": "Transformation Models (Silver/Gold)", "description": "Modeling for consumption, testing and dataset documentation."},
    "metricas_semantica": {"name": "Metrics and Semantic Layer", "description": "Consistent metric definitions reused by BI/apps."},
    "modelagem_ml": {"name": "Modeling and Experimentation", "description": "Feature engineering, training, validation and results communication."},
    "mlops": {"name": "Model Deployment and Monitoring (MLOps)", "description": "Serving, versioning and drift monitoring."},
    "dashboards": {"name": "Dashboards and Reports", "description": "Business panels and reports on certified data products."},
    "analise_negocio": {"name": "Business Analysis and Metrics", "description": "Ad-hoc analyses and business KPI tracking."},
    "controle_acesso": {"name": "Access Control (RBAC/ABAC)", "description": "Granular access policies, least privilege and revocation."},
    "protecao_dados": {"name": "Protection of Sensitive Data", "description": "Masking, RLS, encryption, pseudonymization."},
    "privacidade_lgpd": {"name": "Privacy and Compliance (LGPD)", "description": "Legal basis, consent, DPIA and data subject requests."},
    "auditoria": {"name": "Audit and Incident Response", "description": "Audit trails, SIEM and incident playbooks."},
    "ownership_dominio": {"name": "Domain Ownership", "description": "Strategy, priorities and domain representation in forums."},
    "gestao_produto": {"name": "Data Product Management", "description": "Vision, roadmap, SLAs/SLOs and product success criteria."},
    "publicacao_produto": {"name": "Product Publishing and Certification", "description": "Publish products with owner, contract, SLA and documentation."}
  },
  "roles": {
    "lider": {"name": "Data Leader (C-Level or equivalent)", "synonyms": ["CDO / Chief Data Officer", "Head of Data", "Director of Data & AI"], "description": "Sponsors, defines strategy and is accountable for the data area to the organization."},
    "comite": {"name": "Data Council/Forum", "synonyms": ["Data Council", "Governance Forum", "Data Portfolio Committee"], "description": "Board that decides global policies, priorities and data investment."},
    "central": {"name": "Central Data Team (Multidisciplinary)", "synonyms": ["Central data team", "Single data team", "Initial data squad"], "description": "Central team that accumulates multiple functions (governance, architecture, platform, engineering, analytics, security) - typical in low maturity; signals role overload."},
    "eng": {"name": "Data Engineering", "synonyms": ["Data Engineer", "ETL/ELT Engineer", "DataOps Engineer"], "description": "Builds and operates pipelines (ingestion, transformation), quality and data CI/CD."},
    "eng_dom": {"name": "Data Engineering", "synonyms": ["Data Engineer", "ETL/ELT Engineer", "DataOps Engineer"], "description": "Builds and operates pipelines, quality and CI/CD - allocated in the domain (spoke)."},
    "plataforma": {"name": "Data Platform Team", "synonyms": ["Data Platform Engineering", "Data Infrastructure", "Data SRE", "Internal Data Platform"], "description": "Provides the self-service platform (lakehouse, Unity Catalog, IaC, observability, cost)."},
    "analytics_eng": {"name": "Analytics Engineering", "synonyms": ["Analytics Engineer", "BI Engineer", "Metrics Engineer", "dbt Developer"], "description": "Analytical transformation layer: models, tests, metrics and semantic layer."},
    "ciencia": {"name": "Data Scientist / ML Engineer", "synonyms": ["Data Scientist", "ML Engineer", "MLOps", "AI Engineer"], "description": "Develops, deploys and monitors ML/AI models (incl. features and GenAI)."},
    "gov": {"name": "Data Governance", "synonyms": ["Data Governance", "Data Management Office (DMO)", "Data Management"], "description": "Defines policies, standards, catalog and is accountable for data governance."},
    "steward": {"name": "Data Steward", "synonyms": ["Data Steward", "Data Custodian", "Data Owner (operational)"], "description": "Executes governance in the domain: quality, metadata/catalog, glossary and access rules."},
    "arq": {"name": "Data Architecture", "synonyms": ["Data Architect", "Enterprise/Solution Architect", "Data Modeler"], "description": "Patterns, data contracts, reference models and interoperability."},
    "seg": {"name": "Security & Privacy", "synonyms": ["Data Security", "Privacy / DPO", "Data InfoSec"], "description": "Access control, masking, LGPD/consent, auditing and incidents."},
    "dpo_owner": {"name": "Domain Owner / Data Product Owner", "synonyms": ["Domain Owner", "Data Product Manager", "Domain Data Owner"], "description": "Accountable for the domain and data products: vision, roadmap, SLAs and priorities."},
    "data_owner": {"name": "Data Owner", "synonyms": ["Data Owner", "Business Data Owner", "Accountable for data"], "description": "Business role accountable for the data of its domain: approves who accesses it, its classification and the publication of the domain's products. Distinct from the Data Steward (operational governance) and the Data Product Owner (product management)."},
    "negocio": {"name": "Data Analyst", "synonyms": ["Business Analyst", "BI Analyst"], "description": "Consumes and analyzes data in the business; bridge between data and decision. Correlate role (outside data area)."}
  }
}
_OM_ES = {
  "stages": {"fundacao": "Modelo Centralizado", "governado": "Modelo Coordinado", "harmonizado": "Modelo Hub-and-Spoke", "federado": "Modelo Descentralizado"},
  "raci": {"R": {"name": "Responsable", "description": "Ejecuta la actividad (manos a la obra)."},
           "A": {"name": "Aprobador", "description": "Responde por el resultado; decisión final. Idealmente 1 por actividad."},
           "C": {"name": "Consultado", "description": "Se consulta antes/durante (comunicación bidireccional)."},
           "I": {"name": "Informado", "description": "Se mantiene informado del resultado (comunicación unidireccional)."}},
  "actors": {"dominios": {"name": "Dominios de Negocio", "synonyms": ["Áreas de negocio", "Business Units", "Squads de dominio"]},
             "comite_dados": {"name": "Comité/Foro de Datos", "synonyms": ["Data Council", "Foro de Gobernanza", "Comité de Portafolio de Datos"]}},
  "teams": {"Liderança": "Liderazgo", "Time de Dados": "Equipo de Datos", "Time de Negócio": "Equipo de Negocio",
            "Time central de dados": "Equipo central de datos", "Hub central": "Hub central", "Spokes (domínios)": "Spokes (dominios)",
            "Hub de governança (enxuto)": "Hub de gobernanza (compacto)", "Domínios (spokes autônomos)": "Dominios (spokes autónomos)"},
  "areas": {
    "lideranca_estrategia": {"name": "Liderazgo y Estrategia de Datos", "synonyms": ["CDO/Chief Data Officer", "Data & AI Office", "Oficina de Datos", "Head de Datos"], "description": "Define la estrategia de datos/IA, garantiza patrocinio y financiamiento, prioriza el portafolio por valor y conduce la gestión del cambio.", "staffing": {"1": "Inexistente o acumulado por un gestor de TI.", "2": "Un patrocinador único (directoría/gerencia sénior).", "3": "CDO/Oficina de Datos con equipo pequeño y comité inicial.", "4": "Estructura de liderazgo con comités de gobernanza y portafolio activos."}},
    "governanca": {"name": "Gobernanza de Datos", "synonyms": ["Data Governance", "Data Management Office (DMO)", "Data Stewardship", "Gestión de Datos"], "description": "Define derechos de decisión, políticas, estándares de calidad, catálogo/metadatos y stewardship, con cumplimiento de LGPD y normas.", "staffing": {"1": "Inexistente; reglas ad hoc hechas por el equipo central cuando algo se quiebra.", "2": "Primeros stewards nombrados para los dominios principales.", "3": "Equipo de gobernanza con estándares definidos y stewards por dominio.", "4": "Gobernanza federada: define estándares globales aplicados por código; stewards en todos los dominios."}},
    "arquitetura": {"name": "Arquitectura de Datos", "synonyms": ["Data Architecture", "Enterprise/Solution Data Architect", "Information Architect", "Data Modeler"], "description": "Define estándares, modelos de referencia, contratos y estándares de interoperabilidad, y traduce requisitos de negocio en blueprints técnicos.", "staffing": {"1": "Acumulado por alguien de TI/ingeniería, sin estándares formales.", "2": "Estándares iniciales definidos para los flujos principales.", "3": "Arquitectura con estándares corporativos y contratos entre dominios.", "4": "Arquitectura evolutiva con fitness functions y contratos versionados por producto."}},
    "plataforma": {"name": "Plataforma de Datos", "synonyms": ["Data Platform Engineering", "Data Infrastructure", "DataOps Platform", "Internal Data Platform (IDP)", "SRE de Datos"], "description": "Construye y opera la plataforma self-service (lakehouse, catálogo, workspaces, CI/CD, observabilidad, seguridad y costo) tratada como producto interno.", "staffing": {"1": "1 equipo central hace todo (plataforma, pipelines, acceso).", "2": "Equipo de plataforma central provee por solicitud.", "3": "Plataforma como servicio con recursos self-service; 1 por ambiente/hub.", "4": "Plataforma como producto (DevEx); dominios proveen bajo demanda; admin por dominio."}},
    "engenharia": {"name": "Ingeniería de Datos", "synonyms": ["Data Engineering", "ETL/ELT Engineer", "Pipeline Engineer", "DataOps Engineer", "Big Data Engineer"], "description": "Construye y opera pipelines de ingestión y transformación (medallion), calidad en pipelines, orquestación y contratos, en CI/CD.", "staffing": {"1": "Scripts sueltos hechos por el equipo central.", "2": "Algunos ETLs estandarizados, aún en el equipo central.", "3": "Ingeniería por área/dominio con estándares centrales.", "4": "Equipos multifuncionales por dominio con CI/CD y contratos."}},
    "analytics_engineering": {"name": "Analytics Engineering", "synonyms": ["Analytics Engineer", "BI Engineer", "Metrics Engineer", "Data Modeling Engineer", "dbt Developer"], "description": "Aplica prácticas de ingeniería a la capa de transformación analítica (modelos, tests, documentación, capa semántica/métricas) para entregar datasets confiables al negocio.", "staffing": {"1": "Inexistente; análisis hechos directamente en hojas de cálculo.", "2": "Papel informal dentro de BI/ingeniería.", "3": "Analytics engineers apoyando los dominios principales.", "4": "Analytics engineering en cada dominio, con capa semántica compartida."}},
    "ciencia_ml": {"name": "Ciencia de Datos y ML", "synonyms": ["Data Science", "ML Engineering", "MLOps", "AI Engineering", "Applied Scientist"], "description": "Usa estadística, ML e IA para insights y decisiones automatizadas; desarrolla, implanta y monitorea modelos (incl. GenAI/agentes).", "staffing": {"1": "Inexistente o puntual, sin productización.", "2": "Científicos aislados, sin MLOps.", "3": "Ciencia de datos con apoyo de MLOps de la plataforma.", "4": "Equipos de ML por dominio con MLOps y monitoreo de drift."}},
    "analytics_bi": {"name": "Analytics y BI", "synonyms": ["Business Intelligence", "Data Analysts", "Insights", "Self-service BI"], "description": "Transforma datos en análisis, dashboards y reportes para decisión, incluyendo BI/IA self-service sobre datos gobernados.", "staffing": {"1": "Reportes hechos por TI bajo solicitud.", "2": "BI centralizado atendiendo por solicitud.", "3": "BI self-service para parte de las áreas.", "4": "Analistas en los dominios con BI/IA self-service (incluyendo lenguaje natural)."}},
    "seguranca_privacidade": {"name": "Seguridad y Privacidad de Datos", "synonyms": ["Data Security", "Privacy/DPO", "InfoSec de Datos", "Data Protection"], "description": "Control de acceso (RBAC/ABAC), enmascaramiento/RLS, clasificación, cumplimiento LGPD/consentimiento, auditoría y respuesta a incidentes.", "staffing": {"1": "Acceso concedido de forma amplia y manual por el equipo central.", "2": "Control por sistema, inconsistente; DPO reactivo.", "3": "Control centralizado por grupos/papeles; DPO participa de proyectos críticos.", "4": "Acceso fino por atributo aplicado automáticamente; privacy by design."}},
    "produto_dominio": {"name": "Producto y Dominio de Datos", "synonyms": ["Data Product Management", "Domain Ownership", "Data Product Owner", "Domain Data Owner"], "description": "Trata datos como producto: dueño del dominio y gestor de producto de datos definen visión, roadmap, SLAs/SLOs y prioridades por valor.", "staffing": {"1": "Inexistente; datos son responsabilidad de TI.", "2": "Ownership informal; sin papeles nombrados.", "3": "Dueño de dominio y gestor de producto para los dominios principales.", "4": "Dueño de dominio y gestor de producto formales en todos los dominios, con SLAs."}}
  },
  "functions": {
    "estrategia": {"name": "Definir estrategia de datos e IA", "description": "Visión, objetivos y conexión con la estrategia de negocio."},
    "patrocinio_financiamento": {"name": "Patrocinio y financiamiento", "description": "Garantizar sponsor ejecutivo y presupuesto estable para plataforma y dominios."},
    "portfolio_valor": {"name": "Priorización de portafolio por valor", "description": "Decidir inversión por valor de negocio (árbol de valor)."},
    "gestao_mudanca": {"name": "Gestión del cambio y cultura", "description": "Champions, incentivos y KPIs de datos en la evaluación de desempeño."},
    "politicas": {"name": "Definir políticas de datos", "description": "Políticas de clasificación, retención, uso, acceso y calidad."},
    "stewardship": {"name": "Stewardship y papeles (owner/steward)", "description": "Nombrar y apoyar data owners y stewards por dominio."},
    "catalogo_metadados": {"name": "Catálogo, metadatos y linaje", "description": "Curación del catálogo, glosario, diccionario y linaje."},
    "qualidade_regras": {"name": "Reglas de calidad de datos", "description": "Definir y monitorear métricas/SLAs de calidad por producto."},
    "padroes": {"name": "Estándares y blueprints arquitecturales", "description": "Capas (medallion), estándares de plataforma, blueprints reutilizables."},
    "contratos": {"name": "Contratos de datos e interoperabilidad", "description": "Definir contratos (puertas de entrada/salida), schemas y estándares de interop."},
    "modelagem": {"name": "Modelado de datos y reuso", "description": "Modelos conceptuales/lógicos/físicos y reuso de estructuras."},
    "provisionamento_iac": {"name": "Provisionamiento e IaC", "description": "Workspaces, catálogos e infraestructura gobernada vía automatización (IaC)."},
    "self_service": {"name": "Capacidades self-service (SDK/CLI/blueprints)", "description": "Reducir fricción y carga cognitiva de los dominios."},
    "confiabilidade": {"name": "Confiabilidad y sustentación (SRE)", "description": "Disponibilidad, incidentes, observabilidad de la plataforma."},
    "admin_ambiente": {"name": "Administración del ambiente de datos", "description": "Admin de metastore/workspaces, cuentas, cuotas y políticas."},
    "finops": {"name": "FinOps/gestión de costo", "description": "Visibilidad de costo por dominio/producto, tags, showback/chargeback, optimización."},
    "pipelines": {"name": "Pipelines de ingestión y transformación", "description": "Bronze/silver/gold, batch y streaming, orquestación."},
    "qualidade_pipeline": {"name": "Calidad en pipelines", "description": "Expectativas/tests de calidad automatizados en pipelines."},
    "cicd_codereview": {"name": "CI/CD y code review", "description": "Repositorio versionado, PR, quality gates y revisión de código."},
    "modelos_transformacao": {"name": "Modelos de transformación (silver/gold)", "description": "Modelado para consumo, tests y documentación de datasets."},
    "metricas_semantica": {"name": "Métricas y capa semántica", "description": "Definiciones de métricas consistentes reutilizadas por BI/apps."},
    "modelagem_ml": {"name": "Modelado y experimentación", "description": "Feature engineering, entrenamiento, validación y comunicación de resultados."},
    "mlops": {"name": "Deploy y monitoreo de modelos (MLOps)", "description": "Serving, versionamiento y monitoreo de drift."},
    "dashboards": {"name": "Dashboards y reportes", "description": "Paneles y reportes de negocio sobre productos de datos certificados."},
    "analise_negocio": {"name": "Análisis y métricas de negocio", "description": "Análisis ad-hoc y seguimiento de KPIs de negocio."},
    "controle_acesso": {"name": "Control de acceso (RBAC/ABAC)", "description": "Políticas de acceso granular, menor privilegio y revocación."},
    "protecao_dados": {"name": "Protección de datos sensibles", "description": "Enmascaramiento, RLS, criptografía, pseudonimización."},
    "privacidade_lgpd": {"name": "Privacidad y cumplimiento (LGPD)", "description": "Base legal, consentimiento, DPIA y atención a titulares."},
    "auditoria": {"name": "Auditoría y respuesta a incidentes", "description": "Registros de auditoría, SIEM y playbook de incidentes."},
    "ownership_dominio": {"name": "Ownership del dominio", "description": "Estrategia, prioridades y representación del dominio en los foros."},
    "gestao_produto": {"name": "Gestión del producto de datos", "description": "Visión, roadmap, SLAs/SLOs y criterios de éxito del producto."},
    "publicacao_produto": {"name": "Publicación y certificación de productos", "description": "Publicar productos con owner, contrato, SLA y documentación."}
  },
  "roles": {
    "lider": {"name": "Líder de datos (nivel C o equivalente)", "synonyms": ["CDO/Chief Data Officer", "Head de Datos", "Director de Datos e IA"], "description": "Patrocina, define la estrategia y responde por el área de datos ante la organización."},
    "comite": {"name": "Comité/Foro de datos", "synonyms": ["Data Council", "Foro de Gobernanza", "Comité de Portafolio de Datos"], "description": "Colegiado que decide políticas globales, prioridades e inversión en datos."},
    "central": {"name": "Equipo central de datos (multidisciplinario)", "synonyms": ["Central data team", "Equipo único de datos", "Squad de datos inicial"], "description": "Equipo central que acumula varias funciones (gobernanza, arquitectura, plataforma, ingeniería, analytics, seguridad) - típico en baja madurez; señal de sobrecarga de papeles."},
    "eng": {"name": "Ingeniería de Datos", "synonyms": ["Data Engineer", "ETL/ELT Engineer", "DataOps Engineer"], "description": "Construye y opera pipelines (ingestión, transformación), calidad y CI/CD de los datos."},
    "eng_dom": {"name": "Ingeniería de Datos", "synonyms": ["Data Engineer", "ETL/ELT Engineer", "DataOps Engineer"], "description": "Construye y opera pipelines, calidad y CI/CD - asignada en el dominio (spoke)."},
    "plataforma": {"name": "Equipo de Plataforma de Datos", "synonyms": ["Data Platform Engineering", "Data Infrastructure", "SRE de Datos", "Internal Data Platform"], "description": "Provee la plataforma self-service (lakehouse, Unity Catalog, IaC, observabilidad, costo)."},
    "analytics_eng": {"name": "Analytics Engineering", "synonyms": ["Analytics Engineer", "BI Engineer", "Metrics Engineer", "dbt Developer"], "description": "Capa de transformación analítica: modelos, tests, métricas y capa semántica."},
    "ciencia": {"name": "Científico de datos/ML", "synonyms": ["Data Scientist", "ML Engineer", "MLOps", "AI Engineer"], "description": "Desarrolla, implanta y monitorea modelos de ML/IA (incl. features y GenAI)."},
    "gov": {"name": "Gobernanza de Datos", "synonyms": ["Data Governance", "Data Management Office (DMO)", "Gestión de Datos"], "description": "Define políticas, estándares, catálogo y responde por la gobernanza de datos."},
    "steward": {"name": "Data Steward", "synonyms": ["Steward de datos", "Custodio de datos", "Data Owner (operacional)"], "description": "Ejecuta la gobernanza en el dominio: calidad, metadatos/catálogo, glosario y reglas de acceso."},
    "arq": {"name": "Arquitectura de Datos", "synonyms": ["Data Architect", "Enterprise/Solution Architect", "Data Modeler"], "description": "Estándares, contratos de datos, modelos de referencia e interoperabilidad."},
    "seg": {"name": "Seguridad y Privacidad", "synonyms": ["Data Security", "Privacy/DPO", "InfoSec de Datos"], "description": "Control de acceso, enmascaramiento, LGPD/consentimiento, auditoría e incidentes."},
    "dpo_owner": {"name": "Dueño de dominio/Gestor de Producto de Datos", "synonyms": ["Domain Owner", "Data Product Manager", "Domain Data Owner"], "description": "Responde por el dominio y por los productos de datos: visión, roadmap, SLAs y prioridades."},
    "data_owner": {"name": "Data Owner (dueño del dato)", "synonyms": ["Dueño del dato", "Business Data Owner", "Accountable de datos"], "description": "Rol de negocio responsable (accountable) por los datos de su dominio: aprueba quién accede, la clasificación y la publicación de los productos del dominio. Se distingue del Data Steward (ejecución operacional) y del Data Product Owner (gestión del producto)."},
    "negocio": {"name": "Analista de datos", "synonyms": ["Analista de negocio", "Business Analyst", "Analista de BI"], "description": "Consume y analiza datos en el negocio; puente entre los datos y la decisión. Papel correlato (fuera del área de datos)."}
  }
}
OPMODEL = {"en": _OM_EN, "es": _OM_ES}
