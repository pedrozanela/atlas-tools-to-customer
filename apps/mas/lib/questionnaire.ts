/**
 * MAS (Maturity Assessment) — questionnaire source of truth.
 *
 * Versão agnóstica - sem referências a produtos específicos.
 * Avalia maturidade em Data & AI com vocabulário genérico.
 */

export type Score = 1 | 2 | 3 | 4 | 5;

export interface Question {
  /** Stable identifier — used as DB column / hash key. Snake_case. */
  id: string;
  /** Short pt-BR label. */
  text: string;
  /** Likert anchors. Index 0 = level 1; index 4 = level 5. */
  anchors: [string, string, string, string, string];
}

export interface Recommendation {
  /** Short title. */
  title: string;
  /** Two-three line summary in pt-BR. */
  detail: string;
  /** Optional links to docs/dashboards. */
  links?: { label: string; href: string }[];
}

export interface Session {
  /** Stable key (snake_case) — DB column / route segment. */
  key: string;
  /** Display title. */
  title: string;
  /** One-line subtitle. */
  subtitle: string;
  /** Default weight (0..1). Sum of all weights = 1. */
  weight: number;
  questions: Question[];
  recommendations: Recommendation[];
}

const A = (
  l1: string,
  l2: string,
  l3: string,
  l4: string,
  l5: string,
): Question["anchors"] => [l1, l2, l3, l4, l5];

