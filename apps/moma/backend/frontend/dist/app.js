/* Maturity & Operating Model Assessment (Databricks) - SPA sem build (JS puro), tri-lingue PT/EN/ES */
(() => {
  "use strict";
  const API = (window.__BASE__ || "") + "/api";
  let FW = null;
  let OM = null;
  let LANG = (() => { try { return localStorage.getItem("lang") || "pt"; } catch (e) { return "pt"; } })();
  const LOCALE = { pt: "pt-BR", en: "en-US", es: "es-ES" };

  // ---------------- i18n (chrome) ----------------
  const I18N = {
    pt: {
      nav_datamesh: "Visão geral", nav_assessments: "Assessments", nav_method: "Como é calculado", nav_opmodel: "Modelo Operacional",
      om_title: "Modelo Operacional de Dados", om_sub: "Áreas/capacidades de dados, suas funções e a RACI. Cada empresa nomeia diferente - por isso trazemos sinônimos comuns de mercado.",
      om_legend: "Legenda RACI", om_stage_view: "Como escala por etapa", om_functions: "Funções e RACI", om_synonyms: "Também chamada de",
      om_staffing: "Como é provida em cada etapa", om_open: "Ver funções e RACI",
      om_local_title: "Preencha o seu modelo", om_local_sub: "Atribua cada função a uma área/pessoa da sua organização. Deixe TBD se ainda indefinido, ou 'Não haverá' se não se aplica.",
      om_tbd: "TBD (a definir)", om_none: "Não haverá", om_named: "Área / Pessoa", om_name_ph: "Ex.: Governança - Maria Silva",
      om_save: "Salvar modelo", om_saved: "Modelo salvo!", om_overload: "Carga e conflitos", om_overload_ok: "Nenhuma sobrecarga evidente com os nomes preenchidos.",
      om_overload_hint: "A mesma pessoa aparece em muitas áreas/funções. Acumular Plataforma + Engenharia + Governança, por exemplo, gera gargalo e risco de segregação de funções.",
      om_roles_count: "papéis", om_edit_local: "Modelo operacional", om_ref_note: "Modelo de referência (padrão).",
      om_legend_areas: "Áreas de dados (sinônimos e o que fazem)",
      om_legend_roles: "Papéis de profissionais de Dados",
      pub_title: "Como os domínios publicam e consomem produtos (passo a passo)",
      pub_sub: "Escolha o modelo e avance pelos passos. No Harmonizado o consumidor lê sem cópia (tabela externa); no Hub-and-Spoke os dados são copiados para um Data Hub central.",
      pub_step: "Passo", pub_prev: "Anterior", pub_next: "Próximo",
      h_position: "Onde você está: modelo-alvo por etapa de maturidade",
      om_open_full: "Ver modelo operacional",
      h_reco_opmodel: "Modelo operacional do estágio recomendado",
      reco_opmodel_sub: "Papéis e responsabilidades (RACI) sugeridos para o modelo em que o cliente foi enquadrado:",
      om_stage_hint: "Escolha o modelo (etapa) para ver quem faz o quê. Quanto mais centralizado, mais papéis se acumulam em poucas pessoas (sinal de sobrecarga); quanto mais federado, mais os papéis se distribuem e multiplicam por domínio.",
      nav_dataproducts: "Produtos de Dados",
      dp_page_title: "O que é um produto de dados", dp_page_sub: "Um produto de dados facilita um objetivo de negócio por meio dos dados. Não precisa ser sofisticado - pode ser até uma tabela bem cuidada.",
      dp_attrs_title: "Características de um bom produto de dados", dp_cats_title: "Categorias de produtos de dados (muito além de tabelas)",
      dp_cats_sub: "Produtores (P) e consumidores (C) variam por categoria. Cada uma tem um habilitador no Databricks.",
      dp_hier_title: "Hierarquia de produtos de dados (mapeada ao medallion)",
      dp_th_cat: "Categoria", dp_th_product: "Produto de dado", dp_th_dbx: "No Databricks",
      dp_uc_note: "Em todas as categorias há governança cross-cutting: catálogo, descoberta, linhagem, controle de acesso e classificação via Unity Catalog; e monitoramento/observabilidade (Lakehouse Monitoring).",
      loading: "Carregando...", loading_report: "Gerando relatório...", loading_resp: "Carregando respostas...",
      start_assessment: "Iniciar um assessment", generate_report: "Gerar relatório", view_responses: "Ver respostas",
      export_pdf: "Exportar PDF", copied: "Link copiado!", noname: "(sem nome)",
      home_pill: "GUIA + ASSESSMENT", home_title: "Maturidade de Dados no Databricks",
      home_lead: "Avalie a maturidade de dados da sua organização com múltiplas áreas e receba um diagnóstico com o modelo operacional adequado, o caminho de evolução e onde produtos e soluções Databricks aceleram cada etapa. Data Mesh entra como uma das lentes.",
      home_see_models: "Ver os modelos de Data Mesh", h_what: "A jornada de maturidade de dados",
      h_principles: "Capacidades de uma organização de dados madura", principles_sub: "Boas práticas de gestão de dados em escala. No Databricks, cada uma tem um habilitador técnico. Reunidas na ponta federada, o mercado as chama de Data Mesh.",
      principle: "Princípio", h_scale: "Escala de maturidade", scale_sub: "O assessment classifica cada tema em um de quatro estágios (inspirada em DAMA-DMBOK e CMMI-DMM).",
      h_spectrum: "O modelo-alvo de dados é um espectro: do centralizado ao descentralizado",
      spectrum_sub: "A organização de dados vai do mais centralizado ao mais autônomo. O modelo certo depende da maturidade - e evolui com o tempo. 'Data Mesh' é o termo de mercado para a ponta federada deste espectro.",
      axis_more_central: "Mais centralizado - menor autonomia", axis_more_fed: "Mais descentralizado - maior autonomia",
      etapa: "Etapa", kv_control: "Controle", kv_autonomy: "Autonomia", kv_workspaces: "Workspaces",
      concept_title: "Padrões de mercado", concept_sub: "Frameworks e padrões de mercado que embasam o diagnóstico (Data Mesh é uma das lentes):", sa_resources: "Recursos para o SA",
      see_example: "Ver exemplo", example_word: "Exemplo",
      dg_sources: "Fontes", dg_platform: "Plataforma central", dg_consumption: "Consumo / BI",
      dg_domain: "Domínio", dg_hub: "Hub · Governança (UC)", dg_ws: "workspace", dg_catalog: "Catálogo",
      dg_sharing: "Delta Sharing", dg_fedgov: "Governança federada (políticas)",
      dg_dataproduct: "Produto de dados", dg_owner: "Owner", dg_contract: "Contrato", dg_sla: "SLA",
      dg_quality: "Qualidade", dg_selfserve: "Plataforma self-service", dg_policies: "Políticas globais (automáticas)",
      dg_consumes: "consome", dg_product_has: "Todo produto de dados tem:",
      dom_customers: "Clientes", dom_sales: "Vendas", dom_credit: "Crédito", dom_payments: "Pagamentos", dom_logistics: "Logística", dom_marketing: "Marketing", prod_transactions: "Transações", prod_creditscore: "Score de crédito", dg_owns: "dono dos dados",
      dom_finance: "Financeiro", prod_customer360: "Clientes 360", prod_offers: "Ofertas", prod_billing: "Cobrança",
      dg_ws_own: "workspace próprio", dg_product_flow: "A saída de um produto é a entrada de outro", dg_hub_role: "define padrões globais",
      pol_pii: "Máscara de PII", pol_abac: "Acesso ABAC", pol_tags: "Tags & classes", pol_quality: "Qualidade",
      delta_title: "O que muda em relação à etapa anterior",
      dp_src: "Dados de origem", dp_prod: "Produtos de dados", selfserve_layer: "Camada self-service",
      src_registration: "Cadastro", src_clickstream: "Clickstream", src_orders: "Pedidos", src_support: "Suporte", src_partners: "Parceiros",
      prod_segments: "Segmentos", prod_creditprop: "Propensão a crédito", prod_reco: "Recomendações", prod_nba: "Próxima melhor ação",
      band_gov: "Governança · Unity Catalog + Políticas", band_obs: "Observabilidade · Lakehouse Monitoring",
      dp_practice_title: "Domínios e produtos de dados na prática", see_details: "Possibilidades neste cenário (detalhe)",
      ss_req_title: "Requisitos de infraestrutura", ss_dbx_title: "Recursos Databricks",
      ss_req_sub: "Cada requisito de uma plataforma self-service (base: princípios de Data Mesh) tem um recurso Databricks que o atende.",
      sspr: [
        ["Armazenamento poliglota e escalável", "Delta Lake + object storage (AWS/Azure/GCP)"],
        ["Governança, descoberta e catálogo", "Unity Catalog (catálogo, tags, lineage)"],
        ["Controle de acesso unificado e auditoria", "Unity Catalog (ABAC, audit logs, system tables)"],
        ["De-identificação e criptografia", "Mascaramento no UC, criptografia at rest/in transit"],
        ["Identidade federada", "SSO / SCIM / Identity Federation"],
        ["Pipelines e orquestração", "Lakeflow Declarative Pipelines + Lakeflow Jobs"],
        ["Qualidade e versionamento de dados", "Expectativas (DLT), Delta time travel"],
        ["Monitoramento e observabilidade", "Lakehouse Monitoring + system tables"],
        ["Compartilhamento entre domínios", "Delta Sharing + Marketplace"],
        ["Infra como código e self-service", "Databricks Asset Bundles + Terraform"],
      ],
      scen: {
        fundacao: [
          "Blueprint mínimo de domínio: fontes → ingestão → bronze/silver/gold (medalhão) em um lakehouse governado.",
          "1 a 2 workspaces operados por um time central; Unity Catalog como metastore único.",
          "A camada 'gold' (publicada) já pode ser consumida internamente, antes mesmo de virar um produto compartilhado.",
        ],
        governado: [
          "Um hub central publica e cura os produtos; os domínios existem como catálogos no UC (o namespace de 3 níveis particiona os domínios).",
          "Publicação centralizada em dois sabores: curada pelo hub ('pull') ou empurrada pela BU ('push') com governança leve.",
          "Os dados podem ser copiados para o storage do hub, particionados por domínio; isolamento por permissões e clusters.",
          "Vantagem: os domínios reaproveitam serviços de dados centralizados sem esforço próprio.",
        ],
        harmonizado: [
          "Cada domínio tem workspace próprio (DEV/STG/PRD) e publica produtos como tabelas externas que apontam para o seu próprio storage.",
          "O Unity Catalog central habilita descoberta (publish metadata) e consumo peer-to-peer entre domínios, sem cópia física.",
          "Plataforma harmonizada por blueprints (segurança/compliance) e serviços self-service (provisionamento, catálogo).",
          "Linhagem rastreada entre todos os workspaces conectados ao mesmo metastore.",
        ],
        federado: [
          "Domínios como Lakehouses completos: workspaces próprios (e até metastores) provisionados por automação (Terraform/DABs).",
          "Delta Sharing (D2D) estende a malha entre regiões, clouds e até empresas parceiras, sem exigir o mesmo stack.",
          "Governança federada computacional aplicada por política; catálogo global para descoberta.",
          "Atenção aos limites de workspaces por conta: reduza domínios ou combine DEV/STG quando necessário.",
        ],
      },
      assessments: "Assessments", new_assessment: "Novo assessment", new_sub: "Crie um assessment para um cliente. Você receberá links para compartilhar com cada área responder de forma independente.",
      client_name: "Nome do cliente", client_ph: "Ex.: Banco Exemplo S.A.", create: "Criar assessment",
      existing: "Assessments existentes", th_client: "Cliente", th_created: "Criado em", open_panel: "Abrir painel", report: "Relatório",
      none_yet: "Nenhum assessment ainda.", create_err: "Erro ao criar: ",
      act_hide: "Ocultar", act_show: "Mostrar", act_export: "Exportar", act_archive: "Arquivar",
      act_restore: "Restaurar", history: "Histórico", show_hidden: "Mostrar ocultos", hidden_badge: "oculto",
      archived_none: "Nenhum assessment no histórico.", confirm_archive: "Arquivar este assessment? Ele vai para o histórico e sai da lista ativa.",
      import_btn: "Importar (JSON)", imported_ok: "Assessment importado.", archived_ok: "Movido para o histórico.",
      restored_ok: "Restaurado.", import_err: "Erro ao importar: ",
      importing: "Importando...", import_invalid_json: "Arquivo JSON inválido.", responses_word: "respostas",
      act_purge: "Excluir definitivamente", confirm_purge: "Excluir definitivamente? Esta ação não pode ser desfeita.", purged_ok: "Excluído definitivamente.",
      total_responses: "respostas no total", general_link: "Link geral do assessment",
      general_link_sub: "Compartilhe com os participantes. Cada pessoa escolhe sua área e responde de forma independente.",
      copy_general: "Copiar link geral", progress_by_area: "Progresso por área", respondents: "respondente(s)",
      questoes: "questões", peso: "peso", answer: "Responder", copy_area_link: "Copiar link da área",
      coverage_callout: "<b>Como cobrir as áreas:</b> deve haver <b>1 representante por área</b>. Em <b>Domínios de Negócio</b>, o ideal é <b>1 representante por BU / área de negócio</b> (cada um informa sua área ao responder). Se alguma área não tiver representante dedicado, <b>eleja o responsável mais próximo do tema</b> - por exemplo, se não houver alguém de Segurança & Privacidade, o time de Governança ou de Plataforma pode responder por ela. É melhor a resposta do responsável mais próximo do que deixar a área sem cobertura.",
      responses_title: "Respostas", responses_sub: "Respostas individuais por área e respondente. Os níveis (1 a 4) seguem a escala de maturidade.",
      no_responses: "Sem respostas ainda.", th_question: "Pergunta", th_level: "Nível", th_answer: "Resposta escolhida", responses_count: "respostas",
      responder_pill: "ASSESSMENT", responder_default_title: "Assessment de maturidade de dados",
      responder_lead: "Escolha a área que você representa. Suas respostas ajudam a montar um diagnóstico consolidado da maturidade em dados.",
      responder_callout: "Deve haver um representante por área. Se você não é exatamente desta área, mas é a pessoa mais próxima do tema, pode responder por ela. Em <b>Domínios de Negócio</b>, informe a sua <b>área de negócio (BU)</b> - o ideal é um representante por BU.",
      perguntas: "perguntas", already_answered: "já responderam",
      change_area: "Trocar de área", your_name: "Seu nome (para permitir salvar e retomar suas respostas)",
      name_ph: "Ex.: Maria Silva", subarea_ph: "Ex.: Crédito", answered: "respondidas", save: "Salvar respostas",
      na_option: "Não sei / Não se aplica", saved_ok: "Respostas salvas! Obrigado.",
      err_subarea: "Informe o nome da área de negócio.", err_name: "Informe seu nome antes de salvar.",
      err_one: "Responda ao menos uma pergunta.", save_err: "Erro ao salvar: ", area_fallback: "Área",
      report_pill: "MATURIDADE DE DADOS", report_default: "Relatório de maturidade de dados",
      generated_on: "Gerado em", coverage: "Cobertura", kpi_global: "Nota global (de 4,0)",
      kpi_stage: "Estágio de maturidade", kpi_readiness: "Prontidão p/ modelo federado", kpi_topology: "Modelo-alvo de dados",
      h_by_maturity: "Maturidade por dimensão operacional", h_by_function: "Maturidade por disciplina de dados (DAMA)", h_by_function_note: "As 9 disciplinas de gestão de dados (áreas de conhecimento) do DAMA-DMBOK - a base metodológica.", h_by_maturity_note: "Reagrupamento das mesmas respostas em temas operacionais (inclui Modelo Operacional, DataOps e FinOps, que o DAMA não nomeia). Composição em 'Como é calculado'.", h_by_dimension: "Perspectiva (Pessoas / Processos / Tecnologia)", h_by_principle: "Por princípio de Data Mesh",
      h_func_detail: "Detalhe por disciplina de dados",
      weight_note: "Todas as áreas têm peso igual (1x). As respostas das áreas de negócio são consolidadas: os múltiplos respondentes de negócio são promediados por pergunta e contam como uma única voz, sem sobressair frente às demais áreas.",
      h_reco_model: "Modelo-alvo de dados recomendado",
      reco_model_sub: "O modelo-alvo de dados vai do centralizado ao federado. Dada a maturidade atual, o modelo adequado é destacado abaixo. Na ponta federada, o mercado o chama de Data Mesh.",
      next_step: "A próxima etapa de evolução é", axis_central: "Mais centralizado", axis_fed: "Mais federado",
      recommended: "RECOMENDADO", how_databricks: "Como fica no Databricks", kv_central_control: "Controle central",
      kv_governance: "Governança", kv_sharing: "Compartilhamento",
      foundation_note: "A recomendação respeita o <b>teto da fundação</b> (governança, segurança, qualidade, operações e arquitetura): nota",
      foundation_note_end: "Não se federa além do que a base sustenta.",
      h_strengths: "Pontos de destaque", no_strengths: "Nenhum ponto de destaque identificado ainda.",
      h_roadmap: "Roadmap de evolução", h_reco: "Recomendações e como avançar com Databricks",
      reco_sub: "Ações recomendadas <b>ordenadas por prioridade (quick-wins primeiro)</b>: mais valor para evolução por unidade de complexidade. Cada ação mostra criticidade, valor, complexidade e os <b>links da documentação oficial</b> Databricks.",
      th_horizon: "Horizonte", th_function: "Função", th_crit: "Criticidade",
      th_valor: "Valor p/ evolução", th_complexity: "Complexidade",
      th_reco: "Recomendação Databricks (+ docs)", effort_word: "esforço", docs_word: "Docs:",
      val_Alto: "Alto", val_Medio: "Médio", val_Baixo: "Baixo",
      valor_click: "clique para ver as perguntas que evoluem",
      valor_modal_title: "Perguntas que esta ação ajuda a evoluir",
      valor_modal_sub: "Perguntas deficientes (nível < 3) associadas à função",
      valor_modal_none: "Sem perguntas deficientes associadas.",
      h_priomatrix: "Matriz de priorização", axis_complexity: "Complexidade", axis_value: "Valor para evolução",
      priomatrix_sub: "Cada ação (<b>top 20 por prioridade</b>) cruza <b>Valor para evolução × Complexidade</b>. Priorize o canto superior esquerdo (quick-wins): alto valor, baixa complexidade. Passe o mouse para ver os detalhes.",
      quad_quickwin: "Quick wins", quad_strategic: "Estratégicos", quad_fillin: "Incrementais", quad_avoid: "Depois",
      th_action: "Ação", th_prereq: "Pré-requisitos", acoes_word: "ações",
      h_gantt: "Linha do tempo (Gantt)", gantt_sub: "Cada caixa traz o horizonte e o código da ação; a cor da borda indica o horizonte (veja a legenda). As setas mostram as dependências (uma ação só começa após seus pré-requisitos); quando não há dependência entre funções, as ações de uma mesma função de dados são encadeadas pela ordem de prioridade. Passe o mouse sobre uma caixa para ver os detalhes.",
      h1_label: "H1 - Fundação (0-3m)", h2_label: "H2 - Padronização (3-9m)", h3_label: "H3 - Federação (9+m)",
      reco_empty: "Nenhuma ação pendente: todas as funções já estão no estágio máximo de maturidade.",
      h_key_messages: "Mensagens-chave", ref_concept: "Padrões de mercado", ref_internal: "Recursos internos (SA)", ref_public: "Recursos públicos",
      not_enough_title: "Ainda sem respostas suficientes", not_enough_sub: "Peça para as áreas responderem o assessment e volte para gerar o diagnóstico.", go_panel: "Ir ao painel",
      notfound_title: "Não encontrado", notfound_sub: "Este assessment não existe ou o link está incorreto.", go_home: "Ir ao início",
      err: "Erro", fw_err: "Erro ao carregar o framework: ",
      crit_Alta: "Alta", crit_Media: "Média", crit_Baixa: "Baixa",
      eff_Simples: "Simples", eff_Media: "Média", eff_Complexa: "Complexa",
      method_title: "Como o cálculo é feito", method_sub: "Transparência total sobre a metodologia: como cada resposta vira nota, e o que cada pergunta pontua.",
      method_rules_title: "Regras de cálculo",
      method_table_title: "Mapa de associações: pergunta × perspectiva × disciplina de dados × dimensão operacional",
      th_area: "Área", th_dim: "Perspectiva (PPT)", th_opdim: "Dimensão operacional", th_principle: "Princípio Mesh", th_qweight: "Peso",
      th_dims: "Perspectiva (PPT)", th_fns: "Disciplina de dados", method_primary_hint: "Uma pergunta pode contribuir para mais de uma perspectiva e disciplina; todas contam igualmente na nota de cada uma.",
    },
    en: {
      nav_datamesh: "Data Mesh", nav_assessments: "Assessments", nav_method: "How it's calculated", nav_opmodel: "Operating Model", nav_dataproducts: "Data Products",
      loading: "Loading...", loading_report: "Generating report...", loading_resp: "Loading responses...",
      start_assessment: "Start an assessment", generate_report: "Generate report", view_responses: "View responses",
      export_pdf: "Export PDF", copied: "Link copied!", noname: "(no name)",
      home_pill: "GUIDE + ASSESSMENT", home_title: "The Data Mesh journey on Databricks",
      home_lead: "Understand what Data Mesh is (and is not), assess your organization's maturity with multiple areas and get a diagnosis with the ideal model and the evolution path using Databricks products and solutions.",
      home_see_models: "See the Data Mesh models", h_what: "What Data Mesh is",
      h_principles: "The 4 principles of Data Mesh", principles_sub: "Data Mesh is an organizational and architectural paradigm. In Databricks, each principle has a technical enabler.",
      principle: "Principle", h_scale: "Maturity scale", scale_sub: "The assessment classifies each topic into one of four stages (inspired by DAMA-DMBOK and CMMI-DMM).",
      h_spectrum: "The target data model is a spectrum: from centralized to decentralized",
      spectrum_sub: "Data Mesh ranges from more centralized to more federated. The right topology depends on maturity - and evolves over time. For most enterprise customers, the recommended destination is the federated / hub-and-spoke model.",
      axis_more_central: "More centralized - less autonomy", axis_more_fed: "More decentralized - more autonomy",
      etapa: "Stage", kv_control: "Control", kv_autonomy: "Autonomy", kv_workspaces: "Workspaces",
      concept_title: "Market standards", concept_sub: "Market frameworks and standards behind the diagnosis (Data Mesh is one of the lenses):", sa_resources: "Resources for the SA",
      see_example: "See example", example_word: "Example",
      dg_sources: "Sources", dg_platform: "Central platform", dg_consumption: "Consumption / BI",
      dg_domain: "Domain", dg_hub: "Hub · Governance (UC)", dg_ws: "workspace", dg_catalog: "Catalog",
      dg_sharing: "Delta Sharing", dg_fedgov: "Federated governance (policies)",
      dg_dataproduct: "Data product", dg_owner: "Owner", dg_contract: "Contract", dg_sla: "SLA",
      dg_quality: "Quality", dg_selfserve: "Self-service platform", dg_policies: "Global policies (automatic)",
      dg_consumes: "consumes", dg_product_has: "Every data product has:",
      dom_customers: "Customers", dom_sales: "Sales", dom_credit: "Credit", dom_payments: "Payments", dom_logistics: "Logistics", dom_marketing: "Marketing", prod_transactions: "Transactions", prod_creditscore: "Credit score", dg_owns: "owns its data",
      dom_finance: "Finance", prod_customer360: "Customers 360", prod_offers: "Offers", prod_billing: "Billing",
      dg_ws_own: "own workspace", dg_product_flow: "One product's output is another's input", dg_hub_role: "sets global standards",
      pol_pii: "PII masking", pol_abac: "ABAC access", pol_tags: "Tags & classes", pol_quality: "Quality",
      delta_title: "What changes vs. the previous stage",
      dp_src: "Source data", dp_prod: "Data products", selfserve_layer: "Self-service layer",
      src_registration: "Registration", src_clickstream: "Clickstream", src_orders: "Orders", src_support: "Support", src_partners: "Partners",
      prod_segments: "Segments", prod_creditprop: "Credit propensity", prod_reco: "Recommendations", prod_nba: "Next best action",
      band_gov: "Governance · Unity Catalog + Policies", band_obs: "Observability · Lakehouse Monitoring",
      dp_practice_title: "Data domains and products in practice", see_details: "Scenario possibilities (detail)",
      ss_req_title: "Infrastructure requirements", ss_dbx_title: "Databricks features",
      ss_req_sub: "Each self-service platform requirement (based on Data Mesh principles) maps to a Databricks capability.",
      sspr: [
        ["Scalable polyglot storage", "Delta Lake + object storage (AWS/Azure/GCP)"],
        ["Governance, discovery and catalog", "Unity Catalog (catalog, tags, lineage)"],
        ["Unified access control and auditing", "Unity Catalog (ABAC, audit logs, system tables)"],
        ["De-identification and encryption", "Masking in UC, encryption at rest/in transit"],
        ["Federated identity", "SSO / SCIM / Identity Federation"],
        ["Pipelines and orchestration", "Lakeflow Declarative Pipelines + Lakeflow Jobs"],
        ["Data quality and versioning", "Expectations (DLT), Delta time travel"],
        ["Monitoring and observability", "Lakehouse Monitoring + system tables"],
        ["Cross-domain sharing", "Delta Sharing + Marketplace"],
        ["Infrastructure as code and self-service", "Databricks Asset Bundles + Terraform"],
      ],
      scen: {
        fundacao: [
          "Minimal domain blueprint: sources → ingestion → bronze/silver/gold (medallion) in a governed lakehouse.",
          "1-2 workspaces run by a central team; Unity Catalog as the single metastore.",
          "The 'gold' (published) layer can already be consumed internally, before it even becomes a shared product.",
        ],
        governado: [
          "A central hub publishes and curates products; domains exist as UC catalogs (the 3-level namespace partitions domains).",
          "Centralized publishing in two flavors: hub-curated ('pull') or BU-pushed ('push') with lightweight governance.",
          "Data can be copied to the hub storage, partitioned per domain; isolation via permissions and clusters.",
          "Benefit: domains reuse centrally-built data services with no effort of their own.",
        ],
        harmonizado: [
          "Each domain has its own workspace (DEV/STG/PRD) and publishes products as external tables pointing to its own storage.",
          "The central Unity Catalog enables discovery (publish metadata) and peer-to-peer consumption across domains, with no physical copy.",
          "Platform harmonized via blueprints (security/compliance) and self-service services (provisioning, catalog).",
          "Lineage tracked across all workspaces connected to the same metastore.",
        ],
        federado: [
          "Domains as full Lakehouses: their own workspaces (and even metastores) provisioned via automation (Terraform/DABs).",
          "Delta Sharing (D2D) extends the mesh across regions, clouds and even partner companies, without a shared stack.",
          "Federated computational governance applied by policy; a global catalog for discovery.",
          "Mind per-account workspace limits: reduce domains or combine DEV/STG when needed.",
        ],
      },
      assessments: "Assessments", new_assessment: "New assessment", new_sub: "Create an assessment for a customer. You will get links to share so each area can respond independently.",
      client_name: "Customer name", client_ph: "e.g., Example Bank Inc.", create: "Create assessment",
      existing: "Existing assessments", th_client: "Customer", th_created: "Created on", open_panel: "Open panel", report: "Report",
      none_yet: "No assessments yet.", create_err: "Error creating: ",
      act_hide: "Hide", act_show: "Show", act_export: "Export", act_archive: "Archive",
      act_restore: "Restore", history: "History", show_hidden: "Show hidden", hidden_badge: "hidden",
      archived_none: "No assessments in history.", confirm_archive: "Archive this assessment? It moves to history and leaves the active list.",
      import_btn: "Import (JSON)", imported_ok: "Assessment imported.", archived_ok: "Moved to history.",
      restored_ok: "Restored.", import_err: "Import error: ",
      importing: "Importing...", import_invalid_json: "Invalid JSON file.", responses_word: "responses",
      act_purge: "Delete permanently", confirm_purge: "Delete permanently? This cannot be undone.", purged_ok: "Permanently deleted.",
      total_responses: "responses in total", general_link: "General assessment link",
      general_link_sub: "Share with participants. Each person picks their area and responds independently.",
      copy_general: "Copy general link", progress_by_area: "Progress by area", respondents: "respondent(s)",
      questoes: "questions", peso: "weight", answer: "Respond", copy_area_link: "Copy area link",
      coverage_callout: "<b>How to cover the areas:</b> there should be <b>1 representative per area</b>. In <b>Business Domains</b>, ideally <b>1 representative per BU / business area</b> (each states their area when responding). If an area has no dedicated representative, <b>appoint the person closest to the topic</b> - for example, if there is no one from Security & Privacy, the Governance or Platform team can answer for it. A response from the closest owner is better than leaving the area uncovered.",
      responses_title: "Responses", responses_sub: "Individual responses by area and respondent. Levels (1 to 4) follow the maturity scale.",
      no_responses: "No responses yet.", th_question: "Question", th_level: "Level", th_answer: "Chosen answer", responses_count: "responses",
      responder_pill: "ASSESSMENT", responder_default_title: "Data maturity assessment",
      responder_lead: "Choose the area you represent. Your answers help build a consolidated diagnosis of data maturity.",
      responder_callout: "There should be one representative per area. If you are not exactly from this area but are the person closest to the topic, you can answer for it. In <b>Business Domains</b>, state your <b>business area (BU)</b> - ideally one representative per BU.",
      perguntas: "questions", already_answered: "already answered",
      change_area: "Switch area", your_name: "Your name (to save and resume your answers)",
      name_ph: "e.g., Maria Silva", subarea_ph: "e.g., Credit", answered: "answered", save: "Save answers",
      na_option: "Don't know / Not applicable", saved_ok: "Answers saved! Thank you.",
      err_subarea: "Enter the business area name.", err_name: "Enter your name before saving.",
      err_one: "Answer at least one question.", save_err: "Error saving: ", area_fallback: "Area",
      report_pill: "DATA MATURITY", report_default: "Data maturity report",
      generated_on: "Generated on", coverage: "Coverage", kpi_global: "Global score (of 4.0)",
      kpi_stage: "Maturity stage", kpi_readiness: "Federated model readiness", kpi_topology: "Target data model",
      h_by_maturity: "Maturity by operational dimension", h_by_function: "Maturity by data discipline (DAMA)", h_by_function_note: "The 9 DAMA-DMBOK data disciplines (knowledge areas) - the methodological base.", h_by_maturity_note: "A regrouping of the same answers into operational themes (incl. Operating Model, DataOps and FinOps, not named by DAMA). Composition in 'How it is calculated'.", h_by_dimension: "Perspective (People / Process / Technology)", h_by_principle: "By Data Mesh principle",
      h_func_detail: "Detail by data discipline",
      weight_note: "All areas have equal weight (1x). Business responses are consolidated: the multiple business respondents are averaged per question and count as a single voice, without overpowering the other areas.",
      h_reco_model: "Recommended target data model",
      reco_model_sub: "The target data model ranges from centralized to federated. Given the current maturity, the suitable one is highlighted below. At the federated end, the market calls it Data Mesh.",
      next_step: "The next evolution step is", axis_central: "More centralized", axis_fed: "More federated",
      recommended: "RECOMMENDED", how_databricks: "How it looks on Databricks", kv_central_control: "Central control",
      kv_governance: "Governance", kv_sharing: "Sharing",
      foundation_note: "The recommendation respects the <b>foundation ceiling</b> (governance, security, quality, operations and architecture): score",
      foundation_note_end: "You don't federate beyond what the foundation supports.",
      h_strengths: "Highlights", no_strengths: "No highlights identified yet.",
      h_roadmap: "Evolution roadmap", h_reco: "Recommendations and how to advance with Databricks",
      reco_sub: "Recommended actions <b>ordered by priority (quick-wins first)</b>: more evolution value per unit of complexity. Each action shows criticality, value, complexity and the <b>official Databricks documentation links</b>.",
      th_horizon: "Horizon", th_function: "Function", th_crit: "Criticality",
      th_reco: "Databricks recommendation (+ docs)", effort_word: "effort", docs_word: "Docs:",
      reco_empty: "No pending actions: all functions are already at the maximum maturity stage.",
      h_key_messages: "Key messages", ref_concept: "Market standards", ref_internal: "Internal resources (SA)", ref_public: "Public resources",
      not_enough_title: "Not enough responses yet", not_enough_sub: "Ask the areas to respond to the assessment and come back to generate the diagnosis.", go_panel: "Go to panel",
      notfound_title: "Not found", notfound_sub: "This assessment does not exist or the link is incorrect.", go_home: "Go to home",
      err: "Error", fw_err: "Error loading the framework: ",
      crit_Alta: "High", crit_Media: "Medium", crit_Baixa: "Low",
      eff_Simples: "Low", eff_Media: "Medium", eff_Complexa: "High",
      method_title: "How the calculation works", method_sub: "Full transparency on the methodology: how each answer becomes a score, and what each question contributes to.",
      method_rules_title: "Calculation rules",
      method_table_title: "Mapping: question × perspective × data discipline × operational dimension",
      th_area: "Area", th_dim: "Perspective (PPT)", th_opdim: "Operational dimension", th_principle: "Mesh principle", th_qweight: "Weight",
      th_dims: "Perspective (PPT)", th_fns: "Data discipline", method_primary_hint: "A question can contribute to more than one perspective and discipline; all count equally toward each one's score.",
    },
    es: {
      nav_datamesh: "Data Mesh", nav_assessments: "Assessments", nav_method: "Cómo se calcula", nav_opmodel: "Modelo Operativo", nav_dataproducts: "Productos de Datos",
      loading: "Cargando...", loading_report: "Generando informe...", loading_resp: "Cargando respuestas...",
      start_assessment: "Iniciar un assessment", generate_report: "Generar informe", view_responses: "Ver respuestas",
      export_pdf: "Exportar PDF", copied: "¡Enlace copiado!", noname: "(sin nombre)",
      home_pill: "GUÍA + ASSESSMENT", home_title: "El camino de Data Mesh en Databricks",
      home_lead: "Entienda qué es (y qué no es) Data Mesh, evalúe la madurez de su organización con múltiples áreas y reciba un diagnóstico con el modelo ideal y el camino de evolución usando productos y soluciones Databricks.",
      home_see_models: "Ver los modelos de Data Mesh", h_what: "Qué es Data Mesh",
      h_principles: "Los 4 principios de Data Mesh", principles_sub: "Data Mesh es un paradigma organizacional y arquitectónico. En Databricks, cada principio tiene un habilitador técnico.",
      principle: "Principio", h_scale: "Escala de madurez", scale_sub: "El assessment clasifica cada tema en una de cuatro etapas (inspirada en DAMA-DMBOK y CMMI-DMM).",
      h_spectrum: "El modelo-objetivo de datos es un espectro: de centralizado a descentralizado",
      spectrum_sub: "Data Mesh va de más centralizado a más federado. La topología correcta depende de la madurez - y evoluciona con el tiempo. Para la mayoría de los clientes enterprise, el destino recomendado es el modelo federado / hub-and-spoke.",
      axis_more_central: "Más centralizado - menor autonomía", axis_more_fed: "Más descentralizado - mayor autonomía",
      etapa: "Etapa", kv_control: "Control", kv_autonomy: "Autonomía", kv_workspaces: "Workspaces",
      concept_title: "Estándares de mercado", concept_sub: "Marcos y estándares de mercado que fundamentan el diagnóstico (Data Mesh es una de las lentes):", sa_resources: "Recursos para el SA",
      see_example: "Ver ejemplo", example_word: "Ejemplo",
      dg_sources: "Fuentes", dg_platform: "Plataforma central", dg_consumption: "Consumo / BI",
      dg_domain: "Dominio", dg_hub: "Hub · Gobierno (UC)", dg_ws: "workspace", dg_catalog: "Catálogo",
      dg_sharing: "Delta Sharing", dg_fedgov: "Gobierno federado (políticas)",
      dg_dataproduct: "Producto de datos", dg_owner: "Owner", dg_contract: "Contrato", dg_sla: "SLA",
      dg_quality: "Calidad", dg_selfserve: "Plataforma self-service", dg_policies: "Políticas globales (automáticas)",
      dg_consumes: "consume", dg_product_has: "Todo producto de datos tiene:",
      dom_customers: "Clientes", dom_sales: "Ventas", dom_credit: "Crédito", dom_payments: "Pagos", dom_logistics: "Logística", dom_marketing: "Marketing", prod_transactions: "Transacciones", prod_creditscore: "Score de crédito", dg_owns: "dueño de sus datos",
      dom_finance: "Finanzas", prod_customer360: "Clientes 360", prod_offers: "Ofertas", prod_billing: "Cobranza",
      dg_ws_own: "workspace propio", dg_product_flow: "La salida de un producto es la entrada de otro", dg_hub_role: "define estándares globales",
      pol_pii: "Máscara PII", pol_abac: "Acceso ABAC", pol_tags: "Tags y clases", pol_quality: "Calidad",
      delta_title: "Qué cambia respecto a la etapa anterior",
      dp_src: "Datos de origen", dp_prod: "Productos de datos", selfserve_layer: "Capa self-service",
      src_registration: "Registro", src_clickstream: "Clickstream", src_orders: "Pedidos", src_support: "Soporte", src_partners: "Socios",
      prod_segments: "Segmentos", prod_creditprop: "Propensión a crédito", prod_reco: "Recomendaciones", prod_nba: "Próxima mejor acción",
      band_gov: "Gobierno · Unity Catalog + Políticas", band_obs: "Observabilidad · Lakehouse Monitoring",
      dp_practice_title: "Dominios y productos de datos en la práctica", see_details: "Posibilidades de este escenario (detalle)",
      ss_req_title: "Requisitos de infraestructura", ss_dbx_title: "Recursos Databricks",
      ss_req_sub: "Cada requisito de una plataforma self-service (base: principios de Data Mesh) tiene un recurso Databricks que lo atiende.",
      sspr: [
        ["Almacenamiento poliglota y escalable", "Delta Lake + object storage (AWS/Azure/GCP)"],
        ["Gobierno, descubrimiento y catálogo", "Unity Catalog (catálogo, tags, lineage)"],
        ["Control de acceso unificado y auditoría", "Unity Catalog (ABAC, audit logs, system tables)"],
        ["De-identificación y cifrado", "Enmascaramiento en UC, cifrado at rest/in transit"],
        ["Identidad federada", "SSO / SCIM / Identity Federation"],
        ["Pipelines y orquestación", "Lakeflow Declarative Pipelines + Lakeflow Jobs"],
        ["Calidad y versionado de datos", "Expectativas (DLT), Delta time travel"],
        ["Monitoreo y observabilidad", "Lakehouse Monitoring + system tables"],
        ["Compartición entre dominios", "Delta Sharing + Marketplace"],
        ["Infra como código y self-service", "Databricks Asset Bundles + Terraform"],
      ],
      scen: {
        fundacao: [
          "Blueprint mínimo de dominio: fuentes → ingesta → bronze/silver/gold (medallón) en un lakehouse gobernado.",
          "1 a 2 workspaces operados por un equipo central; Unity Catalog como metastore único.",
          "La capa 'gold' (publicada) ya puede consumirse internamente, antes incluso de volverse un producto compartido.",
        ],
        governado: [
          "Un hub central publica y cura los productos; los dominios existen como catálogos en UC (el namespace de 3 niveles particiona los dominios).",
          "Publicación centralizada en dos sabores: curada por el hub ('pull') o empujada por la BU ('push') con gobierno ligero.",
          "Los datos pueden copiarse al storage del hub, particionados por dominio; aislamiento por permisos y clusters.",
          "Ventaja: los dominios reutilizan servicios de datos centralizados sin esfuerzo propio.",
        ],
        harmonizado: [
          "Cada dominio tiene su propio workspace (DEV/STG/PRD) y publica productos como tablas externas que apuntan a su propio storage.",
          "El Unity Catalog central habilita el descubrimiento (publish metadata) y el consumo peer-to-peer entre dominios, sin copia física.",
          "Plataforma armonizada por blueprints (seguridad/compliance) y servicios self-service (aprovisionamiento, catálogo).",
          "Linaje rastreado entre todos los workspaces conectados al mismo metastore.",
        ],
        federado: [
          "Dominios como Lakehouses completos: sus propios workspaces (y hasta metastores) aprovisionados por automatización (Terraform/DABs).",
          "Delta Sharing (D2D) extiende la malla entre regiones, nubes e incluso empresas socias, sin exigir el mismo stack.",
          "Gobierno federado computacional aplicado por política; catálogo global para el descubrimiento.",
          "Atención a los límites de workspaces por cuenta: reduce dominios o combina DEV/STG cuando sea necesario.",
        ],
      },
      assessments: "Assessments", new_assessment: "Nuevo assessment", new_sub: "Cree un assessment para un cliente. Recibirá enlaces para compartir y que cada área responda de forma independiente.",
      client_name: "Nombre del cliente", client_ph: "Ej.: Banco Ejemplo S.A.", create: "Crear assessment",
      existing: "Assessments existentes", th_client: "Cliente", th_created: "Creado el", open_panel: "Abrir panel", report: "Informe",
      none_yet: "Aún no hay assessments.", create_err: "Error al crear: ",
      act_hide: "Ocultar", act_show: "Mostrar", act_export: "Exportar", act_archive: "Archivar",
      act_restore: "Restaurar", history: "Historial", show_hidden: "Mostrar ocultos", hidden_badge: "oculto",
      archived_none: "Ningún assessment en el historial.", confirm_archive: "¿Archivar este assessment? Va al historial y sale de la lista activa.",
      import_btn: "Importar (JSON)", imported_ok: "Assessment importado.", archived_ok: "Movido al historial.",
      restored_ok: "Restaurado.", import_err: "Error al importar: ",
      importing: "Importando...", import_invalid_json: "Archivo JSON inválido.", responses_word: "respuestas",
      act_purge: "Eliminar definitivamente", confirm_purge: "¿Eliminar definitivamente? Esta acción no se puede deshacer.", purged_ok: "Eliminado definitivamente.",
      total_responses: "respuestas en total", general_link: "Enlace general del assessment",
      general_link_sub: "Comparta con los participantes. Cada persona elige su área y responde de forma independiente.",
      copy_general: "Copiar enlace general", progress_by_area: "Progreso por área", respondents: "respondente(s)",
      questoes: "preguntas", peso: "peso", answer: "Responder", copy_area_link: "Copiar enlace del área",
      coverage_callout: "<b>Cómo cubrir las áreas:</b> debe haber <b>1 representante por área</b>. En <b>Dominios de Negocio</b>, lo ideal es <b>1 representante por BU / área de negocio</b> (cada uno indica su área al responder). Si algún área no tiene representante dedicado, <b>designe al responsable más cercano al tema</b> - por ejemplo, si no hay alguien de Seguridad y Privacidad, el equipo de Gobierno o de Plataforma puede responder por ella. Es mejor la respuesta del responsable más cercano que dejar el área sin cobertura.",
      responses_title: "Respuestas", responses_sub: "Respuestas individuales por área y respondente. Los niveles (1 a 4) siguen la escala de madurez.",
      no_responses: "Aún sin respuestas.", th_question: "Pregunta", th_level: "Nivel", th_answer: "Respuesta elegida", responses_count: "respuestas",
      responder_pill: "ASSESSMENT", responder_default_title: "Assessment de madurez de datos",
      responder_lead: "Elija el área que representa. Sus respuestas ayudan a construir un diagnóstico consolidado de la madurez de datos.",
      responder_callout: "Debe haber un representante por área. Si no es exactamente de esta área pero es la persona más cercana al tema, puede responder por ella. En <b>Dominios de Negocio</b>, indique su <b>área de negocio (BU)</b> - lo ideal es un representante por BU.",
      perguntas: "preguntas", already_answered: "ya respondieron",
      change_area: "Cambiar de área", your_name: "Su nombre (para guardar y retomar sus respuestas)",
      name_ph: "Ej.: Maria Silva", subarea_ph: "Ej.: Crédito", answered: "respondidas", save: "Guardar respuestas",
      na_option: "No sé / No aplica", saved_ok: "¡Respuestas guardadas! Gracias.",
      err_subarea: "Indique el nombre del área de negocio.", err_name: "Indique su nombre antes de guardar.",
      err_one: "Responda al menos una pregunta.", save_err: "Error al guardar: ", area_fallback: "Área",
      report_pill: "MADUREZ DE DATOS", report_default: "Informe de madurez de datos",
      generated_on: "Generado el", coverage: "Cobertura", kpi_global: "Nota global (de 4,0)",
      kpi_stage: "Etapa de madurez", kpi_readiness: "Preparación p/ modelo federado", kpi_topology: "Modelo-objetivo de datos",
      h_by_maturity: "Madurez por dimensión operativa", h_by_function: "Madurez por disciplina de datos (DAMA)", h_by_function_note: "Las 9 disciplinas de gestión de datos (áreas de conocimiento) de DAMA-DMBOK - la base metodológica.", h_by_maturity_note: "Reagrupamiento de las mismas respuestas en temas operativos (incl. Modelo Operativo, DataOps y FinOps, no nombrados por DAMA). Composición en 'Cómo se calcula'.", h_by_dimension: "Perspectiva (Personas / Procesos / Tecnología)", h_by_principle: "Por principio de Data Mesh",
      h_func_detail: "Detalle por disciplina de datos",
      weight_note: "Todas las áreas tienen peso igual (1x). Las respuestas de negocio se consolidan: los múltiples respondentes de negocio se promedian por pregunta y cuentan como una sola voz, sin sobresalir frente a las demás áreas.",
      h_reco_model: "Modelo-objetivo de datos recomendado",
      reco_model_sub: "El modelo-objetivo de datos va de lo centralizado a lo federado. Dada la madurez actual, el adecuado se destaca abajo. En el extremo federado, el mercado lo llama Data Mesh.",
      next_step: "La siguiente etapa de evolución es", axis_central: "Más centralizado", axis_fed: "Más federado",
      recommended: "RECOMENDADO", how_databricks: "Cómo queda en Databricks", kv_central_control: "Control central",
      kv_governance: "Gobierno", kv_sharing: "Comparticion",
      foundation_note: "La recomendación respeta el <b>techo de la fundación</b> (gobierno, seguridad, calidad, operaciones y arquitectura): nota",
      foundation_note_end: "No se federa más allá de lo que la base sostiene.",
      h_strengths: "Puntos destacados", no_strengths: "Aún no se identificaron puntos destacados.",
      h_roadmap: "Roadmap de evolución", h_reco: "Recomendaciones y cómo avanzar con Databricks",
      reco_sub: "Acciones recomendadas <b>ordenadas por prioridad (quick-wins primero)</b>: más valor para evolución por unidad de complejidad. Cada acción muestra criticidad, valor, complejidad y los <b>enlaces de la documentación oficial</b> Databricks.",
      th_horizon: "Horizonte", th_function: "Función", th_crit: "Criticidad",
      th_reco: "Recomendación Databricks (+ docs)", effort_word: "esfuerzo", docs_word: "Docs:",
      reco_empty: "Ninguna acción pendiente: todas las funciones ya están en la etapa máxima de madurez.",
      h_key_messages: "Mensajes clave", ref_concept: "Estándares de mercado", ref_internal: "Recursos internos (SA)", ref_public: "Recursos públicos",
      not_enough_title: "Aún sin respuestas suficientes", not_enough_sub: "Pida a las áreas que respondan el assessment y vuelva para generar el diagnóstico.", go_panel: "Ir al panel",
      notfound_title: "No encontrado", notfound_sub: "Este assessment no existe o el enlace es incorrecto.", go_home: "Ir al inicio",
      err: "Error", fw_err: "Error al cargar el framework: ",
      crit_Alta: "Alta", crit_Media: "Media", crit_Baixa: "Baja",
      eff_Simples: "Simple", eff_Media: "Media", eff_Complexa: "Compleja",
      method_title: "Cómo se hace el cálculo", method_sub: "Transparencia total sobre la metodología: cómo cada respuesta se convierte en nota, y a qué contribuye cada pregunta.",
      method_rules_title: "Reglas de cálculo",
      method_table_title: "Mapa de asociaciones: pregunta × perspectiva × disciplina de datos × dimensión operativa",
      th_area: "Área", th_dim: "Perspectiva (PPT)", th_opdim: "Dimensión operativa", th_principle: "Principio Mesh", th_qweight: "Peso",
      th_dims: "Perspectiva (PPT)", th_fns: "Disciplina de datos", method_primary_hint: "Una pregunta puede contribuir a más de una perspectiva y disciplina; todas cuentan por igual en la nota de cada una.",
    },
  };
  // Traducoes EN/ES anexadas (chaves novas: modelo operacional, produtos de dados, gantt/matriz, passo a passo, recomendacoes).
  Object.assign(I18N.en, {
    om_title: "Data Operating Model", om_sub: "Data areas/capabilities, their functions and the RACI. Every company names them differently - so we include common market synonyms.",
    om_legend: "RACI legend", om_stage_view: "How it scales by stage", om_functions: "Functions and RACI", om_synonyms: "Also called",
    om_staffing: "How it is staffed at each stage", om_open: "View functions and RACI", om_local_title: "Fill in your model",
    om_local_sub: "Assign each function to an area/person in your organization. Leave TBD if still undefined, or 'None' if not applicable.",
    om_tbd: "TBD (to define)", om_none: "None", om_named: "Area / Person", om_name_ph: "e.g.: Governance - Maria Silva",
    om_save: "Save model", om_saved: "Model saved!", om_overload: "Load and conflicts", om_overload_ok: "No obvious overload with the names provided.",
    om_overload_hint: "The same person appears across many areas/functions. Stacking Platform + Engineering + Governance, for example, creates a bottleneck and a segregation-of-duties risk.",
    om_roles_count: "roles", om_edit_local: "Operating model", om_ref_note: "Reference model (default).",
    om_legend_areas: "Data areas (synonyms and what they do)", om_legend_roles: "Data professional roles",
    om_open_full: "View operating model", om_stage_hint: "Choose the model (stage) to see who does what. The more centralized, the more roles stack onto few people (a sign of overload); the more federated, the more roles distribute and multiply per domain.",
    h_reco_opmodel: "Operating model for the recommended stage", reco_opmodel_sub: "Suggested roles and responsibilities (RACI) for the model the client was placed in:",
    pub_title: "How domains publish and consume products (step by step)", pub_sub: "Choose the model and step through it. In Harmonized the consumer reads with no copy (external table); in Hub-and-Spoke data is copied to a central Data Hub.",
    pub_step: "Step", pub_prev: "Previous", pub_next: "Next",
    h_position: "Where you are: target model by maturity stage",
    dp_page_title: "What is a data product", dp_page_sub: "A data product enables a business goal through data. It does not need to be sophisticated - it can be as simple as a well-maintained table.",
    dp_attrs_title: "Characteristics of a good data product", dp_cats_title: "Data product categories (well beyond tables)",
    dp_cats_sub: "Producers (P) and consumers (C) vary by category. Each has a Databricks enabler.", dp_hier_title: "Data product hierarchy (mapped to the medallion)",
    dp_th_cat: "Category", dp_th_product: "Data product", dp_th_dbx: "In Databricks",
    dp_uc_note: "Across all categories there is cross-cutting governance: catalog, discovery, lineage, access control and classification via Unity Catalog; and monitoring/observability (Lakehouse Monitoring).",
    th_valor: "Value to evolve", th_complexity: "Complexity", val_Alto: "High", val_Medio: "Medium", val_Baixo: "Low",
    valor_click: "click to see the questions it advances", valor_modal_title: "Questions this action helps advance",
    valor_modal_sub: "Deficient questions (level < 3) associated with the function", valor_modal_none: "No deficient questions associated.",
    h_priomatrix: "Prioritization matrix", axis_complexity: "Complexity", axis_value: "Value to evolve",
    priomatrix_sub: "Each action (<b>top 20 by priority</b>) plots <b>Value to evolve x Complexity</b>. Prioritize the top-left corner (quick wins): high value, low complexity. Hover to see the details.",
    quad_quickwin: "Quick wins", quad_strategic: "Strategic", quad_fillin: "Incremental", quad_avoid: "Later",
    th_action: "Action", th_prereq: "Prerequisites", acoes_word: "actions", h_gantt: "Timeline (Gantt)",
    gantt_sub: "Each box shows the horizon and the action code; the border color indicates the horizon (see the legend). Arrows show dependencies (an action starts only after its prerequisites); when there is no dependency between functions, the actions of the same data function are chained by priority order. Hover over a box to see the details.",
    h1_label: "H1 - Foundation (0-3m)", h2_label: "H2 - Standardization (3-9m)", h3_label: "H3 - Federation (9+m)",
    espectro: "spectrum", metodologia: "Methodology", salvar: "Save",
  });
  Object.assign(I18N.es, {
    om_title: "Modelo Operacional de Datos", om_sub: "Áreas/capacidades de datos, sus funciones y la RACI. Cada empresa las nombra distinto - por eso incluimos sinónimos comunes del mercado.",
    om_legend: "Leyenda RACI", om_stage_view: "Cómo escala por etapa", om_functions: "Funciones y RACI", om_synonyms: "También llamada",
    om_staffing: "Cómo se provee en cada etapa", om_open: "Ver funciones y RACI", om_local_title: "Complete su modelo",
    om_local_sub: "Asigne cada función a un área/persona de su organización. Deje TBD si aún no está definido, o 'No habrá' si no aplica.",
    om_tbd: "TBD (por definir)", om_none: "No habrá", om_named: "Área / Persona", om_name_ph: "Ej.: Gobernanza - María Silva",
    om_save: "Guardar modelo", om_saved: "¡Modelo guardado!", om_overload: "Carga y conflictos", om_overload_ok: "Sin sobrecarga evidente con los nombres indicados.",
    om_overload_hint: "La misma persona aparece en muchas áreas/funciones. Acumular Plataforma + Ingeniería + Gobernanza, por ejemplo, genera cuello de botella y riesgo de segregación de funciones.",
    om_roles_count: "roles", om_edit_local: "Modelo operacional", om_ref_note: "Modelo de referencia (por defecto).",
    om_legend_areas: "Áreas de datos (sinónimos y qué hacen)", om_legend_roles: "Roles de profesionales de Datos",
    om_open_full: "Ver modelo operacional", om_stage_hint: "Elija el modelo (etapa) para ver quién hace qué. Cuanto más centralizado, más roles se acumulan en pocas personas (señal de sobrecarga); cuanto más federado, más se distribuyen y multiplican por dominio.",
    h_reco_opmodel: "Modelo operacional de la etapa recomendada", reco_opmodel_sub: "Roles y responsabilidades (RACI) sugeridos para el modelo en que se ubicó al cliente:",
    pub_title: "Cómo los dominios publican y consumen productos (paso a paso)", pub_sub: "Elija el modelo y avance por los pasos. En Armonizado el consumidor lee sin copia (tabla externa); en Hub-and-Spoke los datos se copian a un Data Hub central.",
    pub_step: "Paso", pub_prev: "Anterior", pub_next: "Siguiente",
    h_position: "Dónde está: modelo objetivo por etapa de madurez",
    dp_page_title: "Qué es un producto de datos", dp_page_sub: "Un producto de datos facilita un objetivo de negocio a través de los datos. No necesita ser sofisticado - puede ser incluso una tabla bien cuidada.",
    dp_attrs_title: "Características de un buen producto de datos", dp_cats_title: "Categorías de productos de datos (mucho más que tablas)",
    dp_cats_sub: "Productores (P) y consumidores (C) varían por categoría. Cada una tiene un habilitador en Databricks.", dp_hier_title: "Jerarquía de productos de datos (mapeada al medallion)",
    dp_th_cat: "Categoría", dp_th_product: "Producto de dato", dp_th_dbx: "En Databricks",
    dp_uc_note: "En todas las categorías hay gobernanza transversal: catálogo, descubrimiento, linaje, control de acceso y clasificación vía Unity Catalog; y monitoreo/observabilidad (Lakehouse Monitoring).",
    th_valor: "Valor p/ evolución", th_complexity: "Complejidad", val_Alto: "Alto", val_Medio: "Medio", val_Baixo: "Bajo",
    valor_click: "clic para ver las preguntas que evolucionan", valor_modal_title: "Preguntas que esta acción ayuda a evolucionar",
    valor_modal_sub: "Preguntas deficientes (nivel < 3) asociadas a la función", valor_modal_none: "Sin preguntas deficientes asociadas.",
    h_priomatrix: "Matriz de priorización", axis_complexity: "Complejidad", axis_value: "Valor para evolución",
    priomatrix_sub: "Cada acción (<b>top 20 por prioridad</b>) cruza <b>Valor para evolución x Complejidad</b>. Priorice la esquina superior izquierda (quick wins): alto valor, baja complejidad. Pase el mouse para ver los detalles.",
    quad_quickwin: "Quick wins", quad_strategic: "Estratégicos", quad_fillin: "Incrementales", quad_avoid: "Después",
    th_action: "Acción", th_prereq: "Prerrequisitos", acoes_word: "acciones", h_gantt: "Línea de tiempo (Gantt)",
    gantt_sub: "Cada caja muestra el horizonte y el código de la acción; el color del borde indica el horizonte (vea la leyenda). Las flechas muestran las dependencias (una acción solo comienza tras sus prerrequisitos); cuando no hay dependencia entre funciones, las acciones de una misma función de datos se encadenan por orden de prioridad. Pase el mouse sobre una caja para ver los detalles.",
    h1_label: "H1 - Fundación (0-3m)", h2_label: "H2 - Estandarización (3-9m)", h3_label: "H3 - Federación (9+m)",
    espectro: "espectro", metodologia: "Metodología", salvar: "Guardar",
  });
  Object.assign(I18N.pt, {
    th_desc: "Descrição", th_area: "Área", th_function: "Função",
    dg_owner_role: "Dono do domínio", dg_owner_desc: "responde pelo produto (accountable)",
    dg_steward_role: "Data Steward", dg_steward_desc: "conhecimento técnico e detalhado do domínio",
    dg_ownership_note: "Cada domínio: um owner (accountable) e um steward com o conhecimento técnico e detalhado do domínio.",
    dp_more_link: "Ver produtos de dados em detalhe", next_model_title: "Próximo modelo (evolução)",
  });
  Object.assign(I18N.en, {
    th_desc: "Description", th_area: "Area", th_function: "Function",
    dg_owner_role: "Domain owner", dg_owner_desc: "accountable for the product",
    dg_steward_role: "Data Steward", dg_steward_desc: "deep, detailed domain knowledge",
    dg_ownership_note: "Each domain: one owner (accountable) and one steward with deep, detailed domain knowledge.",
    dp_more_link: "See data products in detail", next_model_title: "Next model (evolution)",
  });
  Object.assign(I18N.es, {
    th_desc: "Descripción", th_area: "Área", th_function: "Función",
    dg_owner_role: "Dueño del dominio", dg_owner_desc: "responde por el producto (accountable)",
    dg_steward_role: "Data Steward", dg_steward_desc: "conocimiento técnico y detallado del dominio",
    dg_ownership_note: "Cada dominio: un owner (accountable) y un steward con conocimiento técnico y detallado del dominio.",
    dp_more_link: "Ver productos de datos en detalle", next_model_title: "Siguiente modelo (evolución)",
  });
  const t = (k) => (I18N[LANG] && I18N[LANG][k] != null) ? I18N[LANG][k] : (I18N.pt[k] != null ? I18N.pt[k] : k);

  // Regras de calculo (HTML) por idioma.
  const METHOD_RULES = {
    pt: `<p class="muted" style="margin-top:0">Metodologia baseada em <b>DAMA-DMBOK</b>, com práticas de maturidade do <b>DCAM (EDM Council)</b> e do <b>CMMI-DMM</b>. Gestão de dados é sociotécnica: cada prática envolve papéis (Pessoas), procedimentos (Processos) e ferramentas (Tecnologia) e costuma tocar mais de uma disciplina de dados. Na roda do DAMA, a <b>Governança de Dados é a disciplina central</b> que orienta as demais - por isso aparece como disciplina secundária de muitas práticas.</p>
    <ol style="line-height:1.7;padding-left:18px">
      <li><b>Associação múltipla:</b> cada pergunta é associada a <b>todas as perspectivas</b> (Pessoas/Processos/Tecnologia) e <b>disciplinas de dados</b> que ela materialmente exige - ex.: linhagem/dicionário conta em <b>Processos e Tecnologia</b>, e nas disciplinas <b>Metadados e Governança</b>. Cada pergunta também pertence a uma <b>dimensão operacional</b> (visão executiva que inclui Modelo Operacional, DataOps e FinOps, ausentes nas disciplinas DAMA). A tabela abaixo lista essas associações.</li>
      <li><b>Como a nota é calculada:</b> a nota de cada <b>disciplina</b> e de cada <b>perspectiva</b> é a média de <b>todas as perguntas associadas a ela - todas contam igualmente</b>. A <b>nota global</b> é a média de todas as perguntas respondidas (cada pergunta entra uma única vez).</li>
      <li><b>Da resposta ao nível:</b> cada opção vale um nível de 1 a 4 (Reativo, Inicial, Definido, Otimizado). "Não sei / Não se aplica" é nulo e não entra no cálculo.</li>
      <li><b>Nível por pergunta:</b> com vários respondentes, usa-se a <b>média</b> dos níveis informados.</li>
      <li><b>Peso das áreas:</b> todas as áreas têm <b>peso igual (1x)</b>. As respostas das <b>áreas de negócio</b> são consolidadas (média entre os respondentes por pergunta) e contam como uma única voz - não são somadas às demais.</li>
      <li><b>Prontidão p/ Mesh</b> = média dos 4 princípios, limitada por um <b>teto cultural</b> (patrocínio, estratégia e cultura): sem base cultural, a capacidade técnica não se traduz em Mesh real. <b>Estágio</b> = arredondamento "half-up" da nota (1,5→2; 2,5→3; 3,5→4).</li>
      <li><b>Topologia recomendada:</b> índice = 0,55×global + 0,45×prontidão, <b>limitado pela fundação</b> (governança, segurança, qualidade, operações, arquitetura): não se federa além do que a base sustenta.</li>
      <li><b>Criticidade:</b> por nota (Alta &lt;1,8; Média &lt;2,5; Baixa caso contrário), elevada um nível para funções de risco (segurança, privacidade, governança) ainda imaturas.</li>
    </ol>`,
    en: `<p class="muted" style="margin-top:0">Methodology based on <b>DAMA-DMBOK</b>, with maturity practices from <b>DCAM (EDM Council)</b> and <b>CMMI-DMM</b>. Data management is socio-technical: each practice involves roles (People), procedures (Processes) and tools (Technology) and usually touches more than one data function. In the DAMA wheel, <b>Data Governance is the central function</b> that guides the others - which is why it appears as a secondary function of many practices.</p>
    <ol style="line-height:1.7;padding-left:18px">
      <li><b>Multiple association:</b> each question is associated with <b>all the dimensions</b> (People/Process/Technology) and <b>data functions</b> it materially requires - e.g., lineage/dictionary counts in <b>Processes and Technology</b>, and under the <b>Metadata and Governance</b> functions. The table below lists these associations.</li>
      <li><b>How the score is computed:</b> each <b>function</b> and <b>dimension</b> score is the average of <b>all questions associated with it - all count equally</b>. The <b>global score</b> is the average of all answered questions (each question counts once).</li>
      <li><b>From answer to level:</b> each option is worth a level from 1 to 4 (Reactive, Initial, Defined, Optimized). "Don't know / N/A" is null and is excluded.</li>
      <li><b>Level per question:</b> with several respondents, the <b>average</b> of the reported levels is used.</li>
      <li><b>Area weight:</b> all areas have <b>equal weight (1x)</b>. <b>Business</b> responses are consolidated (averaged across respondents per question) and count as a single voice - not summed with the others.</li>
      <li><b>Mesh readiness</b> = average of the 4 principles. <b>Stage</b> = half-up rounding of the score (1.5→2; 2.5→3; 3.5→4).</li>
      <li><b>Recommended topology:</b> index = 0.55×global + 0.45×readiness, <b>capped by the foundation</b> (governance, security, quality, operations, architecture): you don't federate beyond what the base supports.</li>
      <li><b>Criticality:</b> by score (High &lt;1.8; Medium &lt;2.5; Low otherwise), raised one level for still-immature high-risk functions (security, privacy, governance).</li>
    </ol>`,
    es: `<p class="muted" style="margin-top:0">Metodología basada en <b>DAMA-DMBOK</b>, con prácticas de madurez de <b>DCAM (EDM Council)</b> y <b>CMMI-DMM</b>. La gestión de datos es sociotécnica: cada práctica involucra roles (Personas), procedimientos (Procesos) y herramientas (Tecnología) y suele tocar más de una función de datos. En la rueda de DAMA, el <b>Gobierno de Datos es la función central</b> que orienta a las demás - por eso aparece como función secundaria de muchas prácticas.</p>
    <ol style="line-height:1.7;padding-left:18px">
      <li><b>Asociación múltiple:</b> cada pregunta se asocia con <b>todas las dimensiones</b> (Personas/Procesos/Tecnología) y <b>funciones de datos</b> que exige materialmente - ej.: linaje/diccionario cuenta en <b>Procesos y Tecnología</b>, y en las funciones <b>Metadatos y Gobierno</b>. La tabla de abajo lista estas asociaciones.</li>
      <li><b>Cómo se calcula la nota:</b> la nota de cada <b>función</b> y <b>dimensión</b> es el promedio de <b>todas las preguntas asociadas a ella - todas cuentan por igual</b>. La <b>nota global</b> es el promedio de todas las preguntas respondidas (cada pregunta cuenta una vez).</li>
      <li><b>De la respuesta al nivel:</b> cada opción vale un nivel de 1 a 4 (Reactivo, Inicial, Definido, Optimizado). "No sé / No aplica" es nulo y se excluye.</li>
      <li><b>Nivel por pregunta:</b> con varios respondentes, se usa el <b>promedio</b> de los niveles informados.</li>
      <li><b>Peso de las áreas:</b> todas las áreas tienen <b>peso igual (1x)</b>. Las respuestas de <b>negocio</b> se consolidan (promedio entre respondentes por pregunta) y cuentan como una sola voz - no se suman a las demás.</li>
      <li><b>Preparación p/ Mesh</b> = promedio de los 4 principios. <b>Etapa</b> = redondeo "half-up" de la nota (1,5→2; 2,5→3; 3,5→4).</li>
      <li><b>Topología recomendada:</b> índice = 0,55×global + 0,45×preparación, <b>limitado por la fundación</b> (gobierno, seguridad, calidad, operaciones, arquitectura): no se federa más allá de lo que la base sostiene.</li>
      <li><b>Criticidad:</b> por nota (Alta &lt;1,8; Media &lt;2,5; Baja en otro caso), elevada un nivel para funciones de riesgo (seguridad, privacidad, gobierno) aún inmaduras.</li>
    </ol>`,
  };

  // ---------------- utils ----------------
  const $ = (s, r = document) => r.querySelector(s);
  const app = () => $("#app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lvlColor = (l) => ["", "var(--lvl1)", "var(--lvl2)", "var(--lvl3)", "var(--lvl4)"][Math.max(1, Math.min(4, Math.round(l || 1)))];
  const fmt = (n) => (n == null ? "-" : (LANG === "en" ? Number(n).toFixed(1) : Number(n).toFixed(1).replace(".", ",")));
  const dstr = (s) => { try { return new Date(s).toLocaleString(LOCALE[LANG] || "pt-BR"); } catch (e) { return s; } };
  const wq = (p) => (p + (p.includes("?") ? "&" : "?") + "lang=" + LANG);  // adiciona ?lang
  const critLabel = (v) => t("crit_" + v);
  const effLabel = (v) => t("eff_" + v);
  const valorLabel = (v) => t("val_" + v);

  // Caixa de detalhes (HTML formatado) usada no hover do Gantt e da matriz.
  function recTipHTML(rec) {
    if (!rec) return "";
    const pre = (rec.prereqs && rec.prereqs.length)
      ? `<div style="margin-top:7px"><b>${esc(t("th_prereq"))}:</b> <u>${rec.prereqs.map(esc).join(", ")}</u></div>` : "";
    return `<div style="font-weight:800;font-size:13px">${esc(rec.code)} · ${esc(rec.function)}</div>
      <div class="faint" style="margin:2px 0 7px">${esc(rec.horizonte)}</div>
      <div>${esc(rec.text)}</div>
      <div style="margin-top:7px;line-height:1.7">
        <b>${esc(t("th_crit"))}:</b> ${esc(critLabel(rec.criticidade))}<br>
        <b>${esc(t("axis_value"))}:</b> ${esc(valorLabel(rec.valor))} (${rec.value10}/10)<br>
        <b>${esc(t("th_complexity"))}:</b> ${esc(effLabel(rec.effort))} (${rec.complexity10}/10)</div>${pre}`;
  }
  function wireRecTips(root, byCode) {
    let tip = document.getElementById("rectip");
    if (!tip) { tip = document.createElement("div"); tip.id = "rectip"; tip.className = "rectip"; tip.hidden = true; document.body.appendChild(tip); }
    const move = (e) => {
      const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
      let x = e.clientX + pad, y = e.clientY + pad;
      if (x + w > innerWidth - 8) x = e.clientX - w - pad;
      if (y + h > innerHeight - 8) y = Math.max(8, e.clientY - h - pad);
      tip.style.left = x + "px"; tip.style.top = y + "px";
    };
    root.querySelectorAll("[data-code]").forEach(el => {
      el.addEventListener("mouseenter", (e) => { const rec = byCode[el.getAttribute("data-code")]; if (!rec) return; tip.innerHTML = recTipHTML(rec); tip.hidden = false; move(e); });
      el.addEventListener("mousemove", move);
      el.addEventListener("mouseleave", () => { tip.hidden = true; });
    });
  }

  // Matriz de priorizacao: uma bolinha por ACAO (top 20 por prioridade), Valor (Y,0-10) x Complexidade (X,0-10).
  function prioMatrixSVG(recs) {
    const items = (recs || []).slice(0, 20);
    const W = 660, H = 480, ml = 60, mb = 54, mt = 22, mr = 20;
    const x0 = ml, x1 = W - mr, y0 = H - mb, y1 = mt;
    // faixas reservadas no topo/base p/ os rotulos dos quadrantes nao serem cobertos pelas bolinhas
    const iTop = y1 + 30, iBot = y0 - 22;
    const sx = (v) => x0 + (Math.max(0, Math.min(10, v)) / 10) * (x1 - x0);
    const sy = (v) => iBot - (Math.max(0, Math.min(10, v)) / 10) * (iBot - iTop);
    const midx = sx(5), midy = (iTop + iBot) / 2;
    const quad = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
    const bg = quad(x0, y1, midx - x0, midy - y1, "#c9efdf")
      + quad(midx, y1, x1 - midx, midy - y1, "#e6f6ee")
      + quad(x0, midy, midx - x0, y0 - midy, "#eef2f4")
      + quad(midx, midy, x1 - midx, y0 - midy, "#f7eaea");
    const grid = [0, 2, 4, 6, 8, 10].map(v =>
      `<text x="${sx(v).toFixed(0)}" y="${y0 + 16}" text-anchor="middle" font-size="9" fill="#b0bcc8">${v}</text>
       <text x="${x0 - 8}" y="${(sy(v) + 3).toFixed(0)}" text-anchor="end" font-size="9" fill="#b0bcc8">${v}</text>`).join("");
    const qlabels = `
      <text x="${(x0 + midx) / 2}" y="${y1 + 14}" text-anchor="middle" font-size="11" font-weight="700" fill="#2e9e6b">${esc(t("quad_quickwin"))}</text>
      <text x="${(midx + x1) / 2}" y="${y1 + 14}" text-anchor="middle" font-size="11" font-weight="700" fill="#4a90d9">${esc(t("quad_strategic"))}</text>
      <text x="${(x0 + midx) / 2}" y="${y0 - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="#8a99a8">${esc(t("quad_fillin"))}</text>
      <text x="${(midx + x1) / 2}" y="${y0 - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="#c98a8a">${esc(t("quad_avoid"))}</text>`;
    const critColor = { Alta: "#e85c4a", Media: "#f5a623", Baixa: "#2e9e6b" };
    // agrupa bolinhas quase coincidentes (mesma celula 0-10 arredondada)
    const clamp10 = (v) => Math.max(0, Math.min(10, v != null ? v : 5));
    const binKey = (r) => Math.round(clamp10(r.complexity10)) + "_" + Math.round(clamp10(r.value10));
    const groups = {};
    items.forEach((r, i) => { const k = binKey(r); (groups[k] = groups[k] || []).push(i); });
    const R = 14, hstep = 9, vstep = 10;   // vstep ~ 30% de uma bolinha (diametro 28)
    const pts = items.map((r, i) => {
      const cx = r.complexity10 != null ? r.complexity10 : 5, cy = r.value10 != null ? r.value10 : 5;
      const grp = groups[binKey(r)], gi = grp.indexOf(i), gsize = grp.length;
      let dx = 0, dy = 0;
      if (gsize > 1) {   // sobrepostas: leque p/ os DOIS lados + empilha ~30% acima -> sempre da p/ ver quem esta atras
        dx = (gi % 2 === 0 ? 1 : -1) * hstep * (Math.floor(gi / 2) + 1);
        dy = (cy > 6 ? 1 : -1) * gi * vstep;   // perto do topo empilha p/ baixo; senao p/ cima
      }
      let px = sx(cx) + dx, py = sy(cy) + dy;
      px = Math.max(x0 + R, Math.min(x1 - R, px));
      py = Math.max(iTop, Math.min(iBot, py));
      const col = critColor[r.criticidade] || "#f5a623";
      const m = String(r.code).match(/^([A-Za-z]+)(\d+)$/);
      const p1 = m ? m[1] : r.code, p2 = m ? m[2] : "";
      return `<g class="pmpt" data-code="${esc(r.code)}">
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${R}" fill="#fff" stroke="${col}" stroke-width="2"/>
        <text text-anchor="middle" font-weight="700" fill="#1b2733">
          <tspan x="${px.toFixed(1)}" y="${(py - 1.5).toFixed(1)}" font-size="8.5">${esc(p1)}</tspan>
          <tspan x="${px.toFixed(1)}" y="${(py + 7.5).toFixed(1)}" font-size="8.5">${esc(p2)}</tspan></text></g>`;
    }).join("");
    const axes = `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="#8a99a8"/>
      <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="#8a99a8"/>
      <text x="${(x0 + x1) / 2}" y="${H - 10}" text-anchor="middle" font-size="12" font-weight="700" fill="#5b6b7b">${esc(t("axis_complexity"))} (0-10)</text>
      <text x="16" y="${(y0 + y1) / 2}" text-anchor="middle" font-size="12" font-weight="700" fill="#5b6b7b" transform="rotate(-90 16 ${(y0 + y1) / 2})">${esc(t("axis_value"))} (0-10)</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:680px" role="img">${bg}${grid}${qlabels}${axes}${pts}</svg>`;
  }

  // Gantt: swimlane por funcao x horizonte, com dependencias. Colapsa horizontes vazios
  // (se nao ha H1, o primeiro horizonte presente comeca em 0m).
  // Gantt deterministico: horizontes como COLUNAS da esquerda p/ direita (H1 | H2 | H3),
  // alinhado a esquerda; cada coluna empilha suas acoes (so o codigo, detalhes no hover);
  // setas = dependencias reais + amarracao base (mesma funcao encadeada por prioridade).
  // Layout fixo (nao depende de auto-layout) -> mesmo padrao em qualquer assessment.
  function ganttSVG(recs) {
    if (!recs || !recs.length) return `<p class="muted small">—</p>`;
    const headerH = 46, padTop = 8, boxW = 120, boxH = 40, vGap = 24;
    const leftPad = 14, rightPad = 14, colW = 170, colGap = 78;
    const present = [...new Set(recs.map(r => r.target_stage))].sort((a, b) => a - b);
    const nCols = present.length;
    const colIdx = (stage) => present.indexOf(stage);
    const colX = (i) => leftPad + i * (colW + colGap);
    const rowY = (k) => headerH + padTop + k * (boxH + vGap);
    const NAME = { 2: "H1 · Fundação", 3: "H2 · Padronização", 4: "H3 · Federação" };
    const WIN = { 2: "0-3m", 3: "3-9m", 4: "9m+" }, WIN0 = { 2: "0-3m", 3: "0-9m", 4: "0m+" };
    const colLabel = (s, first) => (NAME[s] || ("H" + (s - 1))) + " (" + (first ? WIN0[s] : WIN[s]) + ")";
    const critColor = { Alta: "#e85c4a", Media: "#f5a623", Baixa: "#2e9e6b" };
    // posiciona cada acao em (coluna do horizonte, linha = ordem de prioridade dentro do horizonte)
    const rowCount = {}, pos = {}; let maxRows = 0;
    recs.forEach(r => {
      const ci = colIdx(r.target_stage); const ri = (rowCount[ci] = (rowCount[ci] || 0)); rowCount[ci]++;
      if (rowCount[ci] > maxRows) maxRows = rowCount[ci];
      const x = colX(ci) + (colW - boxW) / 2, y = rowY(ri);
      pos[r.code] = { x, y, w: boxW, h: boxH, col: ci, cx: x + boxW / 2, cy: y + boxH / 2 };
    });
    const H = rowY(Math.max(maxRows, 1) - 1) + boxH + 16;
    const W = leftPad + nCols * colW + (nCols - 1) * colGap + rightPad;
    // arestas: prereqs reais + encadeamento intra-funcao pela ordem de prioridade (ordem da tabela)
    const edgeSet = new Set(), depOf = {};
    recs.forEach(r => { depOf[r.code] = (r.prereqs || []).slice(); (r.prereqs || []).forEach(pc => edgeSet.add(pc + ">" + r.code)); });
    const seenFn = {};
    recs.forEach(r => { const k = r.function_key || r.function; const p = seenFn[k]; if (p && !edgeSet.has(p + ">" + r.code)) { depOf[r.code].push(p); edgeSet.add(p + ">" + r.code); } seenFn[k] = r.code; });
    // roteamento ortogonal por canais (cada canal fan-out para nao sobrepor). Caixas ficam por cima -> tracado limpo.
    const chanN = {};
    const arrows = recs.flatMap(r => (depOf[r.code] || []).map(pc => {
      const A = pos[pc], B = pos[r.code]; if (!A || !B) return "";
      let d;
      if (A.col === B.col) {                       // mesmo horizonte: canal a esquerda da coluna
        const key = "S" + A.col; const off = (chanN[key] = (chanN[key] || 0)); chanN[key]++;
        const chx = Math.max(4, colX(A.col) - 12 - off * 7);
        d = `M${A.x},${A.cy} H${chx} V${B.cy} H${B.x}`;
      } else {
        const fwd = B.col > A.col;                 // dependencia normal vai da esquerda p/ direita
        const sx = fwd ? A.x + A.w : A.x, ex = fwd ? B.x : B.x + B.w;
        const key = (fwd ? "R" : "L") + B.col; const off = (chanN[key] = (chanN[key] || 0)); chanN[key]++;
        const chx = fwd ? (colX(B.col) - colGap / 2 + off * 7) : (colX(B.col) + colW + colGap / 2 - off * 7);
        d = `M${sx},${A.cy} H${chx} V${B.cy} H${ex}`;
      }
      return `<path d="${d}" fill="none" stroke="#9aa8b6" stroke-width="1.5" stroke-linejoin="round" marker-end="url(#garw)"/>`;
    })).join("");
    const cols = present.map((s, i) => {
      const x = colX(i);
      return `<rect x="${x}" y="26" width="${colW}" height="${H - 32}" rx="12" fill="#f4f8fd" stroke="#e6edf5"/>
        <text x="${x + colW / 2}" y="42" text-anchor="middle" font-size="12" font-weight="700" fill="#5b6b7b">${esc(colLabel(s, i === 0))}</text>`;
    }).join("");
    const barEls = recs.map(r => {
      const p = pos[r.code], col = critColor[r.criticidade] || "#4a90d9";
      return `<g class="gbar" data-code="${esc(r.code)}" style="cursor:pointer">
        <rect x="${p.x}" y="${p.y}" width="${boxW}" height="${boxH}" rx="9" fill="#fff" stroke="${col}" stroke-width="2"/>
        <text x="${p.cx}" y="${p.cy + 4}" text-anchor="middle" font-size="13" font-weight="700" fill="#1b2733">${esc(r.code)}</text></g>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:${Math.min(W, 900)}px" role="img">
      <defs><marker id="garw" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9aa8b6"/></marker></defs>
      ${cols}${arrows}${barEls}</svg>`;
  }

  // Definicao Mermaid (flowchart LR): SEM subgraphs de horizonte (que quebravam o layout).
  // Cada no traz o horizonte + o codigo (ex.: "H1<br/>GOV01"); a COR DA BORDA diferencia H1/H2/H3.
  // Arestas = dependencias reais + encadeamento intra-funcao pela ordem de prioridade (tabela).
  // Cores das bordas por horizonte: H1 laranja, H2 azul, H3 verde.
  const GANTT_HCOLOR = { 2: "#E39A45", 3: "#5B8FD6", 4: "#57B088" };  // H1 / H2 / H3
  const GANTT_HFILL = { 2: "#FDF3E4", 3: "#EAF1FB", 4: "#EBF6EF" };
  function ganttMermaid(recs) {
    if (!recs || !recs.length) return "";
    const SHORT = { 2: "H1", 3: "H2", 4: "H3" };
    const esc2 = (s) => String(s).replace(/["\n]/g, " ").replace(/[<>]/g, "");
    let s = "flowchart LR\n";
    // caixas arredondadas ("...") - horizonte + codigo em negrito (detalhes no hover)
    recs.forEach(r => { s += `${r.code}("${SHORT[r.target_stage] || ("H" + (r.target_stage - 1))}<br/><b>${esc2(r.code)}</b>")\n`; });
    const edges = new Set();
    const addEdge = (a, b) => { if (a && b && a !== b && !edges.has(a + ">" + b)) { edges.add(a + ">" + b); s += `${a} --> ${b}\n`; } };
    recs.forEach(r => (r.prereqs || []).forEach(pc => addEdge(pc, r.code)));
    const _seenFn = {};
    recs.forEach(r => { const k = r.function_key || r.function; if (_seenFn[k]) addEdge(_seenFn[k], r.code); _seenFn[k] = r.code; });
    s += `classDef h1 stroke:${GANTT_HCOLOR[2]},stroke-width:1.8px,fill:${GANTT_HFILL[2]},color:#1b2733;\n`;
    s += `classDef h2 stroke:${GANTT_HCOLOR[3]},stroke-width:1.8px,fill:${GANTT_HFILL[3]},color:#1b2733;\n`;
    s += `classDef h3 stroke:${GANTT_HCOLOR[4]},stroke-width:1.8px,fill:${GANTT_HFILL[4]},color:#1b2733;\n`;
    const cls = { 2: "h1", 3: "h2", 4: "h3" };
    recs.forEach(r => { if (cls[r.target_stage]) s += `class ${r.code} ${cls[r.target_stage]};\n`; });
    return s;
  }
  // Legenda das cores de horizonte do Gantt (borda).
  function ganttLegendHTML() {
    const items = [[2, "H1 · Fundação (0-3m)"], [3, "H2 · Padronização (3-9m)"], [4, "H3 · Federação (9m+)"]];
    return `<div class="small muted" style="display:flex;gap:16px;flex-wrap:wrap;margin:2px 0 10px">` +
      items.map(([st, lbl]) => `<span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;border:2.5px solid ${GANTT_HCOLOR[st]};vertical-align:middle"></span> ${esc(lbl)}</span>`).join("") + `</div>`;
  }

  async function api(path, opts) {
    const res = await fetch(API + path, { headers: { "Content-Type": "application/json" }, ...opts });
    if (!res.ok) { const x = await res.text().catch(() => ""); throw new Error(`${res.status} ${x}`); }
    return res.json();
  }
  function toast(msg, kind) {
    const el = document.createElement("div"); el.className = "toast" + (kind ? " toast-" + kind : ""); el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), kind === "error" ? 5000 : 3000);
  }
  function loading(txt) {
    app().innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div>${esc(txt || t("loading"))}</div></div>`;
  }
  function areaByKey(k) { return FW.areas.find(a => a.key === k); }
  function fnByKey(k) { return FW.functions.find(f => f.key === k); }
  function dimByKey(k) { return FW.dimensions.find(d => d.key === k); }
  function prByKey(k) { return FW.mesh_principles.find(p => p.key === k); }

  // ---------------- topbar / nav ----------------
  function setNav(active) {
    const links = [["#/", t("nav_datamesh")], ["#/assessments", t("nav_assessments")], ["#/produtos-de-dados", t("nav_dataproducts")], ["#/modelo-operacional", t("nav_opmodel")], ["#/metodologia", t("nav_method")]];
    $("#nav").innerHTML = links.map(([h, txt]) => `<a href="${h}" class="${active === h ? "active" : ""}">${esc(txt)}</a>`).join("");
  }

  // Controles persistentes da barra superior (padrao WAF): voltar ao Atlas,
  // seletor de idioma e alternador de tema. Fiados uma unica vez no boot.
  // Icones (lucide) usados no dropdown de tema.
  const _ICO = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
  };
  const _svg16 = (inner) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const _THEME_LABELS = { pt: { light: "Claro", dark: "Escuro", system: "Sistema" }, en: { light: "Light", dark: "Dark", system: "System" }, es: { light: "Claro", dark: "Oscuro", system: "Sistema" } };
  const _ACTIVE = { pt: "Ativo", en: "Active", es: "Activo" };

  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === "dark" || mode === "light") root.setAttribute("data-theme", mode);
    else root.removeAttribute("data-theme"); // "system": segue o SO via @media
    const TL = _THEME_LABELS[LANG] || _THEME_LABELS.en;
    const AL = _ACTIVE[LANG] || _ACTIVE.en;
    document.querySelectorAll("#themePop [data-theme]").forEach((it) => {
      const k = it.getAttribute("data-theme");
      const lab = it.querySelector(".hmi-label"); if (lab) lab.textContent = TL[k] || k;
      const a = it.querySelector(".hmi-active"); if (a) a.textContent = (k === mode) ? AL : "";
    });
    const btn = document.getElementById("themeBtn");
    if (btn) btn.innerHTML = _svg16(mode === "dark" ? _ICO.moon : mode === "light" ? _ICO.sun : _ICO.monitor);
  }

  function initChrome() {
    const embedded = !!window.__BASE__;
    const back = document.getElementById("atlasBack");
    const sep = document.getElementById("topstripSep");
    if (back) back.hidden = !embedded;
    if (sep) sep.hidden = !embedded;

    // Dropdowns (idioma + tema): abrir/fechar, um por vez, clique-fora e Esc.
    const menus = [];
    const closeAll = (except) => menus.forEach(({ btn, pop }) => {
      if (pop !== except) { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    });
    const wireMenu = (btnId, popId) => {
      const btn = document.getElementById(btnId), pop = document.getElementById(popId);
      if (!btn || !pop) return null;
      menus.push({ btn, pop });
      btn.onclick = (e) => {
        e.stopPropagation();
        const willOpen = pop.hidden;
        closeAll(null);
        pop.hidden = !willOpen;
        btn.setAttribute("aria-expanded", String(willOpen));
      };
      pop.onclick = (e) => e.stopPropagation();
      return { btn, pop };
    };
    const langM = wireMenu("langBtn", "langPop");
    const themeM = wireMenu("themeBtn", "themePop");
    document.addEventListener("click", () => closeAll(null));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(null); });

    // Tema (claro / escuro / sistema)
    let theme = "system";
    try { theme = localStorage.getItem("moma-theme") || "system"; } catch (x) { }
    if (themeM) themeM.pop.querySelectorAll("[data-theme]").forEach((it) => {
      it.onclick = () => {
        theme = it.getAttribute("data-theme");
        try { localStorage.setItem("moma-theme", theme); } catch (x) { }
        applyTheme(theme); closeAll(null);
      };
    });
    applyTheme(theme);

    // Idioma
    const markLang = () => {
      const AL = _ACTIVE[LANG] || _ACTIVE.en;
      document.querySelectorAll("#langPop [data-lang]").forEach((it) => {
        const a = it.querySelector(".hmi-active");
        if (a) a.textContent = it.getAttribute("data-lang") === LANG ? AL : "";
      });
    };
    if (langM) langM.pop.querySelectorAll("[data-lang]").forEach((it) => {
      it.onclick = async () => {
        const next = it.getAttribute("data-lang");
        closeAll(null);
        if (next === LANG) return;
        LANG = next;
        try { localStorage.setItem("lang", LANG); } catch (x) { }
        try { FW = await api(wq("/framework")); } catch (x) { }
        markLang(); applyTheme(theme); router();
      };
    });
    markLang();
  }

  // ---------------- Modal + diagramas (SVG) ----------------
  function openModal(titleHtml, bodyHtml) {
    const bd = document.createElement("div"); bd.className = "modal-backdrop";
    bd.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><button class="x" aria-label="fechar">&times;</button><h2>${titleHtml}</h2>${bodyHtml}</div>`;
    const close = () => { bd.remove(); document.removeEventListener("keydown", onKey); };
    function onKey(e) { if (e.key === "Escape") close(); }
    bd.onclick = (e) => { if (e.target === bd) close(); };
    bd.querySelector(".x").onclick = close;
    document.addEventListener("keydown", onKey);
    document.body.appendChild(bd);
  }
  const _box = (x, y, w, h, label, fill) => {
    const lines = Array.isArray(label) ? label : [label];
    const y0 = y + h / 2 - (lines.length - 1) * 7;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${fill || "#fff"}" stroke="#cfd6df" stroke-width="1.5"/>`
      + lines.map((ln, i) => `<text x="${x + w / 2}" y="${(y0 + i * 14).toFixed(1)}" font-size="11.5" fill="#1b2733" text-anchor="middle" dominant-baseline="middle">${esc(ln)}</text>`).join("");
  };
  const _lbl = (x, y, txt, c) => `<text x="${x}" y="${y}" font-size="11" fill="${c || "#5b6b7b"}" text-anchor="middle" font-weight="600">${esc(txt)}</text>`;
  const _line = (x1, y1, x2, y2, dash, c) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c || "#8a99a8"}" stroke-width="1.5" ${dash ? `stroke-dasharray="5 4"` : ""}/>`;
  const _arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8a99a8" stroke-width="1.5" marker-end="url(#arw)"/>`;
  const _svg = (inner) => `<svg class="diagram" viewBox="0 0 500 250"><defs><marker id="arw" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8a99a8"/></marker><filter id="sh" x="-20%" y="-20%" width="140%" height="170%"><feDropShadow dx="0" dy="1.5" stdDeviation="2.2" flood-color="#1b2733" flood-opacity="0.12"/></filter></defs>${inner}</svg>`;
  // card bonito: titulo em negrito + subtitulo menor/cinza, com sombra suave
  const _card = (x, y, w, h, title, subtitle, fill, accent) => {
    const cx = x + w / 2;
    const ty = subtitle ? y + h / 2 - 7 : y + h / 2;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill || "#fff"}" stroke="${accent || "#d3dae3"}" stroke-width="1.5" filter="url(#sh)"/>`;
    s += `<text x="${cx}" y="${ty}" font-size="13" font-weight="700" fill="#1b2733" text-anchor="middle" dominant-baseline="middle">${esc(title)}</text>`;
    if (subtitle) s += `<text x="${cx}" y="${y + h / 2 + 10}" font-size="10" fill="#7a8a99" text-anchor="middle" dominant-baseline="middle">${esc(subtitle)}</text>`;
    return s;
  };
  const L = (k) => t(k);

  function topoDiagram(key) {
    const NEU = "#c9d3df";
    if (key === "fundacao") return _svg(
      _card(14, 96, 110, 60, L("dg_sources"), "ERP · CRM · App", "#f7f9fb", NEU) + _arrow(126, 126, 150, 126)
      + _card(152, 72, 196, 104, L("dg_platform"), "UC + Lakehouse", "#eaf2fb", "#2272b4") + _arrow(350, 126, 374, 126)
      + _card(376, 98, 110, 56, L("dg_consumption"), null, "#eaf6ef", "#2e9e6b"));
    if (key === "governado") return _svg(
      `<rect x="50" y="40" width="400" height="176" rx="12" fill="#eef4fb" stroke="#c9d8ea" stroke-width="1.5"/>`
      + _lbl(250, 62, L("dg_platform") + " · 1 metastore UC", "#14568c")
      + _card(74, 86, 110, 104, L("dom_sales"), L("dg_catalog"), "#fff", NEU)
      + _card(195, 86, 110, 104, L("dom_credit"), L("dg_catalog"), "#fff", NEU)
      + _card(316, 86, 110, 104, L("dom_logistics"), L("dg_catalog"), "#fff", NEU));
    if (key === "harmonizado") return _svg(
      _line(250, 108, 250, 66) + _line(200, 152, 138, 188) + _line(300, 152, 362, 188)
      + _card(198, 12, 108, 56, L("dom_sales"), L("dg_ws"), "#fff", NEU)
      + _card(16, 186, 124, 56, L("dom_credit"), L("dg_ws"), "#fff", NEU)
      + _card(360, 186, 124, 56, L("dom_logistics"), L("dg_ws"), "#fff", NEU)
      + _card(182, 100, 136, 58, "Hub", L("dg_hub_role"), "#fef3e0", "#f5a623")
      + _line(140, 216, 360, 216, true, "#2272b4") + _lbl(250, 233, L("dg_sharing"), "#2272b4"));
    // federado
    const fd = ["dom_customers", "dom_payments", "dom_marketing", "dom_logistics"];
    return _svg(
      _card(26, 12, 448, 36, L("dg_fedgov"), null, "#eaf6ef", "#2e9e6b")
      + [78, 198, 318, 438].map(x => _line(x, 48, x, 106, true, "#8a99a8")).join("")
      + [26, 146, 266, 386].map((x, i) => _card(x, 106, 104, 66, L(fd[i]), L("dg_ws_own"), "#fff", NEU)).join("")
      + _line(78, 196, 438, 196, true, "#2272b4") + _lbl(250, 213, L("dg_sharing") + " / Marketplace", "#2272b4"));
  }

  function principleDiagram(key) {
    const NEU = "#c9d3df", GRN = "#2e9e6b";
    if (key === "domain_ownership") {
      const wrap2 = (s) => { const ws = String(s).split(" "); let a = "", b = ""; ws.forEach(x => { if (!b && (a + " " + x).trim().length <= 22) a = (a ? a + " " : "") + x; else b = (b ? b + " " : "") + x; }); return [a, b]; };
      const rbox = (x, y, w, h, title, desc, fill, stroke) => {
        const [l1, l2] = wrap2(desc), cx = x + w / 2;
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>`
          + `<text x="${cx}" y="${y + 18}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1b2733">${esc(title)}</text>`
          + `<text x="${cx}" y="${y + 33}" text-anchor="middle" font-size="8.5" fill="#5b6b7b">${esc(l1)}</text>`
          + (l2 ? `<text x="${cx}" y="${y + 44}" text-anchor="middle" font-size="8.5" fill="#5b6b7b">${esc(l2)}</text>` : "");
      };
      return _svg(["dom_sales", "dom_credit", "dom_logistics"].map((k, i) => {
        const x = 16 + i * 160;
        return `<rect x="${x}" y="24" width="150" height="166" rx="10" fill="#f7f9fb" stroke="#7c9bd0" stroke-width="1.5"/>`
          + `<text x="${x + 75}" y="44" text-anchor="middle" font-size="12.5" font-weight="700" fill="#1b2733">${esc(L(k))}</text>`
          + rbox(x + 10, 56, 130, 54, L("dg_owner_role"), L("dg_owner_desc"), "#eaf2fb", "#2272b4")
          + rbox(x + 10, 118, 130, 54, L("dg_steward_role"), L("dg_steward_desc"), "#eaf6ef", GRN);
      }).join(""));
    }
    if (key === "data_as_product") return _svg(
      // Entradas (2 produtos, dominios distintos) -> produto central -> 2 consumidores (dominios distintos)
      _arrow(132, 52, 191, 82) + _arrow(132, 128, 191, 100)
      + _arrow(309, 90, 368, 52) + _arrow(309, 90, 368, 128)
      + _card(14, 28, 118, 48, L("prod_transactions"), L("dom_payments"), "#eaf6ef", GRN)
      + _card(14, 104, 118, 48, L("prod_customer360"), L("dom_customers"), "#eaf6ef", GRN)
      + _card(191, 66, 118, 48, L("prod_creditscore"), L("dom_credit"), "#eaf2fb", "#2272b4")
      + _card(368, 28, 118, 48, L("prod_offers"), L("dom_marketing"), "#fff", NEU)
      + _card(368, 104, 118, 48, L("prod_billing"), L("dom_finance"), "#fff", NEU)
      + _lbl(250, 170, L("dg_product_flow"), "#2272b4")
      + _lbl(250, 190, L("dg_product_has"), "#5b6b7b")
      + _card(24, 200, 104, 38, L("dg_owner"), null, "#fff", NEU)
      + _card(148, 200, 104, 38, L("dg_contract"), null, "#fff", NEU)
      + _card(272, 200, 104, 38, L("dg_sla"), null, "#fff", NEU)
      + _card(396, 200, 80, 38, L("dg_quality"), null, "#fff", NEU));
    if (key === "self_serve") return _svg(
      [110, 255, 400].map(x => _arrow(x, 176, x, 116)).join("")
      + ["dom_marketing", "dom_sales", "dom_credit"].map((k, i) => _card(50 + i * 145, 40, 120, 74, L(k), L("dg_ws"), "#fff", NEU)).join("")
      + _card(30, 180, 440, 46, L("dg_selfserve"), null, "#eaf2fb", "#2272b4"));
    // federated_governance: politicas globais (com exemplos) aplicadas automaticamente aos dominios
    const pols = ["pol_pii", "pol_abac", "pol_tags", "pol_quality"];
    return _svg(
      _card(120, 8, 260, 34, L("dg_policies"), null, "#fef3e0", "#f5a623")
      + pols.map((k, i) => _box(8 + i * 123, 54, 116, 34, L(k), "#fff9ef")).join("")
      + [100, 250, 400].map(x => _arrow(250, 92, x, 158)).join("")
      + ["dom_customers", "dom_payments", "dom_marketing"].map((k, i) => _card(40 + i * 150, 158, 120, 60, L(k), null, "#fff", NEU)).join(""));
  }

  // Diagrama "Domínios e produtos de dados na prática" (visao rica, estilo pratico)
  function dataProductsPracticeDiagram() {
    const BL = "#2272b4", OR = "#f5a623", GRN = "#2e9e6b";
    const b = (x, y, w, h, label, stroke, fill, fs) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill || "#fff"}" stroke="${stroke}" stroke-width="1.4"/>`
      + `<text x="${x + w / 2}" y="${y + h / 2}" font-size="${fs || 11}" fill="#1b2733" text-anchor="middle" dominant-baseline="middle">${esc(label)}</text>`;
    const ln = (x1, y1, x2, y2) => `<path d="M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}" fill="none" stroke="#9aa8b6" stroke-width="1"/>`;
    const dbox = (x, y, w, h, label) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" stroke="${GRN}" stroke-width="1.4" stroke-dasharray="5 4"/>`
      + `<text x="${x + 10}" y="${y + 15}" font-size="11" font-style="italic" font-weight="600" fill="${GRN}">${esc(label)}</text>`;
    const dom = (k) => L("dg_domain") + " " + L(k);
    const ssWords = L("selfserve_layer").split(" ");
    const ssTxt = ssWords.map((w, i) => `<text x="784" y="${142 - (ssWords.length - 1) * 7 + i * 14}" font-size="11" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">${esc(w)}</text>`).join("");
    return `<svg class="diagram" viewBox="0 0 830 362">
      <defs>
        <marker id="oR" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="${OR}"/></marker>
        <marker id="oL" markerWidth="9" markerHeight="9" refX="1" refY="4" orient="auto"><path d="M8,0 L0,4 L8,8 z" fill="${OR}"/></marker>
      </defs>
      <text x="95" y="28" font-size="12" font-weight="700" fill="#5b6b7b" text-anchor="middle">${esc(L("dp_src"))}</text>
      <text x="450" y="28" font-size="12" font-weight="700" fill="#5b6b7b" text-anchor="middle">${esc(L("dp_prod"))}</text>
      <line x1="192" y1="38" x2="192" y2="298" stroke="#d3dae3" stroke-width="1"/>
      ${b(14, 46, 162, 28, L("prod_transactions"), BL)}
      ${b(14, 82, 162, 28, L("src_registration"), BL)}
      ${b(14, 118, 162, 28, L("src_clickstream"), BL)}
      ${b(14, 154, 162, 28, L("src_orders"), BL)}
      ${b(14, 190, 162, 28, L("src_support"), BL)}
      ${b(14, 226, 162, 28, L("src_partners"), BL)}
      ${ln(176, 60, 228, 79)}${ln(176, 96, 228, 79)}${ln(176, 132, 228, 113)}
      ${ln(176, 168, 228, 189)}${ln(176, 204, 228, 223)}${ln(176, 240, 228, 223)}
      ${ln(424, 79, 484, 84)}${ln(424, 113, 484, 144)}${ln(424, 189, 484, 204)}${ln(424, 79, 484, 204)}
      ${dbox(214, 40, 224, 94, dom("dom_customers"))}
      ${b(228, 66, 196, 26, L("prod_customer360"), OR)}
      ${b(228, 100, 196, 26, L("prod_segments"), OR)}
      ${dbox(214, 150, 224, 94, dom("dom_credit"))}
      ${b(228, 176, 196, 26, L("prod_creditscore"), OR)}
      ${b(228, 210, 196, 26, L("prod_creditprop"), OR)}
      ${dbox(470, 40, 228, 204, dom("dom_marketing"))}
      ${b(484, 70, 200, 28, L("prod_reco"), OR)}
      ${b(484, 130, 200, 28, L("prod_offers"), OR)}
      ${b(484, 190, 200, 28, L("prod_nba"), OR)}
      <polygon points="704,104 726,104 740,142 726,180 704,180 718,142" fill="#dfe6ee"/>
      <rect x="742" y="110" width="84" height="64" rx="8" fill="${GRN}"/>${ssTxt}
      <line x1="20" y1="308" x2="700" y2="308" stroke="${OR}" stroke-width="2" marker-start="url(#oL)" marker-end="url(#oR)"/>
      ${b(210, 296, 300, 24, L("band_gov"), "#cfd6df", "#fff", 10)}
      <line x1="20" y1="346" x2="700" y2="346" stroke="${OR}" stroke-width="2" marker-start="url(#oL)" marker-end="url(#oR)"/>
      ${b(210, 334, 300, 24, L("band_obs"), "#cfd6df", "#fff", 10)}
    </svg>`;
  }

  // Tabela de/para: requisitos de plataforma self-service -> recursos Databricks
  function sspTable() {
    const rows = (t("sspr") || []).map(r => `<tr><td>${esc(r[0])}</td><td class="dbx">${esc(r[1])}</td></tr>`).join("");
    return `<p class="muted small" style="margin:14px 0 6px">${esc(t("ss_req_sub"))}</p>
      <div class="sspr-wrap"><table class="sspr">
        <thead><tr><th>${esc(t("ss_req_title"))}</th><th>${esc(t("ss_dbx_title"))}</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  }

  function topoModalBody(tp) {
    const sub = (lbl, val) => `<div class="subrow"><span class="lbl">${esc(lbl)}</span><span class="val">${esc(val)}</span></div>`;
    const delta = (tp.delta && tp.delta.length)
      ? `<h4 style="margin:14px 0 4px">${esc(t("delta_title"))}</h4>
         <ul class="small" style="padding-left:16px;line-height:1.6">${tp.delta.map(d => `<li>${esc(d)}</li>`).join("")}</ul>`
      : "";
    const det = (t("scen") || {})[tp.key];
    const detail = (det && det.length)
      ? `<h4 style="margin:16px 0 4px">${esc(t("see_details"))}</h4>
         <ul class="small muted" style="padding-left:16px;line-height:1.6">${det.map(d => `<li>${esc(d)}</li>`).join("")}</ul>`
      : "";
    return `<p class="muted">${esc(tp.tagline)}</p>${topoDiagram(tp.key)}
      <p>${esc(tp.description)}</p>
      ${delta}
      ${sub(t("kv_central_control"), tp.central_control)}${sub(t("kv_autonomy"), tp.autonomy)}
      ${sub(t("kv_workspaces"), tp.workspaces)}${sub(t("kv_governance"), tp.governance)}${sub(t("kv_sharing"), tp.sharing)}
      <h4 style="margin:14px 0 4px">${esc(t("how_databricks"))}</h4>
      <ul class="small muted" style="padding-left:16px">${tp.databricks_setup.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
      ${detail}`;
  }

  // ---------------- HOME ----------------
  function renderHome() {
    setNav("#/");
    const km = FW.key_messages.map((m, i) => `
      <div class="card key-message"><div class="km-num">${i + 1}</div><h3>${esc(m.title)}</h3>
        <p class="muted small">${esc(m.text)}</p>
        ${m.bullets ? `<ul class="small">${m.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
      </div>`).join("");
    const principles = FW.mesh_principles.map((p, i) => `
      <div class="card tight"><div class="chip gray">${esc(t("principle"))} ${i + 1}</div>
        <h3 style="margin-top:8px">${esc(p.name)}</h3><p class="muted small">${esc(p.description)}</p>
        <button class="btn ghost small" data-principle="${p.key}">${esc(t("see_example"))} &rarr;</button></div>`).join("");
    const scale = FW.maturity_levels.map(l => `
      <div class="step" style="background:${["", "var(--lvl1-bg)", "var(--lvl2-bg)", "var(--lvl3-bg)", "var(--lvl4-bg)"][l.level]}">
        <h4><span class="num" style="background:${lvlColor(l.level)}">${l.level}</span>${esc(l.name)}</h4>
        <p class="muted small" style="margin:0">${esc(l.description)}</p></div>`).join("");
    const spectrum = FW.topologies.map(tp => `
      <div class="topo"><div class="pos">${esc(t("etapa"))} ${tp.position}</div><h4>${esc(tp.name)}</h4>
        <p class="muted small">${esc(tp.tagline)}</p>
        <div class="subrow"><span class="lbl">${esc(t("kv_control"))}</span><span class="val">${esc(tp.central_control)}</span></div>
        <div class="subrow"><span class="lbl">${esc(t("kv_autonomy"))}</span><span class="val">${esc(tp.autonomy)}</span></div>
        <div class="subrow"><span class="lbl">${esc(t("kv_workspaces"))}</span><span class="val">${esc(tp.workspaces)}</span></div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;align-items:flex-start">
          <button class="btn ghost small" data-topo="${tp.key}">${esc(t("see_example"))} &rarr;</button>
          <a class="btn ghost small" href="#/modelo-operacional/etapa/${tp.key}">${esc(t("om_open_full"))} &rarr;</a>
        </div></div>`).join("");
    const concept = (FW.references.concept || []).map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)}</a> <span class="muted small">- ${esc(r.note)}</span></li>`).join("");
    const refs = FW.references.internal.map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)}</a> <span class="muted small">- ${esc(r.note)}</span></li>`).join("");

    app().innerHTML = `
    <div class="container narrow">
      <div class="hero"><span class="pill">${esc(t("home_pill"))}</span>
        <h1>${esc(t("home_title"))}</h1><p class="lead">${esc(t("home_lead"))}</p>
        <div class="btn-row"><a class="btn primary lg" href="#/assessments">${esc(t("start_assessment"))}</a></div>
      </div>
    </div>
    <div class="container">
      <h2>${esc(t("h_what"))}</h2><div class="grid grid-2">${km}</div>
      <hr class="sep"><h2>${esc(t("h_principles"))}</h2><p class="muted">${esc(t("principles_sub"))}</p><div class="grid grid-4">${principles}</div>
      <hr class="sep"><h2>${esc(t("h_scale"))}</h2><p class="muted">${esc(t("scale_sub"))}</p><div class="scale">${scale}</div>
      <hr class="sep" id="edu-topologias"><h2>${esc(t("h_spectrum"))}</h2><p class="muted">${esc(t("spectrum_sub"))}</p>
      <div class="axis-labels"><span>${esc(t("axis_more_central"))}</span><span>${esc(t("axis_more_fed"))}</span></div>
      <div class="spectrum-track"></div><div class="spectrum">${spectrum}</div>
      <hr class="sep">
      <div class="grid ${FW.references.internal.length ? "grid-2" : ""}">
        <div class="card"><h3>${esc(t("concept_title"))}</h3><p class="muted small" style="margin:0 0 6px">${esc(t("concept_sub"))}</p>
          <ul class="muted small" style="margin:0;padding-left:18px;line-height:1.8">${concept}</ul></div>
        ${FW.references.internal.length ? `<div class="card"><h3>${esc(t("sa_resources"))}</h3><ul class="muted small" style="margin:0;padding-left:18px;line-height:1.8">${refs}</ul></div>` : ""}
      </div>
      <div class="center" style="margin-top:24px"><a class="btn primary lg" href="#/assessments">${esc(t("start_assessment"))}</a></div>
    </div>`;

    app().querySelectorAll("[data-principle]").forEach(b => b.onclick = () => {
      const p = prByKey(b.getAttribute("data-principle"));
      const diagram = p.key === "data_as_product" ? dataProductsPracticeDiagram() : principleDiagram(p.key);
      let extra = p.key === "self_serve" ? sspTable() : "";
      if (p.key === "data_as_product")
        extra = `<p style="margin:14px 0 0"><a class="btn ghost small" href="#/produtos-de-dados" onclick="document.querySelector('.modal-backdrop')&&document.querySelector('.modal-backdrop').remove()">${esc(t("dp_more_link"))} &rarr;</a></p>`;
      openModal(esc(p.name), `<p class="muted">${esc(p.description)}</p>${diagram}${extra}`);
    });
    app().querySelectorAll("[data-topo]").forEach(b => b.onclick = () => {
      const tp = FW.topologies.find(x => x.key === b.getAttribute("data-topo"));
      openModal(esc(tp.name), topoModalBody(tp));
    });
  }

  // ---------------- METODOLOGIA ----------------
  function renderMethod() {
    setNav("#/metodologia");
    const nmList = (arr, lookup, primary) => {
      const items = (arr && arr.length ? arr : [primary]).map(k => { const o = lookup(k); return esc(o ? o.name : k); });
      return `<ul style="margin:0;padding-left:15px">${items.map(x => `<li>${x}</li>`).join("")}</ul>`;
    };
    const mdByKey = (k) => (FW.maturity_dimensions || []).find(d => d.key === k);
    // Ordena por area (ordem do assessment) mantendo a ordem das perguntas dentro da area.
    const areaOrder = {}; (FW.areas || []).forEach((a, i) => areaOrder[a.key] = i);
    const orderedQs = FW.questions.map((q, i) => [q, i]).sort((a, b) =>
      ((areaOrder[a[0].area] ?? 99) - (areaOrder[b[0].area] ?? 99)) || (a[1] - b[1])).map(x => x[0]);
    const rows = orderedQs.map(q => {
      const area = areaByKey(q.area);
      const prins = q.mesh_principles && q.mesh_principles.length ? q.mesh_principles : [];
      const md = mdByKey(q.maturity_dimension);
      return `<tr>
        <td class="small"><b>${esc(area ? area.name : q.area)}</b></td>
        <td class="small">${esc(q.text)}</td>
        <td class="small">${nmList(q.dimensions, dimByKey, q.dimension)}</td>
        <td class="small">${nmList(q.functions, fnByKey, q.function)}</td>
        <td class="small">${md ? esc(md.name) : "-"}</td>
        <td class="small">${prins.length ? `<ul style="margin:0;padding-left:15px">${prins.map(k => { const o = prByKey(k); return `<li>${esc(o ? o.name : k)}</li>`; }).join("")}</ul>` : "-"}</td>
      </tr>`;
    }).join("");
    app().innerHTML = `
    <div class="container">
      <span class="pill">${esc(t("nav_method"))}</span>
      <h1>${esc(t("method_title"))}</h1><p class="lead">${esc(t("method_sub"))}</p>
      <div class="card"><h2>${esc(t("method_rules_title"))}</h2>${METHOD_RULES[LANG] || METHOD_RULES.pt}</div>
      <div class="card"><h2>${esc(t("method_table_title"))}</h2>
        <p class="muted small">${esc(t("method_primary_hint"))}</p>
        <div class="table-wrap"><table>
          <thead><tr><th>${esc(t("th_area"))}</th><th>${esc(t("th_question"))}</th><th>${esc(t("th_dims"))}</th><th>${esc(t("th_fns"))}</th><th>${esc(t("th_opdim"))}</th><th>${esc(t("th_principle"))}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>
    </div>`;
  }

  // ---------------- ASSESSMENTS ----------------
  let SHOW_HIDDEN = false;
  async function exportAssessment(id, name) {
    const data = await api(`/assessments/${id}/export`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url; el.download = `${(name || "assessment").replace(/[^\w.-]+/g, "_")}.json`;
    document.body.appendChild(el); el.click(); el.remove(); URL.revokeObjectURL(url);
  }

  async function renderAssessments() {
    setNav("#/assessments");
    loading();
    let list = [], archived = [];
    try { list = await api("/assessments"); } catch (e) { }
    try { archived = await api("/assessments?scope=archived"); } catch (e) { }
    const hiddenCount = list.filter(a => a.hidden).length;
    const visible = list.filter(a => SHOW_HIDDEN || !a.hidden);

    const rowFor = (a) => `
      <tr style="${a.hidden ? "opacity:.55" : ""}">
        <td><b>${esc(a.client_name || t("noname"))}</b> ${a.hidden ? `<span class="chip gray" style="font-size:11px">${esc(t("hidden_badge"))}</span>` : ""}<br><span class="faint small">${esc(a.id)}</span></td>
        <td class="muted small">${dstr(a.created_at)}</td>
        <td style="white-space:nowrap">
          <a class="btn ghost small" href="#/a/${a.id}">${esc(t("open_panel"))}</a>
          <a class="btn ghost small" href="#/report/${a.id}">${esc(t("report"))}</a>
          <button class="btn ghost small" data-exp="${a.id}" data-name="${esc(a.client_name || "")}">${esc(t("act_export"))}</button>
          <button class="btn ghost small" data-hide="${a.id}" data-h="${a.hidden ? 0 : 1}">${a.hidden ? esc(t("act_show")) : esc(t("act_hide"))}</button>
          <button class="btn ghost small" data-arch="${a.id}">${esc(t("act_archive"))}</button>
        </td></tr>`;
    const rows = visible.length ? visible.map(rowFor).join("")
      : `<tr><td colspan="3" class="muted center" style="padding:24px">${esc(t("none_yet"))}</td></tr>`;

    const archRows = archived.length ? archived.map(a => `
      <tr><td><b>${esc(a.client_name || t("noname"))}</b><br><span class="faint small">${esc(a.id)}</span></td>
        <td class="muted small">${dstr(a.created_at)}</td>
        <td style="white-space:nowrap"><button class="btn ghost small" data-restore="${a.id}">${esc(t("act_restore"))}</button>
        <button class="btn ghost small" data-purge="${a.id}" style="color:var(--primary-ink)">${esc(t("act_purge"))}</button></td></tr>`).join("")
      : `<tr><td colspan="3" class="muted center" style="padding:16px">${esc(t("archived_none"))}</td></tr>`;

    app().innerHTML = `
    <div class="container"><h1>${esc(t("assessments"))}</h1>
      <div class="card"><h3>${esc(t("new_assessment"))}</h3><p class="muted small">${esc(t("new_sub"))}</p>
        <label class="field">${esc(t("client_name"))}</label>
        <div class="btn-row"><input type="text" id="clientName" placeholder="${esc(t("client_ph"))}" style="max-width:420px">
        <button class="btn primary" id="createBtn">${esc(t("create"))}</button>
        <button class="btn" id="importBtn">${esc(t("import_btn"))}</button>
        <input type="file" id="importFile" accept="application/json,.json" style="display:none"></div></div>
      <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <h3 style="margin:0">${esc(t("existing"))}</h3>
        ${hiddenCount ? `<label class="small muted" style="cursor:pointer"><input type="checkbox" id="showHidden" ${SHOW_HIDDEN ? "checked" : ""}> ${esc(t("show_hidden"))} (${hiddenCount})</label>` : ""}
        </div>
        <div class="table-wrap"><table>
        <thead><tr><th>${esc(t("th_client"))}</th><th>${esc(t("th_created"))}</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>
      <details class="card" ${archived.length ? "" : ""}><summary style="cursor:pointer;font-weight:650">${esc(t("history"))} (${archived.length})</summary>
        <div class="table-wrap" style="margin-top:10px"><table>
        <thead><tr><th>${esc(t("th_client"))}</th><th>${esc(t("th_created"))}</th><th></th></tr></thead>
        <tbody>${archRows}</tbody></table></div></details>
    </div>`;

    $("#createBtn").onclick = async () => {
      const name = $("#clientName").value.trim(); $("#createBtn").disabled = true;
      try { const a = await api("/assessments", { method: "POST", body: JSON.stringify({ client_name: name }) }); location.hash = `#/a/${a.id}`; }
      catch (e) { toast(t("create_err") + e.message); $("#createBtn").disabled = false; }
    };
    $("#importBtn").onclick = () => $("#importFile").click();
    $("#importFile").onchange = async (e) => {
      const f = e.target.files[0];
      e.target.value = "";  // permite reimportar o mesmo arquivo (senao onchange nao dispara)
      if (!f) return;
      const btn = $("#importBtn"); const orig = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = t("importing"); }
      try {
        let json;
        try { json = JSON.parse(await f.text()); }
        catch (pe) { throw new Error(t("import_invalid_json")); }
        const res = await api("/assessments/import", { method: "POST", body: JSON.stringify(json) });
        const n = res.imported_responses || 0;
        toast(t("imported_ok") + (n ? ` (${n} ${t("responses_word")})` : ` (0 ${t("responses_word")})`), "ok");
        await renderAssessments();  // atualiza a lista: o assessment importado aparece no topo
      } catch (err) {
        toast(t("import_err") + err.message, "error");
        if (btn) { btn.disabled = false; btn.textContent = orig; }
      }
    };
    const sh = $("#showHidden"); if (sh) sh.onchange = () => { SHOW_HIDDEN = sh.checked; renderAssessments(); };
    // executa uma acao com feedback imediato (spinner) e recarrega a lista
    const act = async (doIt, okMsg) => { loading(); try { await doIt(); if (okMsg) toast(okMsg); } catch (e) { toast(e.message); } renderAssessments(); };
    app().querySelectorAll("[data-exp]").forEach(b => b.onclick = () => { toast("..."); exportAssessment(b.getAttribute("data-exp"), b.getAttribute("data-name")).catch(err => toast(err.message)); });
    app().querySelectorAll("[data-hide]").forEach(b => b.onclick = () =>
      act(() => api(`/assessments/${b.getAttribute("data-hide")}/hidden`, { method: "POST", body: JSON.stringify({ hidden: b.getAttribute("data-h") === "1" }) })));
    app().querySelectorAll("[data-arch]").forEach(b => b.onclick = () => {
      if (!confirm(t("confirm_archive"))) return;
      act(() => api(`/assessments/${b.getAttribute("data-arch")}`, { method: "DELETE" }), t("archived_ok"));
    });
    app().querySelectorAll("[data-restore]").forEach(b => b.onclick = () =>
      act(() => api(`/assessments/${b.getAttribute("data-restore")}/restore`, { method: "POST" }), t("restored_ok")));
    app().querySelectorAll("[data-purge]").forEach(b => b.onclick = () => {
      if (!confirm(t("confirm_purge"))) return;
      act(() => api(`/assessments/${b.getAttribute("data-purge")}/purge`, { method: "DELETE" }), t("purged_ok"));
    });
  }

  // ---------------- PAINEL ----------------
  async function renderPanel(id) {
    setNav("#/assessments"); loading();
    let a; try { a = await api(`/assessments/${id}`); } catch (e) { return notFound(); }
    const base = location.origin + location.pathname;
    const totalAnswered = Object.values(a.progress).reduce((s, p) => s + p.answered, 0);
    const totalQ = Object.values(a.progress).reduce((s, p) => s + p.total, 0);
    const areaCards = FW.areas.map(area => {
      const p = a.progress[area.key]; const pct = p.total ? Math.round(100 * p.answered / p.total) : 0;
      const link = `${base}#/r/${id}/${area.key}`;
      return `<div class="card tight">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
          <div><h3 style="margin:0">${esc(area.name)}</h3>
          <span class="faint small">${p.respondents} ${esc(t("respondents"))} - ${p.answered}/${p.total} ${esc(t("questoes"))}</span></div>
          <span class="badge ${pct === 100 ? "crit-Baixa" : pct > 0 ? "crit-Media" : "chip gray"}">${pct}%</span></div>
        <div class="progress-track" style="margin:10px 0"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="btn-row"><a class="btn small" href="#/r/${id}/${area.key}">${esc(t("answer"))}</a>
        <button class="btn ghost small" data-copy="${esc(link)}">${esc(t("copy_area_link"))}</button></div></div>`;
    }).join("");
    app().innerHTML = `
    <div class="container">
      <div style="display:flex;justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap">
        <div><a class="muted small" href="#/assessments">&larr; ${esc(t("assessments"))}</a>
        <h1 style="margin:.2em 0 0">${esc(a.client_name || t("noname"))}</h1>
        <span class="faint small">${totalAnswered}/${totalQ} ${esc(t("total_responses"))}</span></div>
        <div class="btn-row"><a class="btn" href="#/respostas/${id}">${esc(t("view_responses"))}</a>
        <a class="btn" href="#/modelo-operacional/${id}">${esc(t("om_edit_local"))}</a>
        <a class="btn primary" href="#/report/${id}">${esc(t("generate_report"))}</a></div></div>
      <div class="card" style="margin-top:16px"><h3>${esc(t("general_link"))}</h3><p class="muted small">${esc(t("general_link_sub"))}</p>
        <div class="link-copy">${esc(base)}#/r/${id}</div>
        <div class="btn-row" style="margin-top:10px"><button class="btn small" data-copy="${esc(base)}#/r/${id}">${esc(t("copy_general"))}</button></div></div>
      <div class="callout" style="margin-top:4px">${t("coverage_callout")}</div>
      <h2 style="margin-top:8px">${esc(t("progress_by_area"))}</h2><div class="grid grid-3">${areaCards}</div>
    </div>`;
    app().querySelectorAll("[data-copy]").forEach(b => b.onclick = () => navigator.clipboard.writeText(b.getAttribute("data-copy")).then(() => toast(t("copied"))));
  }

  // ---------------- VER RESPOSTAS ----------------
  async function renderResponses(id) {
    setNav("#/assessments"); loading(t("loading_resp"));
    let a, detail;
    try { a = await api(`/assessments/${id}`); detail = await api(`/assessments/${id}/responses/detail`); } catch (e) { return notFound(); }
    const areasHtml = FW.areas.map(area => {
      const block = detail.by_area[area.key];
      if (!block || !Object.keys(block.respondents).length)
        return `<div class="card tight"><h3 style="margin:0">${esc(area.name)}</h3><p class="faint small" style="margin:6px 0 0">${esc(t("no_responses"))}</p></div>`;
      const people = Object.entries(block.respondents).map(([name, answers]) => {
        const rows = answers.map(x => {
          const q = FW.questions.find(qq => qq.id === x.question_id);
          const qtext = q ? q.text : x.question_text;
          const fn = q ? fnByKey(q.function) : null; const dim = q ? dimByKey(q.dimension) : null;
          const optTxt = (q && x.level != null) ? (q.options.find(o => o.level === x.level) || {}).text : x.option_text;
          return `<tr><td class="small">${esc(qtext)}<br><span class="faint" style="font-size:11px">${esc(fn ? fn.name : x.function)} - ${esc(dim ? dim.name : x.dimension)}</span></td>
            <td style="white-space:nowrap">${x.level != null ? `<span class="lvl-badge lvl-${x.level}">${x.level}</span>` : `<span class="chip gray">N/A</span>`}</td>
            <td class="small">${esc(x.level != null ? optTxt : t("na_option"))}</td></tr>`;
        }).join("");
        return `<details style="margin-bottom:8px" open><summary style="cursor:pointer;font-weight:650;padding:6px 0">${esc(name)} <span class="faint small">(${answers.length} ${esc(t("responses_count"))})</span></summary>
          <div class="table-wrap"><table><thead><tr><th>${esc(t("th_question"))}</th><th>${esc(t("th_level"))}</th><th>${esc(t("th_answer"))}</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
      }).join("");
      return `<div class="card"><h3 style="margin:0 0 8px">${esc(area.name)}</h3>${people}</div>`;
    }).join("");
    app().innerHTML = `<div class="container"><a class="muted small" href="#/a/${id}">&larr; ${esc(t("nav_datamesh"))}</a>
      <div style="display:flex;justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap">
        <h1 style="margin:.2em 0 0">${esc(t("responses_title"))} - ${esc(a.client_name || "")}</h1>
        <a class="btn primary" href="#/report/${id}">${esc(t("generate_report"))}</a></div>
      <p class="muted small">${esc(t("responses_sub"))}</p>${areasHtml}</div>`;
  }

  // ---------------- RESPONDER: escolha ----------------
  async function renderResponderStart(id) {
    setNav(null); loading();
    let a; try { a = await api(`/assessments/${id}`); } catch (e) { return notFound(); }
    const cards = FW.areas.map(area => {
      const p = a.progress[area.key];
      return `<a class="card tight" href="#/r/${id}/${area.key}" style="display:block"><h3 style="margin:0 0 4px">${esc(area.name)}</h3>
        <p class="muted small">${esc(area.description)}</p><span class="chip gray">${p.total} ${esc(t("perguntas"))}</span>
        ${p.respondents ? `<span class="chip">${p.respondents} ${esc(t("already_answered"))}</span>` : ""}</a>`;
    }).join("");
    app().innerHTML = `<div class="container narrow"><span class="pill">${esc(t("responder_pill"))}</span>
      <h1>${esc(a.client_name || t("responder_default_title"))}</h1><p class="lead">${esc(t("responder_lead"))}</p>
      <div class="callout" style="margin:14px 0">${t("responder_callout")}</div>
      <div class="grid grid-2" style="margin-top:18px">${cards}</div></div>`;
  }

  // ---------------- RESPONDER: questionario ----------------
  async function renderQuestionnaire(id, areaKey) {
    setNav(null);
    const area = areaByKey(areaKey); if (!area) return notFound();
    try { await api(`/assessments/${id}`); } catch (e) { return notFound(); }
    const questions = FW.questions.filter(q => q.area === areaKey);
    const state = { respondent: "", subarea: "", answers: {} };
    const fullRespondent = () => (area.collect_subarea && state.subarea.trim()) ? `${state.subarea.trim()} - ${state.respondent.trim()}` : state.respondent.trim();
    function draw() {
      const answeredCount = Object.keys(state.answers).length;
      const pct = Math.round(100 * answeredCount / questions.length);
      const qhtml = questions.map((q, idx) => {
        const fn = fnByKey(q.function); const dim = dimByKey(q.dimension); const sel = state.answers[q.id];
        const opts = q.options.map(o => `<div class="opt ${sel === o.level ? "sel" : ""}" data-q="${q.id}" data-lv="${o.level}">
            <span class="lv" style="background:${lvlColor(o.level)}">${o.level}</span><span>${esc(o.text)}</span></div>`).join("");
        const na = `<div class="opt na ${sel === null ? "sel" : ""}" data-q="${q.id}" data-lv="na"><span class="lv" style="background:var(--faint)">?</span><span>${esc(t("na_option"))}</span></div>`;
        return `<div class="qcard"><div class="qmeta"><span class="chip gray">${idx + 1}/${questions.length}</span>
            <span class="chip gray">${esc(fn ? fn.name : q.function)}</span><span class="chip gray">${esc(dim ? dim.name : q.dimension)}</span></div>
          <div class="qtext">${esc(q.text)}</div>${opts}${na}</div>`;
      }).join("");
      app().innerHTML = `<div class="container narrow"><a class="muted small" href="#/r/${id}">&larr; ${esc(t("change_area"))}</a>
        <h1 style="margin:.2em 0 0">${esc(area.name)}</h1><p class="muted">${esc(area.description)}</p>
        <div class="card tight">${area.collect_subarea ? `<label class="field">${esc(area.subarea_label || t("area_fallback"))}</label>
          <input type="text" id="subArea" placeholder="${esc(t("subarea_ph"))}" value="${esc(state.subarea)}" style="margin-bottom:12px">` : ""}
          <label class="field">${esc(t("your_name"))}</label><input type="text" id="respName" placeholder="${esc(t("name_ph"))}" value="${esc(state.respondent)}"></div>
        <div class="card tight" style="position:sticky;top:64px;z-index:10"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <span class="small muted js-count">${answeredCount}/${questions.length} ${esc(t("answered"))}</span><button class="btn primary small" id="saveBtn">${esc(t("save"))}</button></div>
          <div class="progress-track" style="margin-top:8px"><div class="progress-fill" style="width:${pct}%"></div></div></div>
        ${qhtml}<div class="center" style="margin:20px 0 0"><button class="btn primary lg" id="saveBtn2">${esc(t("save"))}</button></div></div>`;
      $("#respName").oninput = (e) => { state.respondent = e.target.value; };
      if ($("#subArea")) $("#subArea").oninput = (e) => { state.subarea = e.target.value; };
      app().querySelectorAll(".opt").forEach(o => o.onclick = () => {
        const q = o.getAttribute("data-q"), lv = o.getAttribute("data-lv");
        state.answers[q] = (lv === "na") ? null : parseInt(lv, 10);
        o.parentElement.querySelectorAll(".opt").forEach(x => x.classList.remove("sel")); o.classList.add("sel");
        const ac = Object.keys(state.answers).length; const p = Math.round(100 * ac / questions.length);
        app().querySelectorAll(".progress-fill").forEach(f => f.style.width = p + "%");
        app().querySelectorAll(".js-count").forEach(s => s.textContent = `${ac}/${questions.length} ${t("answered")}`);
      });
      const doSave = async () => {
        if (area.collect_subarea && !state.subarea.trim()) { toast(t("err_subarea")); if ($("#subArea")) $("#subArea").focus(); return; }
        if (!state.respondent.trim()) { toast(t("err_name")); $("#respName").focus(); return; }
        const answers = Object.entries(state.answers).map(([question_id, level]) => ({ question_id, level }));
        if (!answers.length) { toast(t("err_one")); return; }
        try { await api(`/assessments/${id}/responses`, { method: "POST", body: JSON.stringify({ area: areaKey, respondent: fullRespondent(), answers }) }); toast(t("saved_ok")); }
        catch (e) { toast(t("save_err") + e.message); }
      };
      $("#saveBtn").onclick = doSave; $("#saveBtn2").onclick = doSave;
    }
    draw();
  }

  // ---------------- RADAR ----------------
  function radarSVG(items) {
    // viewBox largo com margem horizontal generosa p/ os nomes das funcoes nao serem cortados
    const W = 540, H = 360, cx = W / 2, cy = H / 2, R = 108, n = items.length, max = 4;
    const ang = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;
    const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
    // quebra o nome em ate 2 linhas (~16 chars), sem truncar palavras no meio
    const wrap = (s) => {
      const words = String(s).split(/\s+/); const lines = []; let cur = "";
      for (const w of words) {
        if (cur && (cur + " " + w).length > 16) { lines.push(cur); cur = w; }
        else cur = cur ? cur + " " + w : w;
      }
      if (cur) lines.push(cur);
      if (lines.length > 2) { lines[1] = lines.slice(1).join(" "); lines.length = 2; if (lines[1].length > 18) lines[1] = lines[1].slice(0, 17) + "."; }
      return lines;
    };
    let rings = "";
    for (let g = 1; g <= 4; g++) { const rr = R * g / max; rings += `<polygon points="${items.map((_, i) => pt(i, rr).map(v => v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="#e4e8ee" stroke-width="1"/>`; }
    let axes = "", labels = "";
    items.forEach((it, i) => {
      const [x, y] = pt(i, R); axes += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eef1f4"/>`;
      const [lx, ly] = pt(i, R + 16); const anchor = Math.abs(lx - cx) < 28 ? "middle" : (lx < cx ? "end" : "start");
      const parts = wrap(it.name); parts.push(fmt(it.score)); // nota como ultima linha
      const y0 = ly - (parts.length - 1) * 5.5;
      parts.forEach((ln, k) => {
        const last = k === parts.length - 1;
        labels += `<text x="${lx.toFixed(1)}" y="${(y0 + k * 11).toFixed(1)}" font-size="10" font-weight="${last ? 700 : 400}" fill="${last ? "#8a99a8" : "#5b6b7b"}" text-anchor="${anchor}" dominant-baseline="middle">${esc(ln)}</text>`;
      });
    });
    const dataPts = items.map((it, i) => pt(i, R * (it.score || 0) / max).map(v => v.toFixed(1)).join(",")).join(" ");
    const dots = items.map((it, i) => { const [x, y] = pt(i, R * (it.score || 0) / max); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--blue)"/>`; }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:520px" role="img"><polygon points="${dataPts}" fill="rgba(34,114,180,.18)" stroke="var(--blue)" stroke-width="2"/>${rings}${axes}${dots}${labels}</svg>`;
  }
  function barList(items) {
    return items.map(it => `<div class="func-row"><span class="name">${esc(it.name)}</span>
      <span class="bar"><i style="width:${(100 * (it.score || 0) / 4).toFixed(0)}%;background:${lvlColor(it.score)}"></i></span>
      <span class="val">${fmt(it.score)}</span>
      <span class="lvl-badge lvl-${it.stage ? it.stage.level : 1}" style="width:104px;text-align:center">${it.stage ? esc(it.stage.name) : "-"}</span></div>`).join("");
  }

  // ---------------- RELATORIO ----------------
  async function renderReport(id) {
    setNav("#/assessments"); loading(t("loading_report"));
    let r; try { r = await api(wq(`/assessments/${id}/report`)); } catch (e) { return notFound(); }
    const es = r.executive_summary;
    if (es.global_score == null) {
      app().innerHTML = `<div class="container narrow"><a class="muted small" href="#/a/${id}">&larr; ${esc(t("nav_datamesh"))}</a>
        <div class="card center" style="padding:48px"><h2>${esc(t("not_enough_title"))}</h2><p class="muted">${esc(t("not_enough_sub"))}</p>
        <a class="btn primary" href="#/a/${id}">${esc(t("go_panel"))}</a></div></div>`; return;
    }
    const topo = es.recommended_topology;
    if (!OM) { try { OM = await api(wq("/operating_model")); } catch (e) {} }
    const opStage = omStageByKey(topo.key);
    const opSection = opStage ? `<div class="card"><h2>${esc(t("h_reco_opmodel"))}</h2>
        <p class="muted">${esc(t("reco_opmodel_sub"))} <b>${esc(opStage.name)}</b>. <a class="no-print" href="#/modelo-operacional/etapa/${topo.key}">${esc(t("om_open_full"))} &rarr;</a></p>
        ${omMatrixTableHTML(opStage.matrix)}<div class="dp-legend" style="margin-top:10px">${omRoleLegendHTML()}</div></div>` : "";
    // Gantt de dependencias: Mermaid (flowchart LR); horizonte dentro do no + cor da borda por H.
    const useMermaid = !!window.mermaid;
    const mmdef = useMermaid ? ganttMermaid(r.recommendations) : "";
    const ganttHtml = useMermaid
      ? ganttLegendHTML() + `<pre class="mermaid" id="depgraph" style="text-align:center"></pre>`
      : ganttSVG(r.recommendations);
    const funcItems = FW.functions.map(f => r.scores.by_function[f.key]).filter(x => x && x.score != null);
    const dimItems = FW.dimensions.map(d => r.scores.by_dimension[d.key]);
    const prinItems = FW.mesh_principles.map(p => r.scores.by_principle[p.key]);
    const maturityItems = (FW.maturity_dimensions || []).map(d => (r.scores.by_maturity || {})[d.key]).filter(x => x && x.score != null);
    const spectrum = r.topology.spectrum.map(tp => `<div class="topo ${tp.key === topo.key ? "hl" : ""}">
        <div class="pos">${esc(t("etapa"))} ${tp.position}${tp.key === topo.key ? " - " + esc(t("recommended")) : ""}</div>
        <h4>${esc(tp.name)}</h4><p class="muted small">${esc(tp.tagline)}</p></div>`).join("");
    const strengths = r.strengths.length ? r.strengths.map(s => `<li>${esc(s.text)}</li>`).join("") : `<li class="muted">${esc(t("no_strengths"))}</li>`;
    const recRows = (r.recommendations || []).map((rec, i) => `<tr>
        <td><span class="chip gray" style="font-size:11px;white-space:nowrap;font-weight:700">${esc(rec.code)}</span></td>
        <td><span class="chip gray" style="font-size:11px;white-space:nowrap">${esc(rec.horizonte)}</span></td>
        <td>${esc(rec.function)}<br><span class="faint small">${fmt(rec.score)} - ${esc(rec.stage)}</span></td>
        <td><span class="badge crit-${rec.criticidade}">${esc(critLabel(rec.criticidade))}</span></td>
        <td><span class="badge val-${rec.valor}" data-recq="${i}" style="cursor:pointer;white-space:nowrap" title="${esc(t("valor_click"))}">${esc(valorLabel(rec.valor))} · ${rec.value10} &#9432;</span></td>
        <td><span class="badge cpx-${rec.effort}" style="white-space:nowrap">${esc(effLabel(rec.effort))} · ${rec.complexity10}</span></td>
        <td><div>${esc(rec.text)}</div>
          <div style="margin-top:4px">${esc(t("docs_word"))} ${(rec.docs || []).map(d => `<a class="tag" href="${esc(d.url)}" target="_blank" rel="noopener" title="${esc(d.label)}">${esc(d.key)} &#8599;</a>`).join("")}</div></td>
        <td class="small">${rec.prereqs && rec.prereqs.length ? rec.prereqs.map(c => `<span class="chip gray" style="font-size:10px;white-space:nowrap">${esc(c)}</span>`).join(" ") : "—"}</td></tr>`).join("");
    const recEmpty = `<tr><td colspan="8" class="muted center" style="padding:20px">${esc(t("reco_empty"))}</td></tr>`;
    const roadmap = r.roadmap.map((h, i) => `<div class="card roadmap-col h${i + 1}"><h3>${esc(h.name)}</h3>
        <span class="chip gray">${esc(h.window)}</span><p class="muted small" style="margin:10px 0">${esc(h.goal)}</p>
        ${h.items.length ? `<ul style="padding-left:16px;margin:0" class="small">${h.items.map(it => `<li style="margin-bottom:8px"><b>${esc(it.function)}:</b> ${esc(it.action)} <span class="eff-${it.effort}">(${esc(effLabel(it.effort))})</span></li>`).join("")}</ul>` : `<p class="faint small" style="margin:0">—</p>`}</div>`).join("");
    const refLi = (arr) => (arr || []).map(x => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a> <span class="muted small">- ${esc(x.note)}</span></li>`).join("");
    const km = r.key_messages.map((m, i) => `<div class="card key-message"><div class="km-num">${i + 1}</div><h3>${esc(m.title)}</h3><p class="muted small">${esc(m.text)}</p>${m.bullets ? `<ul class="small">${m.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}</div>`).join("");
    const fw2 = (es.mesh_readiness != null && es.foundation_score != null && es.mesh_readiness - es.foundation_score >= 0.5);

    app().innerHTML = `
    <div class="container">
      <div class="no-print" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <a class="muted small" href="#/a/${id}">&larr; ${esc(t("nav_datamesh"))}</a>
        <div class="btn-row"><a class="btn" href="#/respostas/${id}">${esc(t("view_responses"))}</a>
        <button class="btn primary" id="pdfBtn">${esc(t("export_pdf"))}</button></div></div>
      <span class="pill">${esc(t("report_pill"))}</span><h1>${esc(r.meta.client_name || t("report_default"))}</h1>
      <p class="faint small">${esc(t("generated_on"))} ${dstr(r.meta.generated_at)} - ${esc(t("coverage"))}: ${r.meta.coverage.answered}/${r.meta.coverage.total} ${esc(t("questoes"))} (${r.meta.coverage.pct}%)</p>
      <div class="card"><div class="grid grid-4" style="margin-bottom:14px">
          <div class="kpi"><div class="big" style="color:${lvlColor(es.global_score)}">${fmt(es.global_score)}</div><div class="sub">${esc(t("kpi_global"))}</div></div>
          <div class="kpi"><div class="big" style="font-size:24px;margin-top:10px"><span class="lvl-badge lvl-${es.global_stage.level}">${esc(es.global_stage.name)}</span></div><div class="sub">${esc(t("kpi_stage"))}</div></div>
          <div class="kpi"><div class="big" style="color:${lvlColor(es.mesh_readiness)}">${fmt(es.mesh_readiness)}</div><div class="sub">${esc(t("kpi_readiness"))}</div></div>
          <div class="kpi"><div class="big" style="font-size:16px;margin-top:14px;line-height:1.3">${esc(topo.name)}</div><div class="sub">${esc(t("kpi_topology"))}</div></div></div>
        <p style="margin:0">${esc(es.headline)}</p></div>
      <div class="card"><h3>${esc(t("h_position"))}</h3>
        <p class="muted small" style="margin:0 0 10px">${esc(t("reco_model_sub"))} ${es.next_topology ? `${esc(t("next_step"))} <b>${esc(es.next_topology.name)}</b>.` : ""}</p>
        <div class="axis-labels"><span>${esc(t("axis_more_central"))}</span><span>${esc(t("axis_more_fed"))}</span></div>
        <div class="spectrum-track"></div><div class="spectrum">${spectrum}</div></div>
      <div class="grid grid-2">
        <div class="card"><h3>${esc(t("h_by_function"))}</h3><p class="faint small" style="margin:-4px 0 8px">${esc(t("h_by_function_note"))}</p><div class="center">${radarSVG(funcItems.map(f => ({ name: f.name, score: f.score })))}</div>${barList(funcItems)}</div>
        <div class="card"><h3>${esc(t("h_by_maturity"))}</h3><p class="faint small" style="margin:-4px 0 8px">${esc(t("h_by_maturity_note"))}</p><div class="center">${radarSVG(maturityItems.map(f => ({ name: f.name, score: f.score })))}</div>${barList(maturityItems)}</div></div>
      <div class="card"><h3>${esc(t("h_by_dimension"))}</h3>${barList(dimItems)}<h3 style="margin-top:18px">${esc(t("h_by_principle"))}</h3>${barList(prinItems)}<p class="faint small" style="margin-top:12px">${esc(t("weight_note"))}</p></div>
      <div class="card"><h2>${esc(t("h_reco_model"))}</h2>
        <div class="callout"><b>${esc(topo.name)}</b> - ${esc(topo.description)}</div>
        <div class="center" style="margin:16px 0 4px">${topoDiagram(topo.key)}</div>
        ${(topo.delta && topo.delta.length) ? `<h4 style="margin:8px 0 4px">${esc(t("delta_title"))}</h4><ul class="small muted" style="padding-left:16px;line-height:1.6">${topo.delta.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
        ${es.foundation_score != null ? `<p class="muted small" style="margin-top:12px">${t("foundation_note")} <b>${fmt(es.foundation_score)}</b>. ${esc(t("foundation_note_end"))}</p>
          ${fw2 ? `<div class="callout warn" style="margin-top:8px">${esc(t("kpi_readiness"))}: ${fmt(es.mesh_readiness)} &gt; ${fmt(es.foundation_score)}.</div>` : ""}` : ""}
        <div class="grid grid-2" style="margin-top:14px">
          <div><h4>${esc(t("how_databricks"))}</h4><ul class="small muted" style="padding-left:16px">${topo.databricks_setup.map(s => `<li>${esc(s)}</li>`).join("")}</ul></div>
          <div><div class="kv"><b>${esc(t("kv_central_control"))}</b><span>${esc(topo.central_control)}</span></div>
            <div class="kv"><b>${esc(t("kv_autonomy"))}</b><span>${esc(topo.autonomy)}</span></div>
            <div class="kv"><b>${esc(t("kv_workspaces"))}</b><span>${esc(topo.workspaces)}</span></div>
            <div class="kv"><b>${esc(t("kv_governance"))}</b><span>${esc(topo.governance)}</span></div>
            <div class="kv"><b>${esc(t("kv_sharing"))}</b><span>${esc(topo.sharing)}</span></div></div></div></div>
      ${es.next_topology ? `<details class="card"><summary style="cursor:pointer;font-weight:700;font-size:15px">${esc(t("next_model_title"))}: ${esc(es.next_topology.name)}</summary>
        <div style="margin-top:14px">
          <p class="muted small">${esc(es.next_topology.tagline || es.next_topology.description)}</p>
          <div class="center" style="margin:14px 0 4px">${topoDiagram(es.next_topology.key)}</div>
          ${(es.next_topology.delta && es.next_topology.delta.length) ? `<h4 style="margin:8px 0 4px">${esc(t("delta_title"))}</h4><ul class="small muted" style="padding-left:16px;line-height:1.6">${es.next_topology.delta.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
          <div class="grid grid-2" style="margin-top:12px">
            <div><h4>${esc(t("how_databricks"))}</h4><ul class="small muted" style="padding-left:16px">${(es.next_topology.databricks_setup || []).map(s => `<li>${esc(s)}</li>`).join("")}</ul></div>
            <div><div class="kv"><b>${esc(t("kv_central_control"))}</b><span>${esc(es.next_topology.central_control)}</span></div>
              <div class="kv"><b>${esc(t("kv_autonomy"))}</b><span>${esc(es.next_topology.autonomy)}</span></div>
              <div class="kv"><b>${esc(t("kv_workspaces"))}</b><span>${esc(es.next_topology.workspaces)}</span></div>
              <div class="kv"><b>${esc(t("kv_governance"))}</b><span>${esc(es.next_topology.governance)}</span></div>
              <div class="kv"><b>${esc(t("kv_sharing"))}</b><span>${esc(es.next_topology.sharing)}</span></div></div></div>
        </div></details>` : ""}
      <div class="card"><h2>${esc(t("h_strengths"))}</h2><ul style="padding-left:18px">${strengths}</ul></div>
      <h2>${esc(t("h_roadmap"))}</h2><div class="grid grid-3">${roadmap}</div>
      <div class="card"><h2>${esc(t("h_priomatrix"))}</h2><p class="muted small">${t("priomatrix_sub")}</p>
        <div class="center">${prioMatrixSVG(r.recommendations || [])}</div></div>
      <div class="card"><h2>${esc(t("h_reco"))}</h2><p class="muted small">${t("reco_sub")}</p>
        <div class="table-wrap"><table><thead><tr><th>${esc(t("th_action"))}</th><th>${esc(t("th_horizon"))}</th><th>${esc(t("th_function"))}</th><th>${esc(t("th_crit"))}</th><th>${esc(t("th_valor"))}</th><th>${esc(t("th_complexity"))}</th><th>${esc(t("th_reco"))}</th><th>${esc(t("th_prereq"))}</th></tr></thead>
        <tbody>${recRows || recEmpty}</tbody></table></div></div>
      <div class="card"><h2>${esc(t("h_gantt"))}</h2><p class="muted small">${esc(t("gantt_sub"))}</p>
        <div style="overflow-x:auto">${ganttHtml}</div></div>
      ${opSection}
      <hr class="sep"><h2>${esc(t("h_key_messages"))}</h2><div class="grid grid-2">${km}</div>
      <div class="grid grid-2" style="margin-top:6px">
        <div class="card"><h3>${esc(t("ref_concept"))}</h3><ul class="small muted" style="padding-left:16px;line-height:1.8">${refLi(r.references.concept)}</ul></div>
        <div class="card"><h3>${esc(t("ref_public"))}</h3><ul class="small muted" style="padding-left:16px;line-height:1.8">${refLi(r.references.public)}</ul></div></div>
    </div>`;
    const pdfBtn = $("#pdfBtn");
    if (pdfBtn) pdfBtn.onclick = () => { const prev = document.title; document.title = `Maturity & Operating Model - ${r.meta.client_name || ""}`.trim(); window.print(); setTimeout(() => { document.title = prev; }, 500); };
    // Clique na coluna VALOR -> caixa flutuante com as perguntas deficientes que a acao evolui
    app().querySelectorAll("[data-recq]").forEach(el => el.onclick = () => {
      const rec = (r.recommendations || [])[+el.getAttribute("data-recq")];
      if (!rec) return;
      const qs = (rec.impact_questions || []);
      const body = `<p class="muted">${esc(t("valor_modal_sub"))} <b>${esc(rec.function)}</b> (${qs.length}):</p>
        ${qs.length ? `<ul class="small" style="padding-left:16px;line-height:1.6">${qs.map(q => `<li><b>${esc(q.id)}</b> - ${esc(q.text)} <span class="faint">(${fmt(q.level)})</span></li>`).join("")}</ul>` : `<p class="muted small">${esc(t("valor_modal_none"))}</p>`}`;
      openModal(esc(t("valor_modal_title")) + " · Q" + rec.quartil, body);
    });
    // Caixa de detalhes formatada no hover (Gantt + matriz de priorizacao)
    const _byCode = {}; (r.recommendations || []).forEach(x => { _byCode[x.code] = x; });
    const depEl = document.getElementById("depgraph");
    if (useMermaid && depEl && mmdef) {
      const finish = () => {
        depEl.querySelectorAll(".node").forEach(node => {
          const mm = (node.id || "").match(/([A-Z]{2,3}\d{2})/) || (node.textContent || "").match(/([A-Z]{2,3}\d{2})/);
          if (mm) { node.setAttribute("data-code", mm[1]); node.style.cursor = "pointer"; }
        });
        wireRecTips(app(), _byCode);
      };
      const runOnce = () => { depEl.removeAttribute("data-processed"); depEl.textContent = mmdef; return window.mermaid.run({ nodes: [depEl] }); };
      Promise.resolve().then(runOnce).then(finish).catch(() => {
        // ELK falhou (ex.: web worker do elkjs) -> cai no layout padrao (dagre) e re-renderiza.
        try { if (window.__mermaidElk) { window.mermaid.initialize({ layout: "dagre" }); window.__mermaidElk = false; } } catch (e) {}
        Promise.resolve().then(runOnce).then(finish).catch(() => wireRecTips(app(), _byCode));
      });
    } else {
      wireRecTips(app(), _byCode);
    }
  }

  function notFound() {
    setNav(null);
    app().innerHTML = `<div class="container narrow center" style="padding-top:60px"><h1>${esc(t("notfound_title"))}</h1>
      <p class="muted">${esc(t("notfound_sub"))}</p><a class="btn primary" href="#/">${esc(t("go_home"))}</a></div>`;
  }

  // ---------------- ROUTER ----------------
  // ---------------- PRODUTOS DE DADOS (drill-down / desmistificar) ----------------
  // Traducoes da pagina de produtos de dados (linhas/atributos/hierarquia). Fallback = PT.
  const DP_I18N = {
    en: {
      cats: { "Datasets": "Datasets", "Modelos": "Models", "Canais de consumo": "Consumption channels" },
      bands: { "Recursos de dados": "Data resources", "Serviços de dados": "Data services" },
      rows: ["Tabular data (SQL tables, dataframes: facts, dimensions, metrics, series, KPIs, metadata)", "Metrics / Semantic layer", "ML & AI Features", "Streams", "Classical ML & AI", "LLM", "AI agent systems", "Queries & Notebooks (ready for consumption)", "Dashboards", "Chat interfaces", "Reports", "Alerts", "API (e.g., served models) *"],
      attrs: [["Discoverable", "findable in catalog / marketplace"], ["Addressable", "programmatic access via a stable address"], ["Self-describing", "clear metadata and documentation"], ["Reliable", "visible quality, SLA and lineage"], ["Interoperable", "open standards, consistent semantics across domains"], ["Secure", "access control and privacy applied"]],
      hier: [["Source-aligned", "Represents source-system data with minimal transformation (clean and reliable). First step toward more valuable products."], ["Derived", "Created by processing/combining source or other derived products. Serves decisions and cross-domain reuse."], ["Consumption-aligned", "Built for the end user: dashboards, reports, indicators."]],
      legend: "<b>P</b> = Producer &middot; <b>C</b> = Consumer &middot; <b>*</b> via SQL functions &middot; <b>**</b> embedded in business apps",
      roles: ["Data Engineer", "Data Scientist", "ML Engineer", "Business Analyst", "Business User"],
    },
    es: {
      cats: { "Datasets": "Datasets", "Modelos": "Modelos", "Canais de consumo": "Canales de consumo" },
      bands: { "Recursos de dados": "Recursos de datos", "Serviços de dados": "Servicios de datos" },
      rows: ["Datos tabulares (tablas SQL, dataframes: hechos, dimensiones, métricas, series, KPIs, metadatos)", "Métricas / Semántica", "Features de ML e IA", "Streams", "ML e IA clásico", "LLM", "Sistemas de agentes de IA", "Queries y Notebooks (listos para consumo)", "Dashboards", "Interfaces de chat", "Reportes", "Alertas", "API (ej.: modelos servidos) *"],
      attrs: [["Descubrible", "encontrable en catálogo / marketplace"], ["Direccionable", "acceso programático por una dirección estable"], ["Autodescriptivo", "metadatos y documentación claros"], ["Confiable", "calidad, SLA y linaje visibles"], ["Interoperable", "estándares abiertos, semántica consistente entre dominios"], ["Seguro", "control de acceso y privacidad aplicados"]],
      hier: [["Alineado al origen", "Representa el dato del sistema de origen con mínima transformación (limpio y confiable). Primer paso hacia productos más valiosos."], ["Derivado", "Creado al procesar/combinar productos de origen u otros derivados. Atiende decisiones y reuso entre dominios."], ["Alineado al consumo", "Construido para el usuario final: dashboards, reportes, indicadores."]],
      legend: "<b>P</b> = Productor &middot; <b>C</b> = Consumidor &middot; <b>*</b> vía funciones SQL &middot; <b>**</b> integrado en aplicaciones de negocio",
      roles: ["Ingeniero de Datos", "Científico de Datos", "Ingeniero de ML", "Analista de Negocio", "Usuario de Negocio"],
    },
  };
  function renderDataProducts() {
    const _dp = DP_I18N[LANG] || null;
    setNav("#/produtos-de-dados");
    let attrs = [
      ["Descobrível", "encontrável no catálogo / marketplace"],
      ["Endereçável", "acesso programático por um endereço estável"],
      ["Autodescritivo", "metadados e documentação claros"],
      ["Confiável", "qualidade, SLA e linhagem visíveis"],
      ["Interoperável", "padrões abertos, semântica consistente entre domínios"],
      ["Seguro", "controle de acesso e privacidade aplicados"],
    ];
    if (_dp) attrs = _dp.attrs;
    // Papeis produtores/consumidores da tabela de categorias (nomes claros, localizados).
    let dpRoles = ["Engenheiro de Dados", "Cientista de Dados", "Engenheiro de ML", "Analista de Negócio", "Usuário de Negócio"];
    if (_dp && _dp.roles) dpRoles = _dp.roles;
    // Categorias: matriz Produtor(P)/Consumidor(C) por papel + habilitador Databricks (atualizado).
    const dpGroups = [
      { cat: "Datasets", band: "Recursos de dados", rows: [
        { p: "Dados tabulares (tabelas SQL, dataframes: fatos, dimensões, métricas, séries, KPIs, metadados)", de: "P/C", ds: "P/C", mle: "C", ba: "P/C", bu: "", dbx: "Delta Lake, Delta Sharing" },
        { p: "Métricas / Semântica", de: "", ds: "", mle: "", ba: "P/C", bu: "C", dbx: "Metric Views (Unity Catalog)" },
        { p: "Features de ML & IA", de: "P/C", ds: "P/C", mle: "C", ba: "C", bu: "", dbx: "Feature Engineering, Mosaic AI Vector Search" },
        { p: "Streams", de: "P/C", ds: "C", mle: "", ba: "C", bu: "", dbx: "Structured Streaming, Lakeflow Declarative Pipelines, Materialized Views" },
      ] },
      { cat: "Modelos", band: "Serviços de dados", rows: [
        { p: "ML & IA clássico", de: "", ds: "P/C", mle: "P", ba: "", bu: "C**", dbx: "Modelos ML/IA, Mosaic AI Model Serving (CPU)" },
        { p: "LLM", de: "", ds: "P/C", mle: "P", ba: "", bu: "C**", dbx: "Fine-tuning/pré-treino de LLM, Foundation Model APIs, Mosaic AI Model Serving (GPU)" },
        { p: "Sistemas de agentes de IA", de: "", ds: "P/C", mle: "P", ba: "C", bu: "C**", dbx: "Agent Bricks, Mosaic AI Agent Framework" },
      ] },
      { cat: "Canais de consumo", band: "Serviços de dados", rows: [
        { p: "Queries & Notebooks (prontos p/ consumo)", de: "P/C", ds: "P/C", mle: "", ba: "C", bu: "C", dbx: "Databricks Notebooks" },
        { p: "Dashboards", de: "P/C", ds: "P/C", mle: "", ba: "P/C", bu: "C", dbx: "AI/BI Dashboards" },
        { p: "Interfaces de chat", de: "", ds: "", mle: "", ba: "P/C", bu: "C", dbx: "Genie" },
        { p: "Relatórios", de: "P/C", ds: "P/C", mle: "", ba: "P/C", bu: "C", dbx: "Exportação de visualizações, Databricks SQL" },
        { p: "Alertas", de: "P/C", ds: "P/C", mle: "", ba: "P/C", bu: "C", dbx: "Alertas de query/dashboard/job (Lakeflow Jobs)" },
        { p: "API (ex.: modelos servidos) *", de: "P/C", ds: "P/C", mle: "", ba: "C*", bu: "C**", dbx: "Databricks REST API, Mosaic AI Model Serving" },
      ] },
    ];
    if (_dp) { let _fi = 0; dpGroups.forEach(g => { g.cat = _dp.cats[g.cat] || g.cat; g.band = _dp.bands[g.band] || g.band; g.rows.forEach(r => { r.p = _dp.rows[_fi++] || r.p; }); }); }
    const pc = v => v ? `<td class="pc">${esc(v)}</td>` : `<td class="pc faint">-</td>`;
    let hier = [
      ["Alinhado à origem", "Representa o dado do sistema de origem com mínima transformação (limpo e confiável). Primeiro passo para produtos mais valiosos.", "bronze / silver"],
      ["Derivado", "Criado ao processar/combinar produtos de origem ou outros derivados. Atende decisões e reúso entre domínios.", "silver / gold"],
      ["Alinhado ao consumo", "Construído para o usuário final: dashboards, relatórios, indicadores.", "gold"],
    ];
    if (_dp) hier = hier.map((h, i) => [(_dp.hier[i] || [])[0] || h[0], (_dp.hier[i] || [])[1] || h[1], h[2]]);
    const catRows = dpGroups.map(g => g.rows.map((r, i) => `<tr>${i === 0
        ? `<td rowspan="${g.rows.length}" style="font-weight:700;vertical-align:top">${esc(g.cat)}<div class="faint small" style="font-weight:400;margin-top:4px">${esc(g.band)}</div></td>`
        : ""}<td class="small">${esc(r.p)}</td>${pc(r.de)}${pc(r.ds)}${pc(r.mle)}${pc(r.ba)}${pc(r.bu)}<td class="small dbx">${esc(r.dbx)}</td></tr>`).join("")).join("");
    const attrCards = attrs.map(a => `<div class="card tight"><h4 style="margin:0 0 4px">${esc(a[0])}</h4><p class="muted small" style="margin:0">${esc(a[1])}</p></div>`).join("");
    const hierRows = hier.map((h, i) => `<div class="card tight" style="border-left:4px solid ${["#c9d3df", "#4a90d9", "#2e9e6b"][i]}">
        <div class="chip gray">${esc(h[2])}</div><h4 style="margin:6px 0 4px">${esc(h[0])}</h4>
        <p class="muted small" style="margin:0">${esc(h[1])}</p></div>`).join("");
    app().innerHTML = `
    <div class="container">
      <span class="pill">${esc(t("nav_dataproducts"))}</span>
      <h1>${esc(t("dp_page_title"))}</h1>
      <p class="lead">${esc(t("dp_page_sub"))}</p>
      <div class="card"><h3>${esc(t("dp_practice_title"))}</h3>${dataProductsPracticeDiagram()}</div>
      <div class="card"><h3>${esc(t("dp_attrs_title"))}</h3><div class="grid grid-3">${attrCards}</div></div>
      <div class="card"><h3>${esc(t("dp_cats_title"))}</h3><p class="muted small">${esc(t("dp_cats_sub"))}</p>
        <div class="xscroll"><table class="sspr"><thead><tr>
          <th>${esc(t("dp_th_cat"))}</th><th>${esc(t("dp_th_product"))}</th>
          ${dpRoles.map(r => `<th style="text-align:center">${esc(r)}</th>`).join("")}
          <th>${esc(t("dp_th_dbx"))}</th>
        </tr></thead><tbody>${catRows}</tbody></table></div>
        <div class="dp-legend">${_dp ? _dp.legend : "<b>P</b> = Produtor · <b>C</b> = Consumidor · <b>*</b> via funções SQL · <b>**</b> embutido em aplicações de negócio"}</div>
        <div class="dp-uc">${esc(t("dp_uc_note"))}</div></div>
      <div class="card"><h3>${esc(t("dp_hier_title"))}</h3><div class="grid grid-3">${hierRows}</div></div>
    </div>`;
  }

  // ---------------- MODELO OPERACIONAL (areas de dados + RACI) ----------------
  // Helpers reutilizaveis da matriz RACI (usados na pagina Modelo Operacional e no relatorio)
  function omCell(v, start) {
    const cls = "pc" + (start ? " team-start" : "");
    if (!v) return `<td class="${cls}"><span class="raci-none">-</span></td>`;
    return `<td class="${cls}">${v.split("/").map(x => `<span class="raci raci-${x}">${x}</span>`).join(" ")}</td>`;
  }
  function omMatrixTableHTML(mx) {
    // indices de papel onde comeca um novo TIME (para separadores de grupo)
    const starts = new Set(); let _ti = 0;
    (mx.teams || []).forEach(tm => { starts.add(_ti); _ti += tm.count; });
    const teamHead = `<th colspan="3" class="noborder"></th>` + (mx.teams || []).map((tm, i) => `<th colspan="${tm.count}" class="teamcol${i ? " team-start" : ""}">${esc(tm.name)}</th>`).join("");
    const roleHead = `<th>${esc(t("th_area"))}</th><th>${esc(t("th_function"))}</th><th>${esc(t("th_desc"))}</th>` + mx.roles.map((r, idx) => `<th class="rolecol${starts.has(idx) ? " team-start" : ""}">${esc(r.name)}</th>`).join("");
    const body = mx.groups.map(g => g.functions.map((fn, i) => `<tr>${i === 0 ? `<td rowspan="${g.functions.length}" class="areacell small">${esc(g.area_name)}</td>` : ""}<td class="small" style="font-weight:600">${esc(fn.name)}</td><td class="small muted">${esc(fn.description)}</td>${mx.roles.map((r, idx) => omCell(fn.cells[r.key], starts.has(idx))).join("")}</tr>`).join("")).join("");
    return `<div class="xscroll"><table class="sspr raci-table"><thead><tr>${teamHead}</tr><tr>${roleHead}</tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function omRoleLegendHTML() {
    return ((OM && OM.raci_roles) || []).map(r => `<span class="chip gray" style="margin:0 6px 6px 0" title="${esc(r.description)}"><b>${esc(r.short)}</b> ${esc(r.name)}</span>`).join("");
  }
  function omStageByKey(key) {
    return ((OM && OM.stage_models) || []).find(s => s.key === key);
  }

  // F5b: publicacao/consumo de produtos entre dominios, passo a passo (Harmonizado x Hub-and-Spoke).
  // Reconstrucao NATIVA (SVG) fiel aos slides, traduzivel (PT/EN/ES). Setas acumulam por passo.
  const PUBFLOW_I18N = {
    pt: {
      prod: "Domínio de Dados 1 (produtor)", cons: "Domínio de Dados 2 (consumidor)",
      ingestTool: "Ferramenta de\nIngestão", source: "Fonte", databricks: "Databricks\n(ETL, DS, BI)",
      ingest: "Ingestão", curated: "Curada", published: "Publicada", bronze: "bronze", silver: "silver", gold: "gold",
      uc: "Unity Catalog", lineageSvc: "Serviço de\nlinhagem", accessCtl: "Controle de\nacesso",
      auditLog: "Log de\nauditoria", lineageExp: "Explorador de\nlinhagem", metastore: "(Unity)\nMetastore",
      domain1: "Domínio 1", domain2: "Domínio 2", schema: "Schema\n(Banco)",
      managedTbl: "Tabela\ngerenciada", externalTbl: "Tabela\nexterna", view: "View",
      cloudStorage: "Armazenamento em nuvem", dataHub: "Data Hub", pubDom1: "Publicada\nDomínio 1", pubDom2: "Publicada\nDomínio 2",
      legLin: "Fluxo de linhagem", legPub: "Fluxo de publicação", legCon: "Fluxo de consumo",
      trackLineage: "rastreia linhagem", publishMeta: "publica metadados", setAcls: "define ACLs",
      discover: "descobre", requestAccess: "solicita acesso", readData: "lê os dados", publishData: "publica dados",
      overview: "Visão geral",
      d_overview: "Domínios (produtor e consumidor) com a camada medalhão (bronze/silver/gold) e o Unity Catalog. Avance para ver a publicação e o consumo.",
      d_overviewHub: "Igual ao Harmonizado, mas o Data Hub central tem seu próprio armazenamento, que guarda uma cópia da camada Publicada de cada domínio.",
      d_trackLineage: "O produtor rastreia a linhagem no Serviço de linhagem do Unity Catalog.",
      d_trackLineageHub: "O produtor rastreia a linhagem no Unity Catalog. (**) A linhagem é rastreada em todos os workspaces conectados ao mesmo metastore.",
      d_publishMeta: "Publica os metadados como Tabela externa no Unity Catalog; o ponteiro aponta para o storage do próprio domínio, sem mover os dados.",
      d_setAcls: "Define as permissões de acesso (ACLs) da camada Publicada no Controle de acesso.",
      d_discover: "O consumidor descobre o produto no Metastore e no Explorador de linhagem do Unity Catalog.",
      d_requestAccess: "O consumidor solicita acesso ao produto de dados (Controle de acesso).",
      d_readData: "O consumidor lê os dados direto da camada Publicada do produtor, via Tabela externa - sem cópia.",
      d_publishData: "Diferença-chave: os DADOS são copiados fisicamente para o armazenamento do Data Hub (Publicada Domínio 1). (*) Processo em batch com CDF, DLT, ...",
      d_readDataHub: "O consumidor lê a CÓPIA republicada no Data Hub (Publicada Domínio 1), e não o storage do produtor.",
      noteHarm: "Produtos de dados são publicados como tabelas externas pelos domínios. O nível de catálogo do namespace de 3 níveis do Unity Catalog particiona os domínios.",
      noteHub: "(*) Processo em batch com CDF, DLT, ...   (**) A linhagem é rastreada em todos os workspaces conectados ao mesmo metastore.",
    },
    en: {
      prod: "Data Domain 1 (producer)", cons: "Data Domain 2 (consumer)",
      ingestTool: "Ingest\nTool", source: "Source", databricks: "Databricks\n(ETL, DS, BI)",
      ingest: "Ingest", curated: "Curated", published: "Published", bronze: "bronze", silver: "silver", gold: "gold",
      uc: "Unity Catalog", lineageSvc: "Lineage\nservice", accessCtl: "Access\nControl",
      auditLog: "Audit log", lineageExp: "Lineage\nexplorer", metastore: "(Unity)\nMetastore",
      domain1: "Domain 1", domain2: "Domain 2", schema: "Schema\n(Database)",
      managedTbl: "Managed\nTable", externalTbl: "External\nTable", view: "View",
      cloudStorage: "Cloud storage", dataHub: "Data Hub", pubDom1: "Published\nDomain 1", pubDom2: "Published\nDomain 2",
      legLin: "Lineage flow", legPub: "Publishing flow", legCon: "Consuming flow",
      trackLineage: "track lineage", publishMeta: "publish metadata", setAcls: "set ACLs",
      discover: "discover", requestAccess: "request access", readData: "read data", publishData: "publish data",
      overview: "Overview",
      d_overview: "Domains (producer and consumer) with the medallion layers (bronze/silver/gold) and Unity Catalog. Step through publishing and consuming.",
      d_overviewHub: "Same as Harmonized, but the central Data Hub has its own storage holding a copy of each domain's Published layer.",
      d_trackLineage: "The producer tracks lineage in the Unity Catalog Lineage service.",
      d_trackLineageHub: "The producer tracks lineage in Unity Catalog. (**) Lineage is tracked across all workspaces connected to the same metastore.",
      d_publishMeta: "Publishes metadata as an External Table in Unity Catalog; the pointer targets the domain's own storage, without moving data.",
      d_setAcls: "Sets access permissions (ACLs) for the Published layer in Access Control.",
      d_discover: "The consumer discovers the product in the Metastore and Lineage explorer of Unity Catalog.",
      d_requestAccess: "The consumer requests access to the data product (Access Control).",
      d_readData: "The consumer reads data directly from the producer's Published layer via the External Table - no copy.",
      d_publishData: "Key difference: DATA is physically copied to the Data Hub storage (Published Domain 1). (*) Batch process with CDF, DLT, ...",
      d_readDataHub: "The consumer reads the COPY republished in the Data Hub (Published Domain 1), not the producer's storage.",
      noteHarm: "Data products are published as external tables by the domains. The catalog level of the 3-level UC namespace partitions the domains.",
      noteHub: "(*) Batch process with CDF, DLT, ...   (**) Lineage is tracked across all workspaces connected to the same metastore.",
    },
    es: {
      prod: "Dominio de Datos 1 (productor)", cons: "Dominio de Datos 2 (consumidor)",
      ingestTool: "Herramienta\nde Ingesta", source: "Fuente", databricks: "Databricks\n(ETL, DS, BI)",
      ingest: "Ingesta", curated: "Curada", published: "Publicada", bronze: "bronze", silver: "silver", gold: "gold",
      uc: "Unity Catalog", lineageSvc: "Servicio de\nlinaje", accessCtl: "Control de\nacceso",
      auditLog: "Registro de\nauditoría", lineageExp: "Explorador\nde linaje", metastore: "(Unity)\nMetastore",
      domain1: "Dominio 1", domain2: "Dominio 2", schema: "Schema\n(Base)",
      managedTbl: "Tabla\ngestionada", externalTbl: "Tabla\nexterna", view: "View",
      cloudStorage: "Almacenamiento en la nube", dataHub: "Data Hub", pubDom1: "Publicada\nDominio 1", pubDom2: "Publicada\nDominio 2",
      legLin: "Flujo de linaje", legPub: "Flujo de publicación", legCon: "Flujo de consumo",
      trackLineage: "rastrea linaje", publishMeta: "publica metadatos", setAcls: "define ACLs",
      discover: "descubre", requestAccess: "solicita acceso", readData: "lee los datos", publishData: "publica datos",
      overview: "Visión general",
      d_overview: "Dominios (productor y consumidor) con las capas medallón (bronze/silver/gold) y Unity Catalog. Avance para ver publicación y consumo.",
      d_overviewHub: "Igual que Armonizado, pero el Data Hub central tiene su propio almacenamiento con una copia de la capa Publicada de cada dominio.",
      d_trackLineage: "El productor rastrea el linaje en el Servicio de linaje de Unity Catalog.",
      d_trackLineageHub: "El productor rastrea el linaje en Unity Catalog. (**) El linaje se rastrea en todos los workspaces conectados al mismo metastore.",
      d_publishMeta: "Publica los metadatos como Tabla externa en Unity Catalog; el puntero apunta al storage del propio dominio, sin mover los datos.",
      d_setAcls: "Define los permisos de acceso (ACLs) de la capa Publicada en Control de acceso.",
      d_discover: "El consumidor descubre el producto en el Metastore y el Explorador de linaje de Unity Catalog.",
      d_requestAccess: "El consumidor solicita acceso al producto de datos (Control de acceso).",
      d_readData: "El consumidor lee los datos directo de la capa Publicada del productor, vía Tabla externa - sin copia.",
      d_publishData: "Diferencia clave: los DATOS se copian físicamente al almacenamiento del Data Hub (Publicada Dominio 1). (*) Proceso batch con CDF, DLT, ...",
      d_readDataHub: "El consumidor lee la COPIA republicada en el Data Hub (Publicada Dominio 1), y no el storage del productor.",
      noteHarm: "Los productos de datos se publican como tablas externas por los dominios. El nivel de catálogo del namespace de 3 niveles de UC particiona los dominios.",
      noteHub: "(*) Proceso batch con CDF, DLT, ...   (**) El linaje se rastrea en todos los workspaces conectados al mismo metastore.",
    },
  };
  function renderPubFlow(el) {
    if (!el) return;
    const L = PUBFLOW_I18N[LANG] || PUBFLOW_I18N.pt;
    let model = "harmonizado", step = 0;
    const FLOWCOLOR = { lin: "#2e9e6b", pub: "#e8a13c", con: "#e85c4a" };
    const STEPS = {
      harmonizado: [
        { fl: "lin", from: "prodDbx", to: ["ucLin"], lbl: "trackLineage", d: "d_trackLineage" },
        { fl: "pub", from: "prodPub", to: ["ucDom1"], lbl: "publishMeta", d: "d_publishMeta" },
        { fl: "pub", from: "prodPub", to: ["ucAcl"], lbl: "setAcls", d: "d_setAcls" },
        { fl: "con", from: "consDbx", to: ["ucLexp", "ucMeta"], lbl: "discover", d: "d_discover" },
        { fl: "con", from: "consDbx", to: ["ucAcl"], lbl: "requestAccess", d: "d_requestAccess" },
        { fl: "con", from: "consDbx", to: ["prodPub"], lbl: "readData", d: "d_readData", dashed: true },
      ],
      hubspoke: [
        { fl: "lin", from: "prodDbx", to: ["ucLin"], lbl: "trackLineage", d: "d_trackLineageHub" },
        { fl: "pub", from: "prodPub", to: ["hubPub1"], lbl: "publishData", d: "d_publishData" },
        { fl: "pub", from: "prodPub", to: ["ucDom1"], lbl: "publishMeta", d: "d_publishMeta" },
        { fl: "pub", from: "prodPub", to: ["ucAcl"], lbl: "setAcls", d: "d_setAcls" },
        { fl: "con", from: "consDbx", to: ["ucLexp", "ucMeta"], lbl: "discover", d: "d_discover" },
        { fl: "con", from: "consDbx", to: ["ucAcl"], lbl: "requestAccess", d: "d_requestAccess" },
        { fl: "con", from: "consDbx", to: ["hubPub1"], lbl: "readData", d: "d_readDataHub", dashed: true },
      ],
    };
    const MODELNAME = { harmonizado: "Harmonizado (sem cópia)", hubspoke: "Hub-and-Spoke (com Data Hub)" };
    // pre-carrega nada (SVG e instantaneo)
    const esc2 = (s) => esc(String(s));
    const lines = (s) => String(s).split("\n");
    // caixa arredondada com rotulo (multi-linha)
    const box = (n, fill, stroke, sw) => {
      const ls = lines(n.t); const cx = n.x + n.w / 2; const cy = n.y + n.h / 2;
      const y0 = cy - (ls.length - 1) * 7 + 4;
      let s = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw || 1.6}"/>`;
      s += `<text text-anchor="middle" font-size="11" fill="#1b2733">` + ls.map((ln, i) => `<tspan x="${cx}" y="${(y0 + i * 13).toFixed(1)}">${esc2(ln)}</tspan>`).join("") + `</text>`;
      return s;
    };
    const ital = (x, y, txt, c) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="9" font-style="italic" fill="${c || "#8a8f98"}">${esc2(txt)}</text>`;
    const edgePt = (n, tx, ty) => {
      const cx = n.x + n.w / 2, cy = n.y + n.h / 2, dx = tx - cx, dy = ty - cy;
      if (!dx && !dy) return [cx, cy];
      const s = Math.min(dx ? (n.w / 2) / Math.abs(dx) : Infinity, dy ? (n.h / 2) / Math.abs(dy) : Infinity);
      return [cx + dx * s, cy + dy * s];
    };
    // desenha um dominio (hexagono-banner) e registra os nos de ancoragem em N
    const domainSvg = (ox, oy, title, dbxId, pubId, N) => {
      const w = 470, h = 196, tip = 40, cy = oy + h / 2;
      const hex = `M${ox + tip},${oy} L${ox + w - tip},${oy} L${ox + w},${cy} L${ox + w - tip},${oy + h} L${ox + tip},${oy + h} L${ox},${cy} Z`;
      let s = `<path d="${hex}" fill="#ffffff" stroke="#c7d0da" stroke-width="1.5"/>`;
      s += `<path d="M${ox + 50},${oy + 8} l14,0 l7,12 l-7,12 l-14,0 l-7,-12 z" fill="#eef1f5" stroke="#c7d0da" stroke-width="1"/><text x="${ox + 57}" y="${oy + 24}" text-anchor="middle" font-size="10" font-weight="700" fill="#7a8a99">G</text>`;
      s += `<text x="${ox + 250}" y="${oy + 26}" text-anchor="middle" font-size="13" font-weight="700" fill="#1b2733">${esc2(title)}</text>`;
      // sources
      [oy + 70, oy + 108].forEach(sy => {
        s += `<rect x="${ox + 30}" y="${sy}" width="46" height="30" rx="6" fill="#f6f8fa" stroke="#c7d0da" stroke-width="1.2"/><text x="${ox + 53}" y="${sy + 19}" text-anchor="middle" font-size="9" fill="#5b6b7b">${esc2(L.source)}</text>`;
      });
      s += box({ x: ox + 86, y: oy + 54, w: 78, h: 46, t: L.ingestTool }, "#fff", "#c7d0da", 1.4);
      const dbx = { x: ox + 172, y: oy + 54, w: 238, h: 46 }; N[dbxId] = dbx;
      s += box({ ...dbx, t: L.databricks }, "#fff", "#e8582c", 1.6);
      // medalhao
      s += `<rect x="${ox + 86}" y="${oy + 110}" width="324" height="72" rx="8" fill="none" stroke="#1b2733" stroke-width="1.4"/>`;
      const pub = { x: ox + 302, y: oy + 124, w: 96, h: 42 }; N[pubId] = pub;
      s += box({ x: ox + 100, y: oy + 124, w: 96, h: 42, t: L.ingest }, "#f4e1cf", "#c99a6b", 1.2);
      s += box({ x: ox + 201, y: oy + 124, w: 96, h: 42, t: L.curated }, "#e7eaee", "#aeb7c1", 1.2);
      s += box({ ...pub, t: L.published }, "#fbeecb", "#d9b866", 1.2);
      s += ital(ox + 148, oy + 178, L.bronze, "#b0824a") + ital(ox + 249, oy + 178, L.silver, "#8a99a8") + ital(ox + 350, oy + 178, L.gold, "#c79a2b");
      return s;
    };
    const render = () => {
      const steps = STEPS[model], last = steps.length, hub = model === "hubspoke";
      const N = {};
      // ---- estatico ----
      let s = "";
      if (hub) {
        s += `<rect x="546" y="30" width="512" height="552" rx="16" fill="#fbfcfe" stroke="#9fb0c2" stroke-width="1.6"/>`;
        s += `<text x="1052" y="22" text-anchor="end" font-size="13" font-weight="800" fill="#5b6b7b">${esc2(L.dataHub)}</text>`;
      }
      s += domainSvg(16, 36, L.prod + (hub ? " · spoke" : ""), "prodDbx", "prodPub", N);
      s += domainSvg(16, 360, L.cons + (hub ? " · spoke" : ""), "consDbx", "consPub", N);
      // Unity Catalog
      s += `<rect x="560" y="36" width="420" height="54" rx="8" fill="#fff" stroke="#e8a13c" stroke-width="1.8"/>`;
      // Ícone Unity Catalog (marca oficial aproximada: hexágono navy + pétalas rosa/amarelo)
      s += `<g>
        <polygon points="589,49.8 592.2,53 589,56.2 585.8,53" fill="#FF3B7F"/>
        <polygon points="597.7,54.8 600.9,58 597.7,61.2 594.5,58" fill="#FFB400"/>
        <polygon points="597.7,64.8 600.9,68 597.7,71.2 594.5,68" fill="#FF3B7F"/>
        <polygon points="589,69.8 592.2,73 589,76.2 585.8,73" fill="#FFB400"/>
        <polygon points="580.3,64.8 583.5,68 580.3,71.2 577.1,68" fill="#FF3B7F"/>
        <polygon points="580.3,54.8 583.5,58 580.3,61.2 577.1,58" fill="#FFB400"/>
        <polygon points="589,58.4 593,60.7 593,65.3 589,67.6 585,65.3 585,60.7" fill="#13233F"/>
      </g><text x="774" y="68" text-anchor="middle" font-size="14" font-weight="700" fill="#1b2733">${esc2(L.uc)}</text>`;
      N.ucLin = { x: 560, y: 110, w: 146, h: 44 }; s += box({ ...N.ucLin, t: L.lineageSvc }, "#fff", "#e8a13c", 1.5);
      N.ucAcl = { x: 560, y: 162, w: 146, h: 44 }; s += box({ ...N.ucAcl, t: L.accessCtl }, "#fff", "#e8a13c", 1.5);
      s += box({ x: 718, y: 162, w: 110, h: 44, t: L.auditLog }, "#fff", "#e8a13c", 1.5);
      N.ucLexp = { x: 560, y: 220, w: 146, h: 44 }; s += box({ ...N.ucLexp, t: L.lineageExp }, "#fff", "#e8a13c", 1.5);
      N.ucMeta = { x: 560, y: 272, w: 146, h: 44 }; s += box({ ...N.ucMeta, t: L.metastore }, "#fff", "#e8a13c", 1.5);
      N.ucDom1 = { x: 720, y: 238, w: 96, h: 38 }; N.ucDom2 = { x: 720, y: 286, w: 96, h: 38 };
      const schT = { x: 828, y: 214, w: 116, h: 36 }, schB = { x: 828, y: 258, w: 116, h: 36 };
      const mgd = { x: 956, y: 206, w: 96, h: 34 }, ext = { x: 956, y: 244, w: 96, h: 34 }, vw = { x: 956, y: 282, w: 96, h: 30 };
      // conectores da arvore (curvas suaves cinza)
      const link = (a, b) => { const ax = a.x + a.w, ay = a.y + a.h / 2, bx = b.x, by = b.y + b.h / 2; return `<path d="M${ax},${ay} C${(ax + bx) / 2},${ay} ${(ax + bx) / 2},${by} ${bx},${by}" fill="none" stroke="#b7c1cc" stroke-width="1.3"/>`; };
      s += link(N.ucMeta, N.ucDom1) + link(N.ucMeta, N.ucDom2) + link(N.ucDom1, schT) + link(N.ucDom1, schB) + link(schB, mgd) + link(schB, ext) + link(schB, vw);
      s += box({ ...N.ucDom1, t: L.domain1 }, "#fff", "#1b2733", 1.4);
      s += box({ ...N.ucDom2, t: L.domain2 }, "#fff", "#1b2733", 1.4);
      s += box({ ...schT, t: L.schema }, "#fff", "#1b2733", 1.3) + box({ ...schB, t: L.schema }, "#fff", "#1b2733", 1.3);
      s += box({ ...mgd, t: L.managedTbl }, "#fff", "#1b2733", 1.3) + box({ ...ext, t: L.externalTbl }, "#fff", "#2272b4", 1.5) + box({ ...vw, t: L.view }, "#fff", "#1b2733", 1.3);
      // Cloud storage (so hub)
      if (hub) {
        s += `<rect x="560" y="404" width="420" height="168" rx="10" fill="#fbfcfe" stroke="#c7d0da" stroke-width="1.4"/>`;
        s += `<text x="575" y="426" font-size="12" font-weight="700" fill="#5b6b7b">${esc2(L.cloudStorage)}</text>`;
        s += box({ x: 575, y: 436, w: 112, h: 44, t: L.ingest }, "#f4e1cf", "#c99a6b", 1.2) + ital(631, 492, L.bronze, "#b0824a");
        s += box({ x: 694, y: 436, w: 112, h: 44, t: L.curated }, "#e7eaee", "#aeb7c1", 1.2) + ital(750, 492, L.silver, "#8a99a8");
        N.hubPub1 = { x: 814, y: 430, w: 150, h: 40 }; s += box({ ...N.hubPub1, t: L.pubDom1 }, "#fbeecb", "#d9b866", 1.2);
        s += box({ x: 814, y: 476, w: 150, h: 40, t: L.pubDom2 }, "#fbeecb", "#d9b866", 1.2) + ital(889, 526, L.gold, "#c79a2b");
      }
      // ---- setas acumuladas ----
      // markerUnits=userSpaceOnUse -> tamanho fixo (nao escala com a espessura da linha, senao a ponta fica enorme)
      const markers = ["lin", "pub", "con"].map(k => `<marker id="pf-${k}" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${FLOWCOLOR[k]}"/></marker>`).join("");
      let arrows = "", labels = "";
      for (let i = 0; i < step; i++) {
        const st = steps[i], A = N[st.from], col = FLOWCOLOR[st.fl], cur = (i === step - 1);
        (st.to || []).forEach((tid, j) => {
          const B = N[tid]; if (!A || !B) return;
          const [ax, ay] = edgePt(A, B.x + B.w / 2, B.y + B.h / 2);
          const [bx, by] = edgePt(B, A.x + A.w / 2, A.y + A.h / 2);
          const dx = bx - ax, dy = by - ay;
          const c1x = ax + dx * 0.45, c1y = ay + dy * 0.08, c2x = bx - dx * 0.45, c2y = by - dy * 0.08;
          arrows += `<path d="M${ax.toFixed(1)},${ay.toFixed(1)} C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${cur ? 2.6 : 1.8}" opacity="${cur ? 1 : 0.7}" ${st.dashed ? 'stroke-dasharray="7 4"' : ""} marker-end="url(#pf-${st.fl})"/>`;
          if (j === 0) {
            const mx = ax + dx * 0.5, my = ay + dy * 0.5 - 9, txt = L[st.lbl], lw = txt.length * 6.0 + 14;
            labels += `<rect x="${(mx - lw / 2).toFixed(1)}" y="${(my - 10).toFixed(1)}" width="${lw.toFixed(1)}" height="18" rx="5" fill="#fff" opacity="0.55"/><text x="${mx.toFixed(1)}" y="${(my + 3).toFixed(1)}" text-anchor="middle" font-size="10.5" font-style="italic" font-weight="700" fill="${col}">${esc2(txt)}</text>`;
          }
        });
      }
      // legenda
      // legenda horizontal, pontas pequenas e coloridas (mesmos markers das setas), no canto inferior fora do UC
      const flowsLeg = [["lin", L.legLin], ["pub", L.legPub], ["con", L.legCon]];
      let lx = 36, ly = 600;   // legenda no canto inferior esquerdo (igual nos dois modelos)
      const leg = `<g>` + flowsLeg.map(([k, txt]) => {
        const seg = `<line x1="${lx}" y1="${ly}" x2="${lx + 22}" y2="${ly}" stroke="${FLOWCOLOR[k]}" stroke-width="2.2" marker-end="url(#pf-${k})"/><text x="${lx + 30}" y="${ly + 4}" font-size="10.5" fill="#5b6b7b">${esc2(txt)}</text>`;
        lx += 30 + txt.length * 6.0 + 24; return seg;
      }).join("") + `</g>`;
      const svg = `<svg viewBox="0 0 1080 614" width="100%" style="min-width:820px"><defs>${markers}</defs>${s}${arrows}${labels}${leg}</svg>`;
      // ---- controles + descricao ----
      const fr = steps[step - 1];
      const isOverview = step === 0;
      const flowKey = isOverview ? "" : fr.fl;
      const FLOWNAME = { lin: L.legLin, pub: L.legPub, con: L.legCon };
      const badge = flowKey ? `<span class="badge" style="background:${FLOWCOLOR[flowKey]}22;color:${FLOWCOLOR[flowKey]};border:1px solid ${FLOWCOLOR[flowKey]}">${esc2(FLOWNAME[flowKey])}</span> ` : "";
      const stepName = isOverview ? L.overview : L[fr.lbl];
      const desc = isOverview ? (hub ? L.d_overviewHub : L.d_overview) : L[fr.d];
      const stepLabel = isOverview ? "" : `${esc(t("pub_step"))} ${step}/${last} · `;
      const tabs = ["harmonizado", "hubspoke"].map(k => `<button class="btn ${k === model ? "primary" : "ghost"} small" data-pm="${k}">${esc2(MODELNAME[k])}</button>`).join(" ");
      const dots = [];
      for (let i = 0; i <= last; i++) dots.push(`<button class="pfdot ${i === step ? "on" : ""}" data-pfstep="${i}">${i === 0 ? "•" : i}</button>`);
      el.innerHTML = `<h2>${esc(t("pub_title"))}</h2><p class="muted small">${esc(t("pub_sub"))}</p>
        <div class="btn-row" style="margin-bottom:8px">${tabs}</div>
        <div class="pfsvg">${svg}</div>
        <div class="btn-row" style="margin-top:10px;align-items:center;gap:8px;flex-wrap:wrap">
          <button class="btn" id="pfPrev" ${step === 0 ? "disabled" : ""}>&larr; ${esc(t("pub_prev"))}</button>
          <button class="btn primary" id="pfNext" ${step >= last ? "disabled" : ""}>${esc(t("pub_next"))} &rarr;</button>
          <span class="pfdots">${dots.join("")}</span>
        </div>
        <div class="callout" style="margin-top:10px;min-height:58px">${badge}<b>${stepLabel}${esc2(stepName)}:</b> ${esc2(desc)}</div>
        <p class="faint small" style="margin-top:10px">${esc2(hub ? L.noteHub : L.noteHarm)}</p>`;
      el.querySelectorAll("[data-pm]").forEach(b => b.onclick = () => { model = b.getAttribute("data-pm"); step = 0; render(); });
      el.querySelectorAll("[data-pfstep]").forEach(b => b.onclick = () => { step = +b.getAttribute("data-pfstep"); render(); });
      const pv = el.querySelector("#pfPrev"), nx = el.querySelector("#pfNext");
      if (pv) pv.onclick = () => { if (step > 0) { step--; render(); } };
      if (nx) nx.onclick = () => { if (step < last) { step++; render(); } };
    };
    render();
  }

  async function renderOperatingModel(aid, stageKey) {
    setNav("#/modelo-operacional");
    if (!OM) { try { OM = await api(wq("/operating_model")); } catch (e) { OM = null; } }
    if (!OM || !OM.stage_models) { app().innerHTML = `<div class="container"><div class="card">${esc(t("err"))}</div></div>`; return; }
    let clientName = "";
    if (aid) { try { const a = await api(`/assessments/${aid}`); clientName = (a && a.client_name) || ""; } catch (e) {} }
    let stageIdx = 0;
    if (stageKey) { const ix = OM.stage_models.findIndex(s => s.key === stageKey); if (ix >= 0) stageIdx = ix; }
    const renderStage = () => {
      const sm = OM.stage_models[stageIdx];
      const tabs = OM.stage_models.map((s, i) => `<button class="btn ${i === stageIdx ? "primary" : "ghost"} small" data-stage="${i}">${esc(s.name)}</button>`).join(" ");
      const legendRoles = (OM.roles_glossary || []).map(a => `<div style="margin-bottom:10px"><b>${esc(a.name)}</b> <span class="faint small">- ${esc(t("om_synonyms"))}: ${esc((a.synonyms || []).join(" · "))}</span><div class="muted small">${esc(a.description)}</div></div>`).join("");
      document.getElementById("omBody").innerHTML = `
        <div class="btn-row" style="margin-bottom:12px">${tabs}</div>
        <div class="card">${omMatrixTableHTML(sm.matrix)}<div class="dp-legend" style="margin-top:10px">${omRoleLegendHTML()}</div></div>
        <div class="card"><h3 style="margin-bottom:14px">${esc(t("om_legend_roles"))}</h3>${legendRoles}</div>`;
      document.querySelectorAll("[data-stage]").forEach(b => b.onclick = () => { stageIdx = +b.getAttribute("data-stage"); renderStage(); });
    };
    app().innerHTML = `
    <div class="container">
      <span class="pill">${esc(t("nav_opmodel"))}</span>
      <h1>${esc(t("om_title"))}${clientName ? " - " + esc(clientName) : ""}</h1>
      <p class="lead">${esc(t("om_sub"))}</p>
      <p class="muted small">${esc(t("om_stage_hint"))}</p>
      <div id="omBody"></div>
      <div class="card" id="pubflow"></div>
    </div>`;
    renderStage();
    renderPubFlow(document.getElementById("pubflow"));
  }


  async function router() {
    const h = location.hash || "#/"; const parts = h.replace(/^#\//, "").split("/"); window.scrollTo(0, 0);
    try {
      if (h === "#/" || h === "" || h === "#") return renderHome();
      if (parts[0] === "assessments") return renderAssessments();
      if (parts[0] === "metodologia") return renderMethod();
      if (parts[0] === "modelo-operacional") return parts[1] === "etapa" ? renderOperatingModel(null, parts[2]) : renderOperatingModel(parts[1]);
      if (parts[0] === "produtos-de-dados") return renderDataProducts();
      if (parts[0] === "a" && parts[1]) return renderPanel(parts[1]);
      if (parts[0] === "respostas" && parts[1]) return renderResponses(parts[1]);
      if (parts[0] === "r" && parts[1] && parts[2]) return renderQuestionnaire(parts[1], parts[2]);
      if (parts[0] === "r" && parts[1]) return renderResponderStart(parts[1]);
      if (parts[0] === "report" && parts[1]) return renderReport(parts[1]);
      renderHome();
    } catch (e) { app().innerHTML = `<div class="container"><div class="card"><h2>${esc(t("err"))}</h2><p class="muted">${esc(e.message)}</p></div></div>`; }
  }

  async function boot() {
    try { FW = await api(wq("/framework")); }
    catch (e) { app().innerHTML = `<div class="container"><div class="card">${esc(t("fw_err"))}${esc(e.message)}</div></div>`; return; }
    try {
      if (window.mermaid) {
        // ELK layout (roteamento ortogonal, portas laterais). Precisa ser registrado no app;
        // se falhar, cai no dagre padrao (o Gantt tem fallback no render).
        let elkOk = false;
        try {
          if (window.mermaid.registerLayoutLoaders) {
            const elk = await import((window.__BASE__ || "") + "/vendor/elk/mermaid-layout-elk.esm.min.mjs");
            window.mermaid.registerLayoutLoaders(elk.default || elk);
            elkOk = true;
          }
        } catch (e) { elkOk = false; }
        window.__mermaidElk = elkOk;
        const cfg = {
          startOnLoad: false, securityLevel: "loose", theme: "base",
          flowchart: { htmlLabels: true, curve: "linear", nodeSpacing: 45, rankSpacing: 110, padding: 12, useMaxWidth: true },
          themeVariables: { fontFamily: "-apple-system, Segoe UI, Roboto, sans-serif", fontSize: "12px" },
        };
        if (elkOk) { cfg.layout = "elk"; cfg.elk = { mergeEdges: false, nodePlacementStrategy: "BRANDES_KOEPF" }; }
        window.mermaid.initialize(cfg);
      }
    } catch (e) {}
    initChrome();
    window.addEventListener("hashchange", router);
    router();
  }
  boot();
})();
