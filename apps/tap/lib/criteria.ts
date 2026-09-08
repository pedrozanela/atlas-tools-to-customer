/**
 * "Guiding Criteria" canvas catalog — collected before the AS-IS mapping.
 * Each item is rated 1–5 (1 = irrelevant, 5 = very important) so the
 * architect can prioritise the conversation around what the customer
 * actually cares about.
 *
 * `key` is the stable identifier persisted to UC (do not translate).
 * `label` is the user-facing text (English).
 */

export interface CriteriaItem {
  key: string;
  label: string;
}

export interface CriteriaCategory {
  key: string;
  title: string;
  items: CriteriaItem[];
}

export const CRITERIA_CATEGORIES: CriteriaCategory[] = [
  {
    key: "cost_reduction",
    title: "Cost Reduction",
    items: [
      { key: "infra_onp_to_cloud", label: "On-prem infra reduction (move to cloud)" },
      { key: "cloud_infra_cost", label: "Cloud infrastructure cost reduction" },
      { key: "components_migration", label: "Component cost reduction (migration)" },
      { key: "tech_refresh", label: "Technology refresh (upgrades)" },
      { key: "performance_improvement", label: "Performance improvement (reduced runtimes)" },
      { key: "efficient_scaling", label: "Efficient scaling (up / down)" },
    ],
  },
  {
    key: "innovation",
    title: "Innovation",
    items: [
      { key: "predictive_models", label: "Use of predictive models" },
      { key: "ml_deep_gpu", label: "Machine learning / deep learning (GPU)" },
      { key: "genai_llm", label: "Generative AI (LLM)" },
      { key: "streaming_nrt", label: "Streaming ingestion (near real-time)" },
      { key: "copilot_assistant", label: "Copilot — coding assistant" },
      { key: "industry_accelerators", label: "Industry use-case accelerators" },
    ],
  },
  {
    key: "integration",
    title: "Integration",
    items: [
      { key: "transactional_cloud", label: "Integration with transactional / cloud systems" },
      { key: "integration_cost", label: "Reuse / integration cost optimisation" },
      { key: "ecosystem_options", label: "Broad ecosystem of solutions" },
      { key: "data_apis_sharing", label: "Data and API sharing" },
    ],
  },
  {
    key: "risk_reduction",
    title: "Risk Reduction",
    items: [
      { key: "downtime_failures", label: "Reduce downtime / failures" },
      { key: "security_lgpd", label: "Improved security and privacy compliance" },
      { key: "fraud_loss", label: "Reduce losses / breakage / fraud" },
      { key: "vendor_lockin", label: "Reduce vendor lock-in" },
    ],
  },
  {
    key: "business_enablement",
    title: "Business Enablement",
    items: [
      { key: "data_driven_culture", label: "Data-driven culture" },
      { key: "data_democratization", label: "Data democratization" },
      { key: "team_collaboration", label: "Collaboration across data teams" },
      { key: "business_integration", label: "Integration with business solutions" },
      { key: "gtm_cicd", label: "GTM — go-to-market agility (CI / CD)" },
      { key: "new_use_cases", label: "Enable new business use cases" },
      { key: "competitive_arch", label: "Architecture competitive with peers" },
      { key: "reference_cases", label: "Reference cases (emerging topics, e.g. OpenFinance)" },
    ],
  },
  {
    key: "operational_efficiency",
    title: "Operational Efficiency",
    items: [
      { key: "architecture_simplification", label: "Architecture simplification" },
      { key: "data_lake_unification", label: "Data lake unification (silos)" },
      { key: "data_governance", label: "Data governance" },
      { key: "observability_dq", label: "Observability and data quality" },
      { key: "accelerators_docs", label: "Accelerators and docs (community)" },
      { key: "team_productivity", label: "Data team productivity" },
      { key: "iac_terraform", label: "Infrastructure as code (Terraform)" },
      { key: "learning_curve", label: "Learning curve for practitioners" },
      { key: "legacy_compat", label: "Compatibility with legacy technologies" },
    ],
  },
];

export const ALL_CRITERIA_KEYS: string[] = CRITERIA_CATEGORIES.flatMap((c) =>
  c.items.map((i) => i.key),
);