export const SESSIONS: Session[] = [
  // ============================================================
  // 1. FinOps & Gestão de Custos
  // ============================================================
  {
    key: "finops",
    title: "FinOps & Gestão de Custos",
    subtitle:
      "Visibilidade, atribuição, controle e otimização do gasto em Data & AI.",
    weight: 0.1,
    questions: [
      {
        id: "cost_attribution",
        text: "Como custos de compute são atribuídos por time, projeto ou workload?",
        anchors: A(
          "Sem rastreio — única fatura agregada da nuvem",
          "Alguns recursos têm tags ad-hoc; sem padrão definido",
          "Convenção de tags definida; aplicada manualmente na maioria dos recursos",
          "Tags obrigatórias via políticas automatizadas em quase todos os recursos",
          "Atribuição de custos completa: todos os recursos com tags obrigatórias; chargeback/showback por time implementado",
        ),
      },
      {
        id: "cost_guardrails",
        text: "Quais guardrails impedem provisionamento descontrolado de recursos?",
        anchors: A(
          "Qualquer usuário cria recursos de compute livremente",
          "Limite informal comunicado verbalmente",
          "Políticas de governança existem mas aplicadas apenas a alguns times",
          "Políticas por persona (jobs, análise, ML) com limites de capacidade e tipos de recursos",
          "Políticas completas + limites de orçamento + timeouts em queries + rate limits em APIs",
        ),
      },
      {
        id: "cost_observability",
        text: "Como anomalias de consumo são detectadas?",
        anchors: A(
          "Só quando a fatura vem alta no final do mês",
          "Alguém olha o console de custos esporadicamente",
          "Dashboards manuais construídos internamente",
          "Dashboards de uso + orçamentos com alertas por e-mail configurados",
          "Dashboards por tipo de workload + alertas previsionais + detecção automática de anomalias",
        ),
      },
      {
        id: "cost_optimization",
        text: "Workloads ineficientes (recursos ociosos, jobs lentos, queries caras) são identificados e otimizados?",
        anchors: A(
          "Ninguém olha custo de jobs individuais",
          "Revisão pontual quando alguém reclama de lentidão ou custo",
          "Revisão trimestral dos top-N jobs mais caros",
          "Recursos serverless como padrão; revisão mensal dos maiores consumidores",
          "Auto-otimização ativa (autoscale, instâncias preemptivas/spot, versões otimizadas) + dashboard de oportunidades sempre atualizado",
        ),
      },
    ],
    recommendations: [
      {
        title: "Atribuição de custo via tags obrigatórias",
        detail:
          "Force tags (cost_center, team, project, environment) via políticas de governança. Para recursos serverless, crie políticas de orçamento por usuário/time. Sem isso, chargeback fica impossível.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/admin/account-settings/usage-detail-tags" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/admin/account-settings/usage-detail-tags" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/admin/account-settings/usage-detail-tags" },
        ],
      },
      {
        title: "Dashboards de custo prontos",
        detail:
          "Implemente dashboards de uso e custo para ter visibilidade imediata. Segmente por tipo de workload: jobs batch, queries analíticas, inferência de modelos.",
        links: [
          { label: "Billing Tables (AWS)", href: "https://docs.databricks.com/aws/en/admin/system-tables/billing" },
          { label: "Billing Tables (Azure)", href: "https://learn.microsoft.com/en-us/azure/databricks/admin/system-tables/billing" },
          { label: "Billing Tables (GCP)", href: "https://docs.databricks.com/gcp/en/admin/system-tables/billing" },
          { label: "Usage Dashboard (AWS)", href: "https://docs.databricks.com/aws/en/admin/account-settings/usage" },
          { label: "Usage Dashboard (Azure)", href: "https://learn.microsoft.com/en-us/azure/databricks/admin/account-settings/usage" },
          { label: "Usage Dashboard (GCP)", href: "https://docs.databricks.com/gcp/en/admin/account-settings/usage" },
        ],
      },
      {
        title: "Políticas de compute por persona",
        detail:
          "Crie ao menos 2 políticas — Jobs/Pipelines (limites rígidos, spot instances) e Análise Ad-hoc (limites mais permissivos mas com auto-termination agressivo).",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/admin/clusters/policies" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/admin/clusters/policies" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/admin/clusters/policies" },
        ],
      },
      {
        title: "Orçamentos + alertas",
        detail:
          "Defina orçamentos por time/projeto. Configure alertas por email quando limites forem atingidos ou excedidos.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/admin/account-settings/budgets" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/admin/account-settings/budgets" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/admin/account-settings/budgets" },
        ],
      },
      {
        title: "Escolha inteligente de recursos",
        detail:
          "Recursos efêmeros para jobs recorrentes. SQL serverless para análises. Versões mais recentes e otimizadas dos runtimes. Spot instances em ambientes não-produtivos.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/lakehouse-architecture/cost-optimization/best-practices" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/lakehouse-architecture/cost-optimization/best-practices" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/lakehouse-architecture/cost-optimization/best-practices" },
        ],
      },
    ],
  },

  // ============================================================
  // 2. CI/CD & DataOps
  // ============================================================
  {
    key: "cicd",
    title: "CI/CD & DataOps",
    subtitle:
      "Versionamento, infraestrutura como código, testes automatizados e promoção entre ambientes.",
    weight: 0.12,
    questions: [
      {
        id: "version_control",
        text: "Todo código de dados (notebooks, pipelines, SQL, configs de jobs) está versionado em Git?",
        anchors: A(
          "Nada em Git — código vive apenas na plataforma",
          "Repositório existe mas a maioria do código está só na plataforma",
          "Notebooks principais commitados; export manual esporádico",
          "Sincronização bidirecional com Git em todos os times",
          "100% em Git com autenticação por service account, política de branches enforçada, código em formato fonte (.py/.sql)",
        ),
      },
      {
        id: "iac_dabs",
        text: "Jobs, pipelines, clusters e permissões são definidos como código (Infrastructure as Code)?",
        anchors: A(
          "Tudo criado manualmente na interface",
          "Alguns jobs em Terraform ou scripts ad-hoc",
          "IaC para uma minoria dos projetos novos",
          "IaC como padrão para projetos novos; legados sendo migrados",
          "100% dos recursos em arquivos de configuração versionados (jobs, pipelines, compute, dashboards, políticas)",
        ),
      },
      {
        id: "tests",
        text: "Quais testes rodam automaticamente antes de um deploy em produção?",
        anchors: A(
          "Nenhum — deploy direto sem validação",
          "Smoke test manual depois do deploy",
          "Unit tests em algumas bibliotecas",
          "Pirâmide de testes (unit + integration) em CI; smoke pós-deploy",
          "Pirâmide completa em PR + integration em ambiente efêmero + smoke + verificações de qualidade; alta cobertura em código crítico",
        ),
      },
      {
        id: "envs_isolation",
        text: "Existe isolamento real entre dev, staging e prod (ambiente, catálogo, storage, identidades, secrets)?",
        anchors: A(
          "Um único ambiente, mesmo catálogo para tudo",
          "Catálogos separados mas mesmo ambiente e identidades",
          "Ambientes separados; algumas identidades compartilhadas",
          "Ambientes + catálogos + storage + identidades separados; secrets isolados",
          "Isolamento total + políticas espelhando prod em staging + dados anonimizados em staging",
        ),
      },
      {
        id: "rollback",
        text: "Se um deploy corrompe dados em prod, qual o processo e tempo de recuperação?",
        anchors: A(
          "Não há processo documentado",
          "Rollback manual por SQL; demora horas",
          "Git checkout + redeploy; sem ensaio recente",
          "Git tag + redeploy + versionamento de tabelas; testado em staging",
          "Runbook com tempo de recuperação < 30min para incidentes críticos; ensaio trimestral; retenção de versões adequada",
        ),
      },
    ],
    recommendations: [
      {
        title: "Sincronização Git como padrão",
        detail:
          "Nada de export manual. Sincronização bidirecional preserva formato fonte (.py/.sql) e histórico. Use Service Account com integração Git — sem tokens pessoais.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/repos/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/repos/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/repos/index" },
        ],
      },
      {
        title: "Infraestrutura como Código (DABs)",
        detail:
          "Arquivos de configuração versionados. Targets dev, staging (com service account), prod (com service account). Políticas de compute também como código.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/dev-tools/bundles/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/dev-tools/bundles/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/dev-tools/bundles/index" },
        ],
      },
      {
        title: "Pirâmide de testes",
        detail:
          "Unit (pytest no CI) → Integration (catálogo efêmero, destruído ao fim) → Smoke pós-deploy (contagem de linhas, freshness). Fixtures ajudam com setup.",
        links: [
          { label: "Unit Tests (AWS)", href: "https://docs.databricks.com/aws/en/files/python-unit-tests" },
          { label: "Unit Tests (Azure)", href: "https://learn.microsoft.com/en-us/azure/databricks/files/python-unit-tests" },
          { label: "Unit Tests (GCP)", href: "https://docs.databricks.com/gcp/en/files/python-unit-tests" },
        ],
      },
      {
        title: "Isolamento total por ambiente",
        detail:
          "Workspace + catálogo (*_dev/*_staging/*_prod) + storage (buckets distintos) + service account por ambiente + secrets isolados.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/lakehouse-architecture/deployment-guide/workspace-strategy" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/lakehouse-architecture/deployment-guide/workspace-strategy" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/lakehouse-architecture/deployment-guide/workspace-strategy" },
        ],
      },
      {
        title: "Rollback testado",
        detail:
          "Toda tag Git imutável = redeploy possível. Versionamento de tabelas com retenção adequada. Clone shallow para ensaiar restore em staging.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/delta/history" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/delta/history" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/delta/history" },
        ],
      },
    ],
  },

  // ============================================================
  // 3. Arquitetura de Dados Moderna
  // ============================================================
  {
    key: "lakehouse",
    title: "Arquitetura de Dados Moderna",
    subtitle:
      "Camadas Bronze/Silver/Gold com contratos, otimização de tabelas e acesso multi-engine.",
    weight: 0.1,
    questions: [
      {
        id: "medallion_contracts",
        text: "As camadas Bronze/Silver/Gold têm contratos formais de qualidade, freshness e SLA?",
        anchors: A(
          "Não usamos arquitetura em camadas",
          "Camadas existem mas sem contratos formais",
          "Documentação em wiki mas não monitorada ativamente",
          "Contratos definidos + SLA monitorado em camadas críticas",
          "Contratos formais por camada + SLA enforçado + alertas automáticos quando quebrado",
        ),
      },
      {
        id: "delta_versioning",
        text: "Tabelas críticas têm versionamento (time travel) ativo com retenção configurada?",
        anchors: A(
          "Misto de formatos (Parquet, CSV) sem versionamento",
          "Maioria com versionamento mas sem retenção configurada",
          "Versionamento com retenção padrão em tabelas críticas",
          "Versionamento com retenção definida explicitamente por criticidade",
          "Versionamento padrão com retenção adequada + auto-otimização em camadas Silver/Gold",
        ),
      },
      {
        id: "clustering",
        text: "Otimização de layout: clustering, particionamento e compactação automática estão corretos?",
        anchors: A(
          "Sem otimização explícita de layout",
          "Partições por colunas de alta cardinalidade (problema de small files)",
          "Particionamento adequado para tabelas previsíveis",
          "Clustering automático em tabelas grandes; particionamento só onde faz sentido",
          "Clustering + auto-otimização + compactação automática; sem problema de small files",
        ),
      },
      {
        id: "multi_engine",
        text: "Múltiplos engines (Spark, Trino, outras plataformas) leem os mesmos dados sem duplicação?",
        anchors: A(
          "Cada engine tem sua cópia dos dados",
          "Compartilhamento via exports periódicos",
          "Formato aberto (Iceberg/Delta) em alguns datasets",
          "Catálogo REST expondo tabelas para engines externos",
          "Catálogo centralizado como fonte única — múltiplos engines leem sem duplicação via protocolos abertos",
        ),
      },
    ],
    recommendations: [
      {
        title: "Contratos formais por camada",
        detail:
          "Bronze (raw, schema-on-read, append-only, retenção longa). Silver (clean, deduplicated, schema enforced, completude >99%). Gold (agregações otimizadas, freshness por caso de uso).",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/lakehouse/medallion" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/lakehouse/medallion" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/lakehouse/medallion" },
        ],
      },
      {
        title: "Liquid Clustering > particionamento manual",
        detail:
          "Para tabelas grandes, Liquid Clustering. É incremental, sem rewrite total, adapta a múltiplos padrões de acesso. Particionamento tradicional só onde queries são sempre por data.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/delta/clustering" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/delta/clustering" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/delta/clustering" },
        ],
      },
      {
        title: "Auto-otimização ativa",
        detail:
          "Habilite escrita otimizada e compactação automática em Silver e Gold. Elimina problema de small files sem OPTIMIZE manual.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/delta/tune-file-size" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/delta/tune-file-size" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/delta/tune-file-size" },
        ],
      },
      {
        title: "Multi-engine via UniForm + Iceberg REST Catalog",
        detail:
          "UniForm gera metadados Iceberg automaticamente. Iceberg REST Catalog expõe tabelas para Spark, Trino, Snowflake sem duplicação.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/delta/uniform" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/delta/uniform" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/delta/uniform" },
        ],
      },
    ],
  },

  // ============================================================
  // 4. Governança & Catálogo de Dados
  // ============================================================
  {
    key: "governance",
    title: "Governança & Catálogo de Dados",
    subtitle:
      "Catálogo centralizado, ownership, classificação e mascaramento de dados sensíveis.",
    weight: 0.12,
    questions: [
      {
        id: "uc_centralized",
        text: "O catálogo de dados é a ÚNICA camada de controle de acesso (sem ACLs legadas espalhadas)?",
        anchors: A(
          "Sem catálogo centralizado — controle de acesso fragmentado em múltiplos sistemas",
          "Catálogo moderno coexiste com sistemas legados; permissões duplicadas",
          "Catálogo moderno como padrão para dados novos; legado ainda ativo",
          "Maioria migrada para catálogo moderno; poucos sistemas legados pendentes",
          "100% no catálogo centralizado; controles legados desabilitados",
        ),
      },
      {
        id: "ownership",
        text: "Existe ownership definido para catálogos, schemas e tabelas, atribuído via grupos corporativos?",
        anchors: A(
          "Sem ownership definido",
          "Ownership informal por time (conhecimento tribal)",
          "Proprietário definido em catálogos principais; schemas e tabelas sem definição",
          "Proprietário definido em catálogo e schema; tabelas herdam",
          "Proprietário em todos os níveis via grupos corporativos; processo de transferência formalizado",
        ),
      },
      {
        id: "pii_classification",
        text: "Dados sensíveis (PII, financeiro, saúde) são classificados e mascarados automaticamente?",
        anchors: A(
          "Sem classificação de dados sensíveis",
          "Identificação manual e esporádica",
          "Tags em algumas colunas sensíveis; mascaramento não automatizado",
          "Tags + políticas de mascaramento aplicadas em colunas críticas",
          "Descoberta automática de dados sensíveis + tags + mascaramento por política + cobertura auditada",
        ),
      },
      {
        id: "row_security",
        text: "Segurança em nível de linha está implementada para dados multi-tenant?",
        anchors: A(
          "Sem controle — ou views separadas por tenant (não escala)",
          "Algumas views com filtro fixo no WHERE; sem governança centralizada",
          "Row-level security em algumas tabelas críticas",
          "Row-level security em tabelas multi-tenant; com testes de validação",
          "Row-level security dinâmico (baseado no usuário) + auditoria de acessos; cobertura total em dados sensíveis",
        ),
      },
      {
        id: "lineage",
        text: "Lineage em nível de coluna é usado para análise de impacto antes de mudanças?",
        anchors: A(
          "Sem lineage rastreada",
          "Lineage existe mas raramente consultada",
          "Lineage consultada esporadicamente para investigar problemas",
          "Lineage faz parte do processo de change management antes de alterações",
          "Lineage integrada a processos de CI/CD; impacto downstream avaliado antes de mudanças em produção",
        ),
      },
      {
        id: "audit",
        text: "Logs de auditoria são usados para compliance, rastreabilidade e relatórios de acesso?",
        anchors: A(
          "Não usamos logs de auditoria",
          "Logs existem mas só revisados após incidentes",
          "Dashboard básico de acessos a dados sensíveis",
          "Relatórios periódicos de acesso para compliance; retenção definida",
          "Auditoria completa integrada a processos de compliance + retenção alinhada a requisitos regulatórios + relatórios automatizados",
        ),
      },
    ],
    recommendations: [
      {
        title: "Unity Catalog como camada única de governança",
        detail:
          "Elimine ACLs de workspace e controles legados. O Unity Catalog governa tabelas, arquivos (volumes), modelos ML, features de forma unificada.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/data-governance/unity-catalog/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/data-governance/unity-catalog/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/data-governance/unity-catalog/index" },
        ],
      },
      {
        title: "Hierarquia + ownership por IdP",
        detail:
          "catalog → schema → table/volume. OWNER via grupos do provedor de identidade — nunca usuários individuais. Owner aprova acessos e responde por qualidade.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/data-governance/unity-catalog/manage-privileges/ownership" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/data-governance/unity-catalog/manage-privileges/ownership" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/data-governance/unity-catalog/manage-privileges/ownership" },
        ],
      },
      {
        title: "Mascaramento em nível de coluna + filtros de linha",
        detail:
          "Políticas de mascaramento no Unity Catalog. Analistas veem dados mascarados, usuários privilegiados veem o real. Sem duplicar tabelas. Row filters para multi-tenant.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/data-governance/unity-catalog/row-and-column-filters" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/data-governance/unity-catalog/row-and-column-filters" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/data-governance/unity-catalog/row-and-column-filters" },
        ],
      },
      {
        title: "Lineage em nível de coluna",
        detail:
          "Capturada automaticamente em queries. Disponível na UI e via API. Use ANTES de DROP/RENAME em tabela upstream.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/data-governance/unity-catalog/data-lineage" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/data-governance/unity-catalog/data-lineage" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/data-governance/unity-catalog/data-lineage" },
        ],
      },
      {
        title: "Auditoria contínua via System Tables",
        detail:
          "System Tables cobrem todo acesso. Alertas para acessos anômalos (horário, volume, identidade nova). Retenção alinhada com requisitos de compliance.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/admin/system-tables/audit-logs" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/admin/system-tables/audit-logs" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/admin/system-tables/audit-logs" },
        ],
      },
    ],
  },

  // ============================================================
  // 5. Qualidade de Dados & Observabilidade
  // ============================================================
  {
    key: "data_quality",
    title: "Qualidade de Dados & Observabilidade",
    subtitle:
      "Detecção proativa, validações na ingestão, descoberta de dados e observabilidade de pipelines.",
    weight: 0.1,
    questions: [
      {
        id: "dq_detection",
        text: "Problemas de qualidade são detectados proativamente ou via reclamação do usuário?",
        anchors: A(
          "Sempre via reclamação do usuário final",
          "Algumas verificações manuais esporádicas",
          "Queries SQL agendadas que reportam erros",
          "Monitoramento de qualidade em schemas críticos com alertas",
          "Monitoramento completo + validações customizadas por SLA; tempo de detecção < 1h",
        ),
      },
      {
        id: "dq_ingestion",
        text: "Registros inválidos são bloqueados/quarentenados na ingestão?",
        anchors: A(
          "Passam direto sem validação",
          "Falham o pipeline silenciosamente",
          "Regras de validação em alguns pipelines",
          "Validações em todas as ingestões críticas com ações configuráveis (alertar, quarentenar, rejeitar)",
          "Validações completas + tabela de quarentena padronizada + dashboards de taxa de qualidade",
        ),
      },
      {
        id: "downstream_impact",
        text: "Quando uma tabela upstream quebra, quanto tempo até saber quem foi afetado?",
        anchors: A(
          "Descobrimos quando alguém liga reclamando",
          "Comunicação manual via chat/email",
          "Lineage consultada manualmente para identificar impacto",
          "Alertas em tabelas downstream baseados em lineage",
          "Alertas automáticos para owners de tabelas downstream em menos de 5 minutos",
        ),
      },
      {
        id: "dq_sla",
        text: "SLA de freshness e completude está definido e monitorado em datasets críticos?",
        anchors: A(
          "Sem SLA definido",
          "SLA informal, sem medição",
          "SLA definido para alguns; medido manualmente",
          "SLA documentado + medido em dashboard automatizado",
          "SLA enforçado via monitoramento + alertas + automação quando quebrado",
        ),
      },
      {
        id: "discovery",
        text: "Como um analista descobre quais tabelas existem, o que significam e se pode confiar nelas?",
        anchors: A(
          "Conhecimento tribal (pergunta no chat)",
          "Documentação em wiki desatualizada",
          "Catálogo com alguns comentários",
          "Catálogo com tags de status (Verificado/Deprecated) em uso",
          "Catálogo completo + domínios curados + comentários em 100% das tabelas Gold/Silver + tags por sensibilidade",
        ),
      },
      {
        id: "pipeline_observability",
        text: "Observabilidade de execuções (duração, falhas, retries) está consolidada?",
        anchors: A(
          "Logs espalhados em múltiplos lugares; sem dashboard",
          "Interface de jobs consultada manualmente",
          "Dashboards manuais construídos sobre logs",
          "Dashboard de jobs importado e mantido",
          "Dashboards consolidados + alertas customizados + SLOs de pipelines críticos definidos",
        ),
      },
    ],
    recommendations: [
      {
        title: "Lakehouse Monitoring em nível de schema",
        detail:
          "Habilite Lakehouse Monitoring em schemas críticos. Detecta drift, nulls, anomalias automaticamente. Alertas via interface ou queries sobre métricas.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/lakehouse-monitoring/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/lakehouse-monitoring/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/lakehouse-monitoring/index" },
        ],
      },
      {
        title: "DLT Expectations na ingestão",
        detail:
          "Defina expectations em Delta Live Tables. Modos: warn, drop, fail. Para validações declarativas avançadas, considere Great Expectations ou Soda.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/delta-live-tables/expectations" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/delta-live-tables/expectations" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/delta-live-tables/expectations" },
        ],
      },
      {
        title: "Lineage para impacto downstream",
        detail:
          "Consulte lineage de tabelas e colunas no Unity Catalog. Use no processo de Change Advisory antes de DROP/RENAME. Alertas automáticos para owners downstream.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/data-governance/unity-catalog/data-lineage" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/data-governance/unity-catalog/data-lineage" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/data-governance/unity-catalog/data-lineage" },
        ],
      },
      {
        title: "Tags de status + descoberta de dados",
        detail:
          "Marque tabelas Gold como Verificadas via tags. Crie domínios curados. Adicione comentários em 100% das tabelas Gold/Silver.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/data-governance/unity-catalog/tags" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/data-governance/unity-catalog/tags" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/data-governance/unity-catalog/tags" },
        ],
      },
      {
        title: "Observabilidade unificada via System Tables",
        detail:
          "System Tables de jobs e lakeflow_events para observabilidade. Defina SLOs para pipelines críticos com alertas.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/admin/system-tables/jobs" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/admin/system-tables/jobs" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/admin/system-tables/jobs" },
        ],
      },
    ],
  },

  // ============================================================
  // 6. Segurança & Conformidade
  // ============================================================
  {
    key: "security",
    title: "Segurança & Conformidade",
    subtitle: "Identidade, secrets, networking, criptografia e auditoria.",
    weight: 0.12,
    questions: [
      {
        id: "identity",
        text: "Autenticação humana usa SSO + MFA obrigatório?",
        anchors: A(
          "Usuário/senha local sem MFA",
          "SSO opcional, MFA não obrigatório",
          "SSO obrigatório, MFA opcional",
          "SSO + MFA obrigatório para todos os humanos",
          "SSO + MFA + controles adicionais (bloqueio por geolocalização/IP)",
        ),
      },
      {
        id: "service_identities",
        text: "Identidades de serviço usam tokens de curta duração com rotação?",
        anchors: A(
          "Tokens pessoais compartilhados entre sistemas",
          "Tokens por service account mas sem rotação",
          "Service accounts com tokens rotacionados manualmente",
          "Service accounts com OAuth (client_credentials) e tokens curtos",
          "Service accounts via workload identity federation + tokens < 24h + auditoria de uso",
        ),
      },
      {
        id: "secrets",
        text: "Como secrets (credenciais, tokens) são armazenados?",
        anchors: A(
          "Em notebooks / variáveis de ambiente hardcoded",
          "Em arquivos .env / config no repositório",
          "Serviço de secrets da plataforma",
          "Serviço de secrets integrado com vault externo (KeyVault/Secrets Manager)",
          "Vault externo + rotação automática via CI/CD + zero secrets em código",
        ),
      },
      {
        id: "networking",
        text: "Acesso à plataforma é restrito via private networking?",
        anchors: A(
          "Acesso público de qualquer IP",
          "IP allowlist mas permissiva",
          "IP Access Lists restritivas configuradas",
          "VNet/VPC injection + Private Link para control plane",
          "VNet + Private Link + acesso via private endpoint + sem IPs públicos nos workers",
        ),
      },
      {
        id: "encryption",
        text: "Dados em repouso usam Customer-Managed Keys (CMK) onde necessário?",
        anchors: A(
          "Criptografia padrão do cloud provider apenas",
          "Criptografia ativa mas chaves gerenciadas pelo provider",
          "CMK em alguns datasets sensíveis",
          "CMK em todos os dados de alta criticidade",
          "CMK + rotação periódica + processo testado de revogação para incident response",
        ),
      },
      {
        id: "audit_security",
        text: "Existem regras automatizadas de detecção de anomalias de acesso?",
        anchors: A(
          "Sem auditoria de acessos",
          "Auditoria existe; ninguém olha regularmente",
          "Review manual de logs quando há suspeita",
          "Alertas básicos (login fora do horário, falhas repetidas)",
          "Detecção avançada e automática de comportamentos suspeitos",
        ),
      },
    ],
    recommendations: [
      {
        title: "Identity via IdP com SCIM",
        detail:
          "SSO SAML/OIDC com provedor de identidade corporativo e MFA. Grupos sincronizados via SCIM — nunca crie grupos manualmente. Princípio de menor privilégio.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/admin/users-groups/scim/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/admin/users-groups/scim/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/admin/users-groups/scim/index" },
        ],
      },
      {
        title: "OAuth token federation para automações",
        detail:
          "Workload identity federation elimina secrets estáticos. CI/CD troca tokens JWT por tokens OAuth Databricks. Service principals com federation policy específica.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/dev-tools/auth/oauth-federation" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/dev-tools/auth/oauth-federation" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/dev-tools/auth/oauth-federation" },
        ],
      },
      {
        title: "Gerenciamento de secrets",
        detail:
          "Databricks Secrets integrado com vault externo (Azure Key Vault, AWS Secrets Manager). Rotação automatizada via pipeline de CI/CD. Zero secrets em notebooks/configs.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/security/secrets/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/security/secrets/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/security/secrets/index" },
        ],
      },
      {
        title: "Private networking (PrivateLink / VNet Injection)",
        detail:
          "Workspace em VNet/VPC, sem IPs públicos nos workers. Private Link para control plane. Catálogo acessível apenas via private endpoint.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/security/network/classic/privatelink" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/security/network/classic/private-link-standard" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/security/network/classic/private-service-connect" },
        ],
      },
      {
        title: "Customer-Managed Keys (CMK)",
        detail:
          "Para dados altamente sensíveis (saúde, financeiro). CMK para storage e notebooks. Revogação da chave torna dados inacessíveis instantaneamente.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/security/keys/customer-managed-keys" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/security/keys/customer-managed-keys-managed-services-azure" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/security/keys/customer-managed-keys-managed-services-gcp" },
        ],
      },
      {
        title: "Auditoria contínua + compliance",
        detail:
          "Regras em audit logs via System Tables (download massivo, service account novo, queries sem LIMIT). Para regulações específicas, habilite perfis de compliance.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/admin/system-tables/audit-logs" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/admin/system-tables/audit-logs" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/admin/system-tables/audit-logs" },
        ],
      },
    ],
  },

  // ============================================================
  // 7. MLOps & Ciclo de Vida de Modelos
  // ============================================================
  {
    key: "mlops",
    title: "MLOps & Ciclo de Vida de Modelos",
    subtitle:
      "Rastreabilidade, promoção, feature store, monitoring e serving.",
    weight: 0.1,
    questions: [
      {
        id: "mlflow_tracking",
        text: "Experimentos têm rastreabilidade completa (parâmetros, métricas, dataset, código)?",
        anchors: A(
          "Sem tracking de experimentos",
          "Notebooks com prints/logs manuais",
          "Tracking ad-hoc em alguns projetos usando ferramentas de ML",
          "Auto-logging padrão; signature + log de inputs habilitados",
          "Tracking obrigatório por política + organização por team/project/model",
        ),
      },
      {
        id: "promotion",
        text: "Existe processo formal de promoção de modelos (dev → staging → prod)?",
        anchors: A(
          "Sem promoção formal — modelo vai direto pra prod",
          "Cópia manual de modelo entre ambientes",
          "Registry centralizado de modelos em uso",
          "Registry com aliases (champion/challenger) e governança integrada",
          "Promoção automatizada com gates (testes de performance, fairness, A/B shadow)",
        ),
      },
      {
        id: "feature_store",
        text: "Features são reutilizadas com consistência treino/inferência?",
        anchors: A(
          "Cada modelo recalcula suas features do zero",
          "Algumas features compartilhadas via tabelas",
          "Feature Store em projetos novos",
          "Feature Store na maioria dos modelos em produção",
          "Feature Store como padrão + lineage mostra modelo→features + sem training-serving skew",
        ),
      },
      {
        id: "monitoring_prod",
        text: "Modelos em produção têm monitoring de drift e degradação?",
        anchors: A(
          "Sem monitoring de modelos em produção",
          "Métricas customizadas manuais verificadas esporadicamente",
          "Monitoring habilitado em alguns modelos críticos",
          "Monitoring completo + alertas por SLA de degradação",
          "Monitoring + retrain automatizado quando drift ultrapassa threshold",
        ),
      },
      {
        id: "serving",
        text: "Decisão batch vs real-time está alinhada com requisitos de latência?",
        anchors: A(
          "Tudo batch independente do caso de uso",
          "Real-time via cluster sempre ligado (caro)",
          "Mix de batch + serving sem critério claro",
          "Critério documentado: batch para >1h, serving para <100ms",
          "Critério + múltiplos tiers (serverless + provisioned throughput onde necessário)",
        ),
      },
      {
        id: "genai",
        text: "Aplicações de IA Generativa / LLMs estão em produção com guardrails?",
        anchors: A(
          "Só POCs em playgrounds internos",
          "1 caso em produção sem avaliação sistemática",
          "Agentes com framework estruturado",
          "Framework + avaliação de LLMs + busca semântica",
          "Framework + avaliação contínua + versionamento de prompts + guardrails de custo (rate limits)",
        ),
      },
    ],
    recommendations: [
      {
        title: "MLflow Tracking como padrão",
        detail:
          "Auto-logging para frameworks populares (sklearn, pytorch, langchain). Sempre registre signature e dataset de input. Organize por team/project/model_name.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/mlflow/tracking" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/mlflow/tracking" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/mlflow/tracking" },
        ],
      },
      {
        title: "Unity Catalog Models + aliases",
        detail:
          "Registre todos os modelos no Unity Catalog. Use aliases (champion, challenger) ao invés de stages fixos para flexibilidade. Governança unificada.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/mlflow/models-in-uc" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/mlflow/models-in-uc" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/mlflow/models-in-uc" },
        ],
      },
      {
        title: "Feature Store para consistência",
        detail:
          "Features computadas uma vez, reutilizadas em batch e online. Garante consistência treino/inferência. Linhagem automática modelo→features no Unity Catalog.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/machine-learning/feature-store/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/machine-learning/feature-store/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/machine-learning/feature-store/index" },
        ],
      },
      {
        title: "Lakehouse Monitoring para inferência",
        detail:
          "Monitore tabelas de inferência → drift, degradação, distribuição de features. Alertas + trigger de retrain quando threshold atingido.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/lakehouse-monitoring/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/lakehouse-monitoring/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/lakehouse-monitoring/index" },
        ],
      },
      {
        title: "MLflow 3 para GenAI",
        detail:
          "MLflow Tracing para observabilidade end-to-end. Evaluation com scorers e LLM judges para qualidade. Agent Framework para construir agentes. Vector Search para RAG.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/mlflow3/genai/" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/mlflow3/genai/" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/mlflow3/genai/" },
        ],
      },
    ],
  },

  // ============================================================
  // 8. Plataforma & Self-Service
  // ============================================================
  {
    key: "platform",
    title: "Plataforma & Self-Service",
    subtitle: "Autonomia de analistas, descoberta de dados e time-to-productive.",
    weight: 0.08,
    questions: [
      {
        id: "sql_self_service",
        text: "Analistas conseguem explorar e consultar dados sem depender de engenheiros?",
        anchors: A(
          "Toda análise feita pelo time de dados sob demanda",
          "Pequeno grupo de analistas com acesso a SQL",
          "Ambientes SQL provisionados por solicitação ao time de plataforma",
          "SQL elástico self-service com políticas de governança",
          "SQL elástico como padrão + interface de linguagem natural para perguntas + dashboards self-service",
        ),
      },
      {
        id: "discovery_platform",
        text: "Existe um processo de descoberta de dados que funciona na prática?",
        anchors: A(
          "Conhecimento tribal — perguntar para quem sabe",
          "Wiki desatualizada com algumas informações",
          "Catálogo sem comentários na maioria das tabelas",
          "Catálogo com comentários + tags em tabelas Gold",
          "Catálogo completo + descoberta assistida + busca semântica + tags por domínio",
        ),
      },
      {
        id: "ai_bi",
        text: "Dashboards nativos da plataforma são padrão para visualizações internas?",
        anchors: A(
          "Tudo em ferramentas externas (Tableau/Power BI)",
          "Alguns dashboards experimentais na plataforma",
          "Dashboards nativos para novos projetos",
          "Dashboards nativos como padrão; versionados como código",
          "Dashboards nativos + assistente de linguagem natural integrado; dashboards como código",
        ),
      },
      {
        id: "onboarding",
        text: "Novos membros do time levam quanto tempo para estar produtivos?",
        anchors: A(
          "Mais de 1 mês",
          "2-4 semanas",
          "1-2 semanas",
          "Menos de 1 semana com onboarding documentado",
          "Menos de 2 dias via templates Git + políticas por persona + sandbox provisionado automaticamente",
        ),
      },
    ],
    recommendations: [
      {
        title: "SQL Serverless como padrão",
        detail:
          "Elimina gestão de warehouses, sem cold start longo. Pagamento por uso. Políticas limitam tamanho e custo por persona.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/compute/sql-warehouse/serverless" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/compute/sql-warehouse/serverless" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/compute/sql-warehouse/serverless" },
        ],
      },
      {
        title: "AI/BI Dashboards nativos",
        detail:
          "Dashboards próximos dos dados — sem exportar para ferramentas externas para casos internos. Versionados como código via Asset Bundles.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/dashboards/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/dashboards/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/dashboards/index" },
        ],
      },
      {
        title: "Genie - Interface de linguagem natural",
        detail:
          "Configure Genie Spaces por domínio. Analistas perguntam em linguagem natural e recebem SQL gerado. Reduz dependência de engenheiros.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/genie/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/genie/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/genie/index" },
        ],
      },
      {
        title: "Catálogo como portal de descoberta",
        detail:
          "Comentários em 100% das tabelas Gold/Silver. Tags por domínio, sensibilidade, caso de uso. Catálogo é o primeiro lugar de busca.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/comments/" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/comments/" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/comments/" },
        ],
      },
      {
        title: "Cluster Policies por persona",
        detail:
          "Políticas de compute: analyst-sql (apenas serverless), data-engineer (limitado + spot), ml-engineer (GPU + auto-term). Template Git para novo projeto.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/admin/clusters/policies" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/admin/clusters/policies" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/admin/clusters/policies" },
        ],
      },
    ],
  },

  // ============================================================
  // 9. Ingestão & Streaming
  // ============================================================
  {
    key: "ingestion",
    title: "Ingestão & Streaming",
    subtitle:
      "Padronização de frameworks, padrões arquiteturais (fan-in, fan-out, multi-hop), event time e late arrivals, CDC e backfill, observabilidade e SLAs.",
    weight: 0.08,
    questions: [
      {
        id: "ingestion_frameworks",
        text: "Quais frameworks são usados para ingestão (arquivos, bancos, mensageria, SaaS) e existe consistência entre as fontes?",
        anchors: A(
          "Mistura sem critério (Lakeflow Connect em algumas fontes, código próprio em outras, conectores legados em outras)",
          "Sem padrão; cada fonte é ingerida com código customizado em Spark nativo, mantido por cada equipe individualmente",
          "AutoLoader padronizado para arquivos; demais fontes ainda em código customizado ou conectores ad-hoc",
          "Lakeflow Connect para SaaS e bancos; AutoLoader dentro de Lakeflow SDP para arquivos; Structured Streaming em SDP para mensageria",
          "Hierarquia 'gerenciado > customizado' formalizada e enforçada via CoE; adicionar nova fonte é configuração, não escrita de código de ingestão",
        ),
      },
      {
        id: "streaming_patterns",
        text: "Os pipelines de streaming seguem padrões consistentes para fan-in, fan-out e multi-hop (medallion)?",
        anchors: A(
          "Cada pipeline tem arquitetura única; sem padrões reconhecíveis entre eles",
          "Medallion aplicado, mas sem padrão claro para consolidar (fan-in) ou demultiplexar fontes (fan-out)",
          "Fan-in via `append_flow` estabelecido; multi-hop com semântica clara por camada (bronze append-only, silver validado, gold agregado)",
          "Padrões documentados e treinados; bronze única como fonte da verdade, fan-out na silver via filtros, gold como materialized view",
          "Padrões formalizados em templates reutilizáveis via DABs; cada novo pipeline parte de um template conhecido",
        ),
      },
      {
        id: "event_time_late_arrivals",
        text: "Como o sistema lida com event time vs processing time e late arrivals (watermarks, janelas, estratégia para dados atrasados)?",
        anchors: A(
          "Tudo usa processing time; watermarks não são definidos; late events passam silenciosamente ou quebram pipelines",
          "Event time usado em algumas tabelas; sem estratégia explícita para dados que chegam fora de ordem",
          "Watermarks definidos com valor padrão único; janelas tumbling em agregações; late events são descartados",
          "Watermarks calibrados por fonte via análise histórica de atraso (p99 + margem); late arrivals roteados para quarentena",
          "Estratégia escolhida por workload (descartar, quarentena, stateful merge); SLA explícito de inclusão de late events documentado",
        ),
      },
      {
        id: "cdc_backfill",
        text: "Como CDC (mudanças de sistemas transacionais) e backfill (reprocessamento histórico) são tratados?",
        anchors: A(
          "CDC implementado manualmente via `MERGE` em SQL; backfill = reset do pipeline e reprocessamento completo do zero",
          "AUTO CDC em algumas tabelas; backfill ainda via full refresh manual disparado caso a caso",
          "Idempotência via `MERGE` com chave de negócio garantida em todos os writes customizados; backfill ensaiado em staging antes de prod",
          "Lakeflow Connect database connector para bancos; AUTO CDC para fontes de mensageria; backfill via dual pipeline em casos críticos",
          "CDC padronizado (Lakeflow Connect para bancos, AUTO CDC para mensageria); três padrões de backfill (Full Refresh, Dual Pipeline, Append+Correção) com critérios claros de uso",
        ),
      },
      {
        id: "observability_sla",
        text: "Como vocês detectam lag, falhas e degradação de freshness? Existe SLA por fonte e alertas proativos?",
        anchors: A(
          "Sem monitoramento sistemático; problemas descobertos quando consumidores reclamam",
          "Alertas básicos de falha de job; sem visibilidade de lag, throughput ou freshness",
          "Event log do Lakeflow SDP consultado pontualmente; alguns SQL Alerts configurados em tabelas críticas",
          "Dashboards de lag/throughput/freshness via system tables (`system.lakeflow.pipelines`, `system.lakeflow.jobs`); alertas SQL para lag elevado, pipeline parado e anomalia de volume",
          "SLA por fonte documentado no UC com flags `Verified`/`Deprecated`; alertas calibrados por severidade (PagerDuty/Slack); pós-mortem obrigatório em incidentes",
        ),
      },
    ],
    recommendations: [
      {
        title: "Auto Loader para ingestão incremental",
        detail:
          "Ingestão de S3/ADLS/GCS com tracking de arquivos. Schema inference + evolution + checkpointing nativo. Modo event-driven para não listar bucket inteiro.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/ingestion/cloud-object-storage/auto-loader/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/ingestion/cloud-object-storage/auto-loader/index" },
        ],
      },
      {
        title: "Delta Live Tables (DLT)",
        detail:
          "Pipelines como código declarativo Python/SQL. Expectations built-in. Linhagem automática no Unity Catalog. Event log consultável via SQL.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/delta-live-tables/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/delta-live-tables/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/delta-live-tables/index" },
        ],
      },
      {
        title: "CDC via APPLY CHANGES",
        detail:
          "API nativa de CDC no DLT. INSERT/UPDATE/DELETE/TRUNCATE. SCD Type 1 ou Type 2. Para fontes JDBC, considere Lakeflow Connect.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/delta-live-tables/cdc" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/delta-live-tables/cdc" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/delta-live-tables/cdc" },
        ],
      },
      {
        title: "Structured Streaming resiliente",
        detail:
          "Checkpoint em storage durável (S3/ADLS/GCS). Controle de throughput via maxFilesPerTrigger. Trigger incremental (availableNow) para reduzir custo.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/structured-streaming/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/structured-streaming/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/structured-streaming/index" },
        ],
      },
      {
        title: "Guia latência × custo",
        detail:
          "<1s: trigger contínuo (caro). 1-60s: trigger interval. 1-60min: availableNow/once. >1h: batch com Auto Loader.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/structured-streaming/triggers" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/structured-streaming/triggers" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/structured-streaming/triggers" },
        ],
      },
    ],
  },

  // ============================================================
  // 10. Resiliência & Disaster Recovery
  // ============================================================
  {
    key: "resilience",
    title: "Resiliência & Disaster Recovery",
    subtitle:
      "RTO/RPO definidos, versionamento de tabelas, replicação cross-region e teste de DR.",
    weight: 0.05,
    questions: [
      {
        id: "rto_rpo",
        text: "RTO e RPO estão definidos para pipelines e dados críticos?",
        anchors: A(
          "Sem definição de RTO/RPO",
          "RTO/RPO mencionados em política mas sem medição",
          "Definidos para alguns datasets críticos",
          "Definidos + monitorados regularmente",
          "Definidos + enforçados + ensaiados periodicamente",
        ),
      },
      {
        id: "time_travel",
        text: "Versionamento de tabelas tem retenção adequada para self-service recovery?",
        anchors: A(
          "Retenção padrão sem revisão",
          "Algumas tabelas com retenção customizada",
          "Retenção ≥30d em algumas tabelas críticas",
          "Retenção ≥30d em todas as tabelas críticas",
          "Retenção por criticidade documentada + configurações de retenção alinhadas",
        ),
      },
      {
        id: "replication",
        text: "Dados críticos têm replicação cross-region?",
        anchors: A(
          "Sem replicação — tudo em uma região",
          "Backup manual periódico para outra região",
          "Replicação do bucket para camada Bronze",
          "Replicação de storage + snapshots/cópias para camada Gold",
          "Replicação cross-region completa + catálogo configurado para apontar para storage replicado",
        ),
      },
      {
        id: "dr_test",
        text: "O plano de DR é testado periodicamente?",
        anchors: A(
          "Nunca testado",
          "Teste pontual ad-hoc quando alguém lembra",
          "Teste anual",
          "Teste semestral documentado",
          "Teste trimestral em ambiente DR warm com runbook documentado",
        ),
      },
    ],
    recommendations: [
      {
        title: "Delta Time Travel + retenção",
        detail:
          "Configure delta.logRetentionDuration e delta.deletedFileRetentionDuration adequados (ex: 30 dias para tabelas críticas). Permite RESTORE sem DR formal.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/delta/history" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/delta/history" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/delta/history" },
        ],
      },
      {
        title: "Backup por camada",
        detail:
          "Bronze: bucket com versionamento + cross-region replication do cloud. Silver/Gold: deep clones periódicos para storage alternativo. Modelos ML: registry + export periódico.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/delta/clone" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/delta/clone" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/delta/clone" },
        ],
      },
      {
        title: "Estratégia multi-workspace",
        detail:
          "Workspace prod em região primária. DR em região secundária warm (replicação ativa, sem workloads, custo baixo). Dev/staging isolado.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/admin/disaster-recovery" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/admin/disaster-recovery" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/admin/disaster-recovery" },
        ],
      },
      {
        title: "DR runbook + infra como código",
        detail:
          "Storage replicado para Tier 1. Catálogo apontando para storage replicado. Infra em DABs = recriável em <1h. Ensaio trimestral.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/dev-tools/bundles/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/dev-tools/bundles/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/dev-tools/bundles/index" },
        ],
      },
    ],
  },

  // ============================================================
  // 11. Organização, CoE & Modelo Operacional
  // ============================================================
  {
    key: "organization",
    title: "Organização, CoE & Modelo Operacional",
    subtitle:
      "Estrutura de times, padrões, capacitação e adoção de novas features.",
    weight: 0.03,
    questions: [
      {
        id: "coe_model",
        text: "Existe um time de plataforma de dados com guardrails definidos?",
        anchors: A(
          "Times de dados isolados sem coordenação",
          "Squad central tenta padronizar sem autoridade",
          "Platform Team + Domain Teams sem federação clara",
          "Platform + Domain Teams com modelo federado e guardrails",
          "CoE federado + padrões recomendados (paved road) + champions + retrospectivas regulares",
        ),
      },
      {
        id: "standards",
        text: "Boas práticas são documentadas e seguidas na prática?",
        anchors: A(
          "Conhecimento tribal apenas",
          "Wiki desatualizada",
          "ADRs (Architecture Decision Records) em alguns projetos",
          "ADRs no repo de plataforma + style guide definido",
          "ADRs + style guide + linters/checks automatizados + revisão arquitetural como gate",
        ),
      },
      {
        id: "onboarding_projects",
        text: "Novos projetos têm processo claro de onboarding?",
        anchors: A(
          "Cada projeto é completamente diferente",
          "Wiki com passos manuais desatualizada",
          "Formulário + provisionamento manual pelo platform team",
          "Provisionamento automatizado (catalog, schema, identidade, repo) via template",
          "Self-service via portal + checklist de go-live + auditoria automática",
        ),
      },
      {
        id: "training",
        text: "Existe programa de capacitação estruturado para o time?",
        anchors: A(
          "Cada um aprende sozinho",
          "Treinamentos esporádicos sem planejamento",
          "Cohort anual com algum treinamento formal",
          "Roadmap por persona (Eng. Dados, Cientista, Analista, Admin) + cohorts regulares",
          "Roadmap + cohorts + programa de champions + incentivos por capacitação + pipeline de adoção",
        ),
      },
      {
        id: "feature_adoption",
        text: "Como novas features e melhorias da plataforma são adotadas?",
        anchors: A(
          "Só quando são necessárias em produção urgente",
          "Algum engenheiro testa por iniciativa própria",
          "Platform Team avalia ad-hoc quando tem tempo",
          "Processo: sandbox → piloto com champions → template → rollout",
          "Processo estruturado + feedback loop com fornecedor + adoção contínua no template padrão",
        ),
      },
    ],
    recommendations: [
      {
        title: "Modelo federado com guardrails",
        detail:
          "Platform Team central define catálogo, políticas, networking, segurança, templates (paved road). Domain Teams responsáveis por pipelines, qualidade e SLAs próprios usando os padrões.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/lakehouse-architecture/index" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/lakehouse-architecture/index" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/lakehouse-architecture/index" },
        ],
      },
      {
        title: "Architecture Decision Records (ADRs)",
        detail:
          "Decisões importantes documentadas no repo Git da plataforma. Contexto, opções, decisão, consequências, data de revisão. Referência para novos membros.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/dev-tools/bundles/best-practices" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/dev-tools/bundles/best-practices" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/dev-tools/bundles/best-practices" },
        ],
      },
      {
        title: "Databricks Academy - Roadmap de capacitação",
        detail:
          "Data Engineers: fundamentals → avançado. DS/ML: fundamentals → avançado. Analysts: SQL e visualização. Admins: plataforma e segurança. Cohorts de 5-8 pessoas estudando juntas.",
        links: [
          { label: "Academy", href: "https://www.databricks.com/learn/training" },
        ],
      },
      {
        title: "Onboarding automatizado via DABs",
        detail:
          "Template de novo projeto em Asset Bundles (domínio, owner, SLA, classificação) → Platform Team provisiona catalog/schema/identidade/grupo/repo automaticamente.",
        links: [
          { label: "AWS", href: "https://docs.databricks.com/aws/en/dev-tools/bundles/templates" },
          { label: "Azure", href: "https://learn.microsoft.com/en-us/azure/databricks/dev-tools/bundles/templates" },
          { label: "GCP", href: "https://docs.databricks.com/gcp/en/dev-tools/bundles/templates" },
        ],
      },
      {
        title: "Programa de Champions",
        detail:
          "1-2 Data Champions por área de negócio. Referência técnica dentro do domínio. Acesso privilegiado a roadmap e features beta. Multiplicadores das boas práticas.",
        links: [
          { label: "Community", href: "https://community.databricks.com/" },
        ],
      },
    ],
  },
];

/**
 * Quick sanity check: weights must sum to 1.0.
 */
export function validateWeights(): void {
  const total = SESSIONS.reduce((sum, s) => sum + s.weight, 0);
  if (Math.abs(total - 1) > 0.001) {
    throw new Error(`Session weights must sum to 1.0, got ${total}`);
  }
}

export function getSession(key: string): Session {
  const s = SESSIONS.find((s) => s.key === key);
  if (!s) throw new Error(`Unknown session: ${key}`);
  return s;
}

export function findSession(key: string): Session | undefined {
  return SESSIONS.find((s) => s.key === key);
}

export const SESSION_COUNT = SESSIONS.length;
export const TOTAL_QUESTIONS = SESSIONS.reduce(
  (n, s) => n + s.questions.length,
  0,
);
