export interface AtlasTourStep {
  id: string;
  route: string;
  target: string | null;
  title: string;
  body: string;
  hint?: string;
}

export interface AtlasTourJourney {
  id: string;
  title: string;
  description: string;
  group: "Visão geral" | "Discovery" | "Governança & Valor";
  steps: AtlasTourStep[];
}

export const ATLAS_TOUR_JOURNEYS: AtlasTourJourney[] = [
  {
    id: "atlas",
    title: "Conhecer todo o Atlas",
    description: "Passe pela estrutura da solução e descubra quando usar cada módulo.",
    group: "Visão geral",
    steps: [
      {
        id: "atlas-home",
        route: "/",
        target: "atlas-home-header",
        title: "Bem-vindo ao Atlas",
        body: "O Atlas organiza a conversa com o cliente em quatro frentes: discovery, governança e prontidão, aceleração de IA e valor, e ferramentas técnicas.",
        hint: "Você pode refazer esta jornada a qualquer momento pelo botão Guia Atlas.",
      },
      {
        id: "atlas-discovery",
        route: "/",
        target: "atlas-discovery",
        title: "1 · Discovery",
        body: "Comece aqui para mapear a arquitetura atual e medir a maturidade de Dados & IA. É a entrada recomendada quando o problema ainda precisa ser estruturado.",
      },
      {
        id: "atlas-discovery-modules",
        route: "/discovery",
        target: "atlas-section-grid",
        title: "Escolha o diagnóstico",
        body: "TAP registra arquitetura e critérios estratégicos. Maturity Assessment mede práticas, cria versões por dimensão e produz recomendações priorizadas.",
        hint: "Há jornadas detalhadas para os dois módulos no seletor do guia.",
      },
      {
        id: "atlas-tap",
        route: "/tap?view=list",
        target: "tap-list",
        title: "TAP · mapa do AS-IS",
        body: "Use o TAP para registrar critérios do negócio, tecnologias atuais e o desenho AS-IS. Submissões anteriores ficam disponíveis para consulta e comparação.",
      },
      {
        id: "atlas-maturity",
        route: "/maturity",
        target: "maturity-home",
        title: "Maturity · diagnóstico evolutivo",
        body: "Avalie dimensões de Data & AI, mantenha múltiplas versões e gere um relatório ponderado com recomendações concretas.",
      },
      {
        id: "atlas-inference",
        route: "/",
        target: "atlas-inference",
        title: "2 · Governance & Readiness",
        body: "Depois do diagnóstico, defina o modelo operacional, valide guardrails técnicos e planeje o enablement necessário para escalar a plataforma.",
      },
      {
        id: "atlas-inference-modules",
        route: "/inference",
        target: "atlas-section-grid",
        title: "Modelo, guardrails e prontidão",
        body: "Operating Model esclarece papéis e responsabilidades. WAF mede boas práticas técnicas. People & Training transforma o plano de enablement em trilhas, simulados e progresso mensurável.",
      },
      {
        id: "atlas-operating-model",
        route: "/operating-model",
        target: "operating-model-overview",
        title: "Operating Model",
        body: "Conecte o mandato do CoE a papéis, building blocks, camadas da plataforma e responsabilidades por capacidade.",
      },
      {
        id: "atlas-waf",
        route: "/waf",
        target: "waf-assessment",
        title: "WAF Assessment",
        body: "Execute uma avaliação do workspace contra o Databricks Well-Architected Framework e transforme gaps em ações priorizadas.",
      },
      {
        id: "atlas-people",
        route: "/inference",
        target: "atlas-module-people",
        title: "People & Training",
        body: "Conecte prontidão organizacional a trilhas de aprendizagem, simulados de certificação e acompanhamento do progresso de cada participante.",
        hint: "O módulo possui um guia próprio para percorrer Programa, Rotas, Simulados, IA e Histórico.",
      },
      {
        id: "atlas-acceleration",
        route: "/",
        target: "atlas-acceleration",
        title: "3 · AI & Value Acceleration",
        body: "Transforme contexto de negócio e metadados governados em casos de uso, experiências Genie e valor mensurável.",
      },
      {
        id: "atlas-acceleration-modules",
        route: "/acceleration",
        target: "atlas-section-grid",
        title: "Da oportunidade ao valor",
        body: "Forge descobre, prioriza e acompanha casos de uso. Genie Workbench oferece uma referência externa para autoria e benchmark de Genie Spaces.",
      },
      {
        id: "atlas-forge",
        route: "/forge",
        target: "forge-main-content",
        title: "Forge",
        body: "Descubra casos de uso com IA, analise o estate, crie e melhore Genie Spaces e acompanhe o valor entregue em um fluxo integrado.",
      },
      {
        id: "atlas-profilers",
        route: "/",
        target: "atlas-profilers",
        title: "4 · Profilers & Tools",
        body: "Use ferramentas especializadas quando o diagnóstico exigir uma análise técnica específica ou uma aceleração complementar.",
      },
      {
        id: "atlas-lakebridge",
        route: "/profilers",
        target: "atlas-section-grid",
        title: "Ferramentas complementares",
        body: "Lakebridge apoia a modernização de workloads legados. Microsoft Migration Factory ficará disponível aqui para acelerar jornadas originadas na plataforma Microsoft.",
        hint: "Links marcados como externos saem do Atlas e não interrompem o seu progresso aqui.",
      },
    ],
  },
  {
    id: "tap",
    title: "TAP · Arquitetura AS-IS",
    description: "Crie um mapeamento, priorize critérios e registre a arquitetura atual.",
    group: "Discovery",
    steps: [
      {
        id: "tap-list",
        route: "/tap?view=list",
        target: "tap-list",
        title: "Comece por uma submissão",
        body: "Abra um mapeamento anterior para consulta ou clique em New TAP para iniciar um novo levantamento.",
      },
      {
        id: "tap-criteria",
        route: "/tap?view=creating&step=criteria",
        target: "tap-criteria",
        title: "1 · Priorize os critérios",
        body: "Avalie de 1 a 5 os direcionadores estratégicos. Eles ajudam o arquiteto a ordenar a conversa e dar peso ao roadmap futuro.",
      },
      {
        id: "tap-criteria-next",
        route: "/tap?view=creating&step=criteria",
        target: "tap-criteria-actions",
        title: "Avance para o inventário",
        body: "Não é obrigatório pontuar todos os itens. Quando o contexto estiver suficiente, avance para o canvas AS-IS.",
      },
      {
        id: "tap-canvas",
        route: "/tap?view=creating&step=asis",
        target: "tap-canvas",
        title: "2 · Monte o AS-IS",
        body: "Selecione o cloud provider e registre as ferramentas por camada. O canvas organiza visualmente o ambiente atual para a discussão arquitetural.",
      },
      {
        id: "tap-submit",
        route: "/tap?view=creating&step=asis",
        target: "tap-submit",
        title: "Salve e compartilhe o mapa",
        body: "Revise as escolhas e envie o AS-IS. O resultado ficará na lista inicial para reabertura e uso nas próximas conversas.",
      },
    ],
  },
  {
    id: "maturity",
    title: "Maturity Assessment",
    description: "Preencha dimensões, versione respostas e gere o relatório de maturidade.",
    group: "Discovery",
    steps: [
      {
        id: "maturity-home",
        route: "/maturity",
        target: "maturity-home",
        title: "Entenda a avaliação",
        body: "A avaliação combina dimensões ponderadas, perguntas em escala de maturidade e recomendações práticas.",
      },
      {
        id: "maturity-sections",
        route: "/maturity/assessment",
        target: "maturity-sections",
        title: "Escolha uma dimensão",
        body: "Preencha as dimensões na ordem que fizer sentido. O status mostra o que já tem versão e qual foi a pontuação mais recente.",
      },
      {
        id: "maturity-form",
        route: "/maturity/assessment/finops",
        target: "maturity-form",
        title: "Responda com evidência",
        body: "Informe sua identificação e selecione o nível que melhor descreve a prática atual. Use notas para registrar ressalvas e contexto.",
      },
      {
        id: "maturity-save",
        route: "/maturity/assessment/finops",
        target: "maturity-form-actions",
        title: "Rascunho ou nova versão",
        body: "Salve um rascunho para continuar depois ou envie a seção. Um novo envio cria outra versão sem apagar o histórico.",
      },
      {
        id: "maturity-report",
        route: "/maturity/report",
        target: "maturity-report",
        title: "Monte o relatório",
        body: "Escolha qual versão de cada dimensão representa o cenário e gere o relatório com score ponderado e recomendações.",
      },
    ],
  },
  {
    id: "operating-model",
    title: "Operating Model",
    description: "Navegue por arquétipos, papéis, capacidades e responsabilidades.",
    group: "Governança & Valor",
    steps: [
      {
        id: "operating-overview",
        route: "/operating-model",
        target: "operating-model-overview",
        title: "Conecte estratégia e plataforma",
        body: "A visão geral mostra como CoE, gestão operacional e a Data Intelligence Platform se conectam.",
      },
      {
        id: "operating-archetypes",
        route: "/operating-model#modelo",
        target: "operating-archetypes",
        title: "Escolha o arquétipo",
        body: "Compare estruturas centralizadas, federadas e distribuídas considerando velocidade, autonomia e maturidade organizacional.",
      },
      {
        id: "operating-roles",
        route: "/operating-model#papeis",
        target: "operating-roles",
        title: "Defina os donos",
        body: "Os oito papéis deixam explícito quem define políticas, gerencia, opera e consome cada capacidade.",
      },
      {
        id: "operating-building-blocks",
        route: "/operating-model#coe",
        target: "operating-building-blocks",
        title: "Estruture as entregas do CoE",
        body: "Use os seis building blocks para identificar entregáveis, donos primários e lacunas de execução.",
      },
      {
        id: "operating-matrix",
        route: "/operating-model#matriz",
        target: "operating-matrix",
        title: "Consulte a matriz",
        body: "Filtre por papel, camada ou capacidade para entender responsabilidades de política, gestão, operação e consumo.",
      },
      {
        id: "operating-journey",
        route: "/operating-model#atlas-journey",
        target: "operating-atlas-journey",
        title: "Transforme o diagnóstico em plano",
        body: "A jornada final conecta TAP, Maturity, WAF e Forge em uma sequência de descoberta, decisão e evolução contínua.",
      },
    ],
  },
  {
    id: "waf",
    title: "WAF Assessment",
    description: "Avalie o workspace, investigue gaps e converta achados em ações.",
    group: "Governança & Valor",
    steps: [
      {
        id: "waf-intro",
        route: "/waf",
        target: "waf-assessment",
        title: "Avalie a arquitetura",
        body: "O WAF consulta sinais do workspace e compara o ambiente com os pilares do Databricks Well-Architected Framework.",
      },
      {
        id: "waf-run",
        route: "/waf",
        target: "waf-run",
        title: "Execute ou atualize a avaliação",
        body: "Rode a avaliação para criar um snapshot. Reexecute depois de mudanças para medir evolução e drift.",
        hint: "A execução pode levar alguns segundos enquanto consulta as tabelas de sistema.",
      },
      {
        id: "waf-score",
        route: "/waf",
        target: "waf-score",
        title: "Leia o score",
        body: "Comece pelo score geral e depois compare os pilares. Controles qualitativos aparecem separados dos sinais automáticos.",
      },
      {
        id: "waf-controls",
        route: "/waf",
        target: "waf-controls",
        title: "Investigue os controles",
        body: "A aba de falhas prioriza o que não atingiu o threshold. Use as abas dos pilares, respostas qualitativas, ignorados e histórico para aprofundar.",
      },
      {
        id: "waf-actions",
        route: "/waf",
        target: "waf-actions",
        title: "Transforme gaps em ações",
        body: "Abra recomendações, siga a documentação ou use um engine do Forge quando houver uma correção assistida disponível.",
      },
      {
        id: "waf-export",
        route: "/waf",
        target: "waf-header-actions",
        title: "Compartilhe e acompanhe",
        body: "Exporte CSV/PDF, abra os ativos analíticos e use o histórico para comparar avaliações ao longo do tempo.",
      },
    ],
  },
  {
    id: "people",
    title: "People & Training",
    description: "Conheça a jornada completa de capacitação e preparação para certificações.",
    group: "Governança & Valor",
    steps: [
      {
        id: "people-entry",
        route: "/inference",
        target: "atlas-module-people",
        title: "Transforme enablement em uma jornada mensurável",
        body: "People & Training reúne programa, trilhas oficiais, simulados, flashcards, estudo com IA e histórico em uma experiência integrada de aprendizagem.",
        hint: "No próximo passo, o Atlas abrirá o módulo e transferirá o controle para o guia detalhado de People & Training.",
      },
      {
        id: "people-native-guide",
        route: "/people/?atlas_guide=1",
        target: null,
        title: "Continue no guia de People & Training",
        body: "O onboarding do próprio módulo mostrará Programa, Rotas, Simulados, estudo com IA, Histórico e preferências do participante.",
      },
    ],
  },
  {
    id: "forge",
    title: "Forge · Descoberta de valor",
    description: "Do contexto de negócio aos casos de uso, Genie e valor realizado.",
    group: "Governança & Valor",
    steps: [
      {
        id: "forge-home",
        route: "/forge",
        target: "forge-main-content",
        title: "Seu cockpit de descoberta",
        body: "O dashboard resume runs, estate e oportunidades. Use-o para retomar trabalhos e acompanhar a atividade recente.",
      },
      {
        id: "forge-navigation",
        route: "/forge",
        target: "forge-navigation",
        title: "Navegue pelos fluxos",
        body: "O menu agrupa descoberta, Genie, estate, business value e administração. Recursos opcionais aparecem quando estão habilitados.",
      },
      {
        id: "forge-configure",
        route: "/forge/configure",
        target: "forge-page-header",
        title: "1 · Configure uma discovery",
        body: "Defina o contexto de negócio, escopo do Unity Catalog e profundidade. O pipeline extrai metadados e gera casos de uso priorizados.",
      },
      {
        id: "forge-runs",
        route: "/forge/runs",
        target: "forge-page-header",
        title: "2 · Acompanhe os runs",
        body: "Consulte status, resultados e histórico. Runs concluídos permitem comparar oportunidades, SQL e recomendações.",
      },
      {
        id: "forge-estate",
        route: "/forge/environment",
        target: "forge-main-content",
        title: "3 · Entenda o data estate",
        body: "Faça scans, investigue tabelas, lineage, governança e qualidade. AI Comments ajuda a melhorar a documentação para consumo e Genie.",
      },
      {
        id: "forge-genie",
        route: "/forge/genie",
        target: "forge-page-header",
        title: "4 · Crie e melhore Genie Spaces",
        body: "Sincronize spaces, analise saúde, crie a partir de schemas ou requisitos e use benchmarks para melhorar a qualidade.",
      },
      {
        id: "forge-value",
        route: "/forge/business-value",
        target: "forge-page-header",
        title: "5 · Conecte oportunidade e valor",
        body: "Quantifique benefícios, monte roadmap, mapeie stakeholders e acompanhe o valor realizado dos casos de uso.",
      },
      {
        id: "forge-assistant",
        route: "/forge/ask-forge",
        target: "forge-main-content",
        title: "Pergunte ao Forge",
        body: "Use o assistente para explorar o contexto já descoberto, localizar ativos e acelerar ações sem perder rastreabilidade.",
        hint: "O Ask Forge aparece quando busca semântica e embeddings estão habilitados.",
      },
    ],
  },
];

export function getAtlasTourJourney(id: string): AtlasTourJourney | undefined {
  return ATLAS_TOUR_JOURNEYS.find((journey) => journey.id === id);
}
