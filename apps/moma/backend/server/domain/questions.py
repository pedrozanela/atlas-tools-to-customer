"""
Questionario do assessment.

Cada questao e um cenario com 4 opcoes mapeadas aos estagios de maturidade
(1=Reativo, 2=Inicial, 3=Definido, 4=Coordenado), no estilo do diagnostico de
referencia. Cada questao e classificada por:
  - area:          persona respondente (ver framework.AREAS)
  - function:      funcao de dados DAMA (ver framework.FUNCTIONS)
  - dimension:     pessoas | processos | tecnologia
  - mesh_principle: principio de Data Mesh relacionado (opcional)
  - weight:        peso relativo na media (default 1.0)

No frontend, alem das 4 opcoes, o respondente sempre pode marcar
"Nao sei / Nao se aplica", que e registrado como resposta nula e excluido do calculo.
"""

from __future__ import annotations


def _q(id, area, function, dimension, text, opts, mesh_principle=None, weight=1.0):
    return {
        "id": id,
        "area": area,
        "function": function,     # funcao PRIMARIA (dona da remediacao)
        "dimension": dimension,   # dimensao PRIMARIA
        # dimensions/functions completas sao preenchidas abaixo (primaria + secundarias)
        "dimensions": [dimension],
        "functions": [function],
        "mesh_principle": mesh_principle,
        "weight": weight,
        "text": text,
        "options": [{"level": i + 1, "text": t} for i, t in enumerate(opts)],
    }


QUESTIONS = [
    # ------------------------------------------------------------------ #
    # AREA: Lideranca / Patrocinio
    # ------------------------------------------------------------------ #
    _q("LID01", "lideranca", "governanca", "pessoas",
       "Como está o patrocínio executivo para as iniciativas de dados?",
       ["Não há patrocínio; iniciativas isoladas sem sponsor claro.",
        "Patrocinador único, no nível de uma diretoria ou gerência sênior.",
        "Dois ou mais patrocinadores atuantes em diferentes diretorias.",
        "Programa patrocinado por VPs/C-level, com dados na estratégia corporativa."]),
    _q("LID02", "lideranca", "governanca", "processos",
       "Existe uma estratégia de dados (e IA) definida?",
       ["Não existe estratégia de dados documentada.",
        "Estratégia em rascunho, restrita ao time de TI.",
        "Estratégia definida e comunicada às principais áreas.",
        "Estratégia de dados/IA integrada ao planejamento corporativo e revisada periodicamente."]),
    _q("LID03", "lideranca", "governanca", "pessoas",
       "Como está estruturada a organização de dados (CDO / Data Office)?",
       ["Não há função ou estrutura dedicada a dados.",
        "Papel de dados acumulado por alguém de TI.",
        "Existe um Data Office / CDO com equipe pequena.",
        "Estrutura de governança federada com comitê e representantes dos domínios."],
       mesh_principle="federated_governance"),
    _q("LID04", "lideranca", "operacoes", "processos",
       "Como é o financiamento das iniciativas de dados?",
       ["Sem orçamento dedicado a dados/governança.",
        "Orçamento pontual, por projeto.",
        "Orçamento anual dedicado à plataforma e governança.",
        "Investimento contínuo com ROI/valor de negócio acompanhado."]),
    _q("LID05", "lideranca", "arquitetura", "pessoas",
       "Qual o modelo operacional de dados (quem é dono dos dados)?",
       ["Tudo depende de um time central de TI; áreas sem autonomia.",
        "Time central atende via demandas; pouca autonomia das áreas.",
        "Áreas começam a ter responsabilidade sobre seus dados, com apoio central.",
        "Domínios de negócio são donos de seus dados como produtos, sobre plataforma central self-service."],
       mesh_principle="domain_ownership"),
    _q("LID06", "lideranca", "governanca", "pessoas",
       "Como é a cultura de decisão baseada em dados?",
       ["Decisões majoritariamente por intuição e planilhas isoladas.",
        "Alguns relatórios, mas baixa confiança nos dados.",
        "Decisões apoiadas em dados em várias áreas.",
        "Cultura data-driven disseminada; dados/IA como vantagem competitiva."]),
    _q("LID07", "lideranca", "metadados", "processos",
       "Como a liderança enxerga o valor dos dados?",
       ["Dados vistos como subproduto de sistemas, sem noção de valor.",
        "Reconhece-se valor, mas sem tratar dados como ativo/produto.",
        "Iniciativas de tratar dados como ativo; primeiros produtos de dados.",
        "Portfólio de produtos de dados com valor medido e reúso entre domínios."],
       mesh_principle="data_as_product"),

    # ------------------------------------------------------------------ #
    # AREA: Governanca / Data Office
    # ------------------------------------------------------------------ #
    _q("GOV01", "governanca_office", "governanca", "processos",
       "Qual o estágio das políticas de dados?",
       ["Não existem políticas de dados formais.",
        "Poucas políticas, restritas a segurança/backup.",
        "Conjunto de políticas (classificação, retenção, uso) publicado.",
        "Políticas versionadas, aplicadas de forma automatizada e auditadas."]),
    _q("GOV02", "governanca_office", "governanca", "pessoas",
       "Papéis de data owner e data steward estão definidos?",
       ["Não há owners/stewards definidos.",
        "Responsabilidades informais, sem formalização.",
        "Owners e stewards definidos para os principais domínios.",
        "Papéis formalizados em todos os domínios, com RACI e workflow em ferramenta."]),
    _q("GOV03", "governanca_office", "metadados", "tecnologia",
       "Existe um catálogo de dados corporativo?",
       ["Não há catálogo; conhecimento na cabeça das pessoas.",
        "Planilhas/wikis dispersos fazendo as vezes de catálogo.",
        "Catálogo corporativo implantado para parte dos dados.",
        "Catálogo unificado, com busca, tags e linhagem automatizada para todos os dados."],
       mesh_principle="data_as_product"),
    _q("GOV04", "governanca_office", "metadados", "processos",
       "Como está a linhagem e o dicionário de dados?",
       ["Sem linhagem nem dicionário de dados.",
        "Linhagem manual e parcial.",
        "Linhagem e documentação para os pipelines críticos.",
        "Linhagem ponta a ponta automatizada, inclusive em nível de coluna."]),
    _q("GOV05", "governanca_office", "qualidade", "processos",
       "Existe um programa de qualidade de dados?",
       ["Qualidade tratada de forma reativa (só quando quebra).",
        "Correções pontuais, sem regras definidas.",
        "Regras de qualidade definidas e medidas para dados críticos.",
        "Monitoramento contínuo com SLAs e alertas por produto de dado."],
       mesh_principle="data_as_product"),
    _q("GOV06", "governanca_office", "dados_mestres", "processos",
       "Como são geridos os dados mestres e de referência?",
       ["Conceito de dado mestre não compreendido; múltiplos cadastros redundantes.",
        "Reconhece-se o problema, sem solução de MDM.",
        "Domínios mestres principais definidos com owners.",
        "Base única por conceito mestre, consumida em tempo real e governada."]),
    _q("GOV07", "governanca_office", "governanca", "processos",
       "Como é exercida a governança de dados?",
       ["Governança inexistente ou 100% centralizada e manual.",
        "Governança central tenta controlar tudo, gerando gargalos.",
        "Padrões centrais somados ao início de responsabilidade nos domínios.",
        "Governança federada computacional: padrões globais aplicados automaticamente, com autonomia local."],
       mesh_principle="federated_governance"),
    _q("GOV08", "governanca_office", "privacidade", "processos",
       "Os riscos relacionados a dados são geridos?",
       ["Riscos de dados não são mapeados.",
        "Apenas riscos de segurança/privacidade são mapeados.",
        "Riscos de qualidade e governança mapeados para dados críticos.",
        "Gestão de riscos de dados integrada e monitorada corporativamente."]),

    # ------------------------------------------------------------------ #
    # AREA: Plataforma / Engenharia de Dados
    # ------------------------------------------------------------------ #
    _q("PLT01", "plataforma", "arquitetura", "tecnologia",
       "Qual a plataforma de dados analítica atual?",
       ["Dados espalhados em bancos/planilhas/ERPs, sem plataforma analítica.",
        "Data warehouse ou data lake isolado, com integrações frágeis.",
        "Plataforma analítica consolidada (lakehouse/DW) para a maioria das cargas.",
        "Lakehouse unificado e governado, multi-workload (ETL, BI, ML, streaming)."]),
    _q("PLT02", "plataforma", "operacoes", "tecnologia",
       "Como são construídos os pipelines de dados?",
       ["Ingestão manual e scripts avulsos.",
        "Alguns ETLs agendados, difíceis de manter.",
        "Pipelines padronizados e versionados para dados críticos.",
        "Pipelines declarativos com CI/CD, testes e observabilidade."]),
    _q("PLT03", "plataforma", "operacoes", "processos",
       "Como é feito o provisionamento de ambientes?",
       ["Ambientes criados manualmente, sem padrão.",
        "Provisionamento por chamado ao time central (lento).",
        "Templates / IaC para provisionar ambientes.",
        "Self-service: domínios provisionam ambientes governados sob demanda."],
       mesh_principle="self_serve"),
    _q("PLT04", "plataforma", "operacoes", "tecnologia",
       "Como são controlados os custos da plataforma de dados?",
       ["Custos de dados desconhecidos e sem controle.",
        "Custos visíveis, mas sem otimização.",
        "Monitoramento de custo por área e otimizações pontuais.",
        "FinOps de dados: custo por domínio/produto, serverless e otimização contínua."]),
    _q("PLT05", "plataforma", "arquitetura", "tecnologia",
       "Como estão organizados os ambientes/workspaces?",
       ["Tudo em um único ambiente compartilhado, sem isolamento.",
        "Poucos ambientes, com separação manual e frágil.",
        "Ambientes segregados por área/finalidade, com padrões.",
        "Topologia de workspaces por domínio, com padrões e governança central."],
       mesh_principle="self_serve"),
    _q("PLT06", "plataforma", "operacoes", "tecnologia",
       "Qual a capacidade de processamento em tempo real?",
       ["Apenas processamento batch/manual.",
        "Batch agendado, sem tempo real.",
        "Alguns casos de streaming / near real-time.",
        "Streaming como padrão onde faz sentido, unificado com batch."]),
    _q("PLT07", "plataforma", "operacoes", "tecnologia",
       "Existe observabilidade de dados e pipelines?",
       ["Sem monitoramento de pipelines/dados.",
        "Monitoramento básico de falha de job.",
        "Observabilidade de pipelines e SLAs para dados críticos.",
        "Observabilidade ponta a ponta (freshness, volume, schema, qualidade) com alertas."]),
    _q("PLT08", "plataforma", "qualidade", "tecnologia",
       "Como a qualidade dos dados é verificada nos pipelines?",
       ["Sem verificação de qualidade nos pipelines.",
        "Checagens manuais e pontuais.",
        "Testes de qualidade automatizados para os dados críticos.",
        "Expectativas de qualidade automatizadas nos pipelines, com monitoramento contínuo."]),

    # ------------------------------------------------------------------ #
    # AREA: Arquitetura de Dados
    # ------------------------------------------------------------------ #
    _q("ARQ01", "arquitetura_area", "arquitetura", "processos",
       "Existe documentação de arquitetura de dados?",
       ["Não há documentação de arquitetura de dados.",
        "Documentação desatualizada ou parcial.",
        "Diagramas de alto nível para os principais fluxos.",
        "Arquitetura corporativa documentada, mantida e acessível a todos."]),
    _q("ARQ02", "arquitetura_area", "arquitetura", "processos",
       "Existe um padrão arquitetural por camadas (ex.: medallion)?",
       ["Sem padrão de camadas; dados brutos misturados com consumo.",
        "Alguma separação, mas inconsistente.",
        "Camadas padronizadas (ex.: bronze/silver/gold) para dados críticos.",
        "Arquitetura em camadas padronizada e aplicada em todos os domínios."]),
    _q("ARQ03", "arquitetura_area", "modelagem", "processos",
       "Como é feita a modelagem de dados?",
       ["Sem modelagem; estruturas criadas ad-hoc.",
        "Modelagem pontual em alguns sistemas.",
        "Padrões de modelagem para dados críticos.",
        "Modelagem padronizada com reúso (dimensional/por domínio conforme o caso)."]),
    _q("ARQ04", "arquitetura_area", "arquitetura", "tecnologia",
       "Como está a integração de dados e os silos?",
       ["Muitos silos; integrações ponto a ponto frágeis.",
        "Algumas integrações centralizadas, muitos silos ainda.",
        "Integração via plataforma central para a maioria dos dados.",
        "Dados integrados/compartilhados entre domínios sem cópia (data sharing)."]),
    _q("ARQ05", "arquitetura_area", "arquitetura", "tecnologia",
       "A arquitetura é orientada a domínios de dados?",
       ["Arquitetura monolítica, organizada por sistema/tecnologia.",
        "Organização por área funcional, não por domínio de dados.",
        "Começo de organização por domínios de dados.",
        "Arquitetura orientada a domínios de dados, com contratos entre domínios."],
       mesh_principle="domain_ownership"),
    _q("ARQ06", "arquitetura_area", "metadados", "processos",
       "Existem padrões de interoperabilidade e nomenclatura?",
       ["Sem padrões de nomenclatura/formato.",
        "Padrões informais, não seguidos.",
        "Padrões de nomenclatura e interoperabilidade definidos.",
        "Padrões globais aplicados automaticamente (schemas, tags, contratos)."],
       mesh_principle="federated_governance"),
    _q("ARQ07", "arquitetura_area", "arquitetura", "tecnologia",
       "Como são tratados os dados que estão fora da plataforma analítica?",
       ["Muitos dados presos em sistemas, sem acesso analítico.",
        "Cópias e ETLs para trazer tudo, gerando redundância.",
        "Estratégia para integrar as principais fontes externas.",
        "Federação de consultas a fontes externas sob governança única, sem mover dados."]),
    _q("ARQ08", "arquitetura_area", "modelagem", "processos",
       "Existe gestão de contratos de dados e evolução de schema?",
       ["Não há contratos; mudanças de schema quebram consumidores sem aviso.",
        "Mudanças comunicadas informalmente, sem versionamento.",
        "Contratos/versionamento de schema para os dados críticos.",
        "Contratos de dados versionados por produto, com compatibilidade garantida."],
       mesh_principle="data_as_product"),
    _q("ARQ09", "arquitetura_area", "dados_mestres", "tecnologia",
       "Como é a arquitetura dos dados mestres (ex.: cadastro de clientes)?",
       ["Cada aplicação mantém seu próprio cadastro, tratado depois de forma reativa.",
        "Existe um cadastro central, mas alimentado em lote e com divergências.",
        "Base mestre definida para os principais conceitos, consultada pela maioria dos sistemas.",
        "Base única por conceito mestre, consultada em tempo real por todas as aplicações."]),

    # ------------------------------------------------------------------ #
    # AREA: Seguranca & Privacidade
    # ------------------------------------------------------------------ #
    _q("SEG01", "seguranca_area", "seguranca", "tecnologia",
       "Como é o controle de acesso aos dados?",
       ["Acesso concedido de forma ampla e manual, sem granularidade.",
        "Controle por sistema, inconsistente entre plataformas.",
        "Controle de acesso centralizado por grupos/papéis.",
        "Controle fino (linha/coluna) baseado em atributos, unificado e auditado."]),
    _q("SEG02", "seguranca_area", "seguranca", "processos",
       "Existe classificação da informação?",
       ["Dados não são classificados.",
        "Classificação informal e parcial.",
        "Política de classificação aplicada a dados críticos.",
        "Classificação automatizada com tags e políticas por rótulo."]),
    _q("SEG03", "seguranca_area", "privacidade", "processos",
       "Qual o estágio de conformidade com a LGPD?",
       ["Sem processo estruturado de LGPD.",
        "Ações pontuais, sem mapeamento de dados pessoais.",
        "Mapeamento de dados pessoais e processos de atendimento a titulares.",
        "Privacy by design, DPIA e controles de privacidade automatizados."]),
    _q("SEG04", "seguranca_area", "privacidade", "tecnologia",
       "Como são protegidos dados pessoais e sensíveis?",
       ["Dados pessoais/sensíveis expostos sem proteção.",
        "Mascaramento manual e pontual.",
        "Mascaramento para os dados sensíveis críticos.",
        "Mascaramento dinâmico por atributo/rótulo, aplicado automaticamente."]),
    _q("SEG05", "seguranca_area", "seguranca", "processos",
       "Existe auditoria de acesso e uso de dados?",
       ["Sem auditoria de acesso a dados.",
        "Logs dispersos, difíceis de analisar.",
        "Auditoria centralizada para dados críticos.",
        "Auditoria completa de acesso e uso, com análise e alertas."]),
    _q("SEG06", "seguranca_area", "privacidade", "pessoas",
       "Como é o envolvimento do jurídico/DPO no ciclo de vida dos dados?",
       ["Jurídico/DPO não participa do ciclo de vida dos dados.",
        "Envolvimento apenas reativo (incidentes).",
        "Jurídico/DPO participa dos projetos críticos.",
        "Jurídico/DPO integrado desde o design (privacy by design)."]),
    _q("SEG07", "seguranca_area", "seguranca", "tecnologia",
       "Como é o isolamento e a proteção do ambiente de dados?",
       ["Sem isolamento de rede/ambiente.",
        "Isolamento básico, com credenciais compartilhadas.",
        "Isolamento por ambiente e gestão de credenciais.",
        "Isolamento por domínio, rede privada e perfis de segurança/compliance."]),

    # ------------------------------------------------------------------ #
    # AREA: Dominios de Negocio / Analytics
    # ------------------------------------------------------------------ #
    _q("DOM01", "dominios", "metadados", "tecnologia",
       "Como você descobre quais dados existem na empresa?",
       ["Não sei onde os dados estão; peço para a TI.",
        "Descubro dados perguntando para colegas.",
        "Existe um catálogo onde encontro parte dos dados.",
        "Encontro e entendo produtos de dados via catálogo/marketplace self-service."],
       mesh_principle="data_as_product"),
    _q("DOM02", "dominios", "operacoes", "processos",
       "Como é a autonomia para conseguir acesso a dados?",
       ["Levo semanas para conseguir acesso a dados.",
        "Acesso via chamado, demora dias.",
        "Acesso self-service com aprovação para a maioria dos dados.",
        "Acesso self-service governado, quase imediato, com trilha de auditoria."],
       mesh_principle="self_serve"),
    _q("DOM03", "dominios", "qualidade", "pessoas",
       "Qual o nível de confiança nos dados disponíveis?",
       ["Não confio nos dados; refaço tudo em planilhas.",
        "Confio parcialmente; sempre valido antes de usar.",
        "Confio na maioria dos dados críticos.",
        "Confio nos produtos de dados certificados, com SLA e qualidade visível."]),
    _q("DOM04", "dominios", "modelagem", "processos",
       "Como sua área disponibiliza dados para as demais?",
       ["Não penso nos meus dados como algo para outros usarem.",
        "Compartilho dados sob demanda, sem padrão.",
        "Documento e disponibilizo alguns dados para outras áreas.",
        "Publico produtos de dados com owner, contrato, SLA e documentação."],
       mesh_principle="data_as_product"),
    _q("DOM05", "dominios", "operacoes", "tecnologia",
       "Quais ferramentas de análise sua área utiliza?",
       ["Apenas planilhas locais.",
        "Relatórios feitos pela TI sob demanda.",
        "Ferramenta de BI self-service para parte das áreas.",
        "BI e IA self-service (inclusive linguagem natural) sobre dados governados."]),
    _q("DOM06", "dominios", "dados_mestres", "processos",
       "Como sua área lida com bases próprias e planilhas?",
       ["Cada área mantém suas próprias planilhas/bases redundantes.",
        "Muita redundância; versões conflitantes da 'verdade'.",
        "Fontes oficiais para dados críticos, ainda com alguma redundância.",
        "Fonte única de verdade por domínio; redundância minimizada."]),
    _q("DOM07", "dominios", "operacoes", "pessoas",
       "Como está a capacitação e a cultura de dados na sua área?",
       ["Time sem capacitação em dados.",
        "Poucos capacitados; dependência de especialistas.",
        "Capacitação em andamento em várias áreas.",
        "Comunidade de dados ativa; domínios autônomos e capacitados."],
       mesh_principle="self_serve"),
    _q("DOM08", "dominios", "governanca", "pessoas",
       "Sua área se considera dona e responsável pelos dados que produz?",
       ["Não; dados são responsabilidade da TI, não da nossa área.",
        "Em parte; usamos os dados, mas não nos sentimos responsáveis por eles.",
        "Sim, para os dados críticos da área, com apoio central.",
        "Sim; somos donos dos nossos dados como produtos, com responsabilidade formal."],
       mesh_principle="domain_ownership"),

    # ------------------------------------------------------------------ #
    # MODELO OPERACIONAL & ORGANIZACAO (novo eixo)
    # ------------------------------------------------------------------ #
    _q("OPM01", "lideranca", "governanca", "pessoas",
       "Como estão estruturados os times de dados?",
       ["Um único time (ou pessoas generalistas) que faz tudo, sem especialização.",
        "Time central de TI hiperespecializado em silos (BI, ETL, DBA separados).",
        "Time de plataforma central + primeiros papéis dedicados por área.",
        "Times multifuncionais por domínio, apoiados por uma plataforma habilitadora central."],
       mesh_principle="domain_ownership"),
    _q("OPM02", "lideranca", "governanca", "pessoas",
       "Existem papéis formais de dono de domínio e de gestor de produto de dados?",
       ["Não existem esses papéis; tudo passa pela TI.",
        "Responsabilidades informais, sem papéis nomeados.",
        "Papéis de dono de domínio definidos para os domínios principais.",
        "Dono de domínio e gestor de produto de dados formais, com responsabilidade por SLAs."],
       mesh_principle="domain_ownership"),
    _q("OPM03", "plataforma", "operacoes", "processos",
       "Como é o caminho até produção (path-to-production) de um dado/produto novo?",
       ["Dezenas de passos e vários comitês; leva meses e muitos projetos não chegam ao fim.",
        "Processo pesado de mudança (CHG), com aprovações sequenciais lentas.",
        "Processo padronizado com aprovações definidas; semanas até produção.",
        "Publicação automatizada com aprovação ágil do dono do domínio; poucos dias."],
       mesh_principle="self_serve"),
    _q("OPM04", "plataforma", "operacoes", "pessoas",
       "Existe uma plataforma de dados como time habilitador (enabling)?",
       ["Não; o time central executa todas as demandas das áreas.",
        "Time central atende por chamado, sem produtizar a plataforma.",
        "Plataforma tratada como serviço, com alguns recursos self-service.",
        "Plataforma como produto interno: reduz atrito e carga cognitiva dos domínios (DevEx)."],
       mesh_principle="self_serve"),
    _q("OPM05", "dominios", "operacoes", "pessoas",
       "Qual a distância entre quem produz e quem consome os dados?",
       ["Só a TI mexe nos dados; o negócio depende totalmente dela.",
        "Muitos intermediários entre a área que gera e a que usa o dado.",
        "As áreas conseguem produzir e consumir com algum apoio central.",
        "Os domínios produzem e consomem com autonomia, próximos do negócio."],
       mesh_principle="domain_ownership"),

    # ------------------------------------------------------------------ #
    # ENGENHARIA & DATAOPS (novo eixo)
    # ------------------------------------------------------------------ #
    _q("OPS01", "plataforma", "operacoes", "processos",
       "Existe CI/CD para dados (repositório versionado, PR, testes)?",
       ["Código em notebooks avulsos, sem versionamento nem revisão.",
        "Versionamento parcial, sem pipeline de CI/CD.",
        "CI/CD com testes para os produtos/pipelines críticos.",
        "CI/CD completo com quality gates, revisão por PR e deploy automatizado."],
       mesh_principle="self_serve"),
    _q("OPS02", "plataforma", "operacoes", "tecnologia",
       "Como é a promoção entre ambientes (DEV/STG/PROD) e o rollback?",
       ["Alterações feitas direto em produção, sem ambientes separados.",
        "Ambientes separados manualmente, sem promoção automatizada.",
        "Promoção DEV->STG->PROD com aprovação para os fluxos críticos.",
        "Promoção automatizada com aprovação e rollback em falha; ambientes efêmeros em teste."]),
    _q("OPS03", "arquitetura_area", "modelagem", "tecnologia",
       "Existe uma biblioteca/SDK versionada e blueprints reutilizáveis?",
       ["Cada produto é feito do zero, sem reúso de código.",
        "Algum reúso informal (copiar e colar entre projetos).",
        "Biblioteca compartilhada para os padrões principais.",
        "SDK versionado (SemVer) + blueprints de produto de dados reutilizados entre domínios."],
       mesh_principle="self_serve"),
    _q("OPS04", "plataforma", "operacoes", "processos",
       "Como o desenvolvimento trata contratos de dados e documentação?",
       ["Sem contratos; mudanças quebram consumidores; documentação inexistente.",
        "Documentação e contratos informais, desatualizados.",
        "Contratos e documentação para os produtos críticos.",
        "Contratos de dados versionados e documentação como código, validados no pipeline."],
       mesh_principle="data_as_product"),

    # ------------------------------------------------------------------ #
    # FINOPS & VALOR (novo eixo)
    # ------------------------------------------------------------------ #
    _q("FIN01", "plataforma", "operacoes", "tecnologia",
       "Há visibilidade de custo de dados por domínio e por produto?",
       ["Custos de dados desconhecidos, sem rastreio.",
        "Custo total visível, sem quebra por área/produto.",
        "Custo por área/domínio, com tags para os principais.",
        "Custo por domínio e por produto de dado, com tags obrigatórias e dashboards."],
       mesh_principle="self_serve"),
    _q("FIN02", "lideranca", "operacoes", "processos",
       "Existe responsabilização pelos custos (showback/chargeback)?",
       ["Ninguém é responsável pelo custo do que consome.",
        "Custos discutidos esporadicamente, sem atribuição.",
        "Showback: cada domínio enxerga seu custo, sem cobrança formal.",
        "Chargeback/showback com responsabilidade do domínio e incentivos à otimização."]),
    _q("FIN03", "plataforma", "operacoes", "processos",
       "Como são tratados os recursos ociosos e a otimização de custo?",
       ["Recursos ligados sem controle; desperdício não monitorado.",
        "Limpeza manual e esporádica de recursos ociosos.",
        "Revisões periódicas de custo e otimizações pontuais.",
        "Otimização contínua por política (right sizing, teardown automático, reservas)."]),

    # ------------------------------------------------------------------ #
    # ESTRATEGIA & VALOR (complemento)
    # ------------------------------------------------------------------ #
    _q("EST01", "lideranca", "governanca", "processos",
       "Mede-se o valor de negócio realmente capturado com os dados?",
       ["Não se mede valor; só se entregam relatórios/pipelines.",
        "Mede-se a entrega (o que foi feito), não o valor gerado.",
        "Alguns casos de uso têm valor de negócio acompanhado.",
        "Portfólio com valor medido por produto de dado, conectado a resultados de negócio."],
       mesh_principle="data_as_product"),

    # ------------------------------------------------------------------ #
    # AREA: Ciencia de Dados & IA (MLOps, feature store, modelos, GenAI)
    # ------------------------------------------------------------------ #
    _q("CIA01", "ciencia_ia", "operacoes", "tecnologia",
       "Como é a gestão de features para ML (feature store)?",
       ["Não há reúso; cada projeto recria suas features do zero.",
        "Reúso informal (copiar/colar) entre notebooks e projetos.",
        "Feature store para os casos de ML críticos.",
        "Feature store central com reúso, versionamento e governança de features."],
       mesh_principle="self_serve"),
    _q("CIA02", "ciencia_ia", "operacoes", "processos",
       "Qual o estágio do ciclo de vida dos modelos (MLOps)?",
       ["Modelos em notebooks manuais, sem deploy padronizado.",
        "Deploy manual, sem versionamento nem monitoramento.",
        "CI/CD e monitoramento para os modelos críticos.",
        "MLOps completo: versionamento, deploy automatizado e monitoramento de drift."],
       mesh_principle="self_serve"),
    _q("CIA03", "ciencia_ia", "governanca", "processos",
       "Existe registro e governança de modelos?",
       ["Sem registro de modelos; conhecimento disperso.",
        "Controle em planilhas/documentos.",
        "Registro de modelos para parte dos casos.",
        "Registro central com aprovação, linhagem e auditoria de modelos (model registry)."],
       mesh_principle="data_as_product"),
    _q("CIA04", "ciencia_ia", "arquitetura", "tecnologia",
       "Qual o estágio de uso de GenAI / LLMs / agentes?",
       ["Não utilizamos GenAI.",
        "Experimentos isolados, sem padrão nem guardrails.",
        "Casos em produção com guardrails para temas críticos.",
        "Plataforma de GenAI governada (RAG, agentes, avaliação e guardrails)."],
       mesh_principle="self_serve"),
    _q("CIA05", "ciencia_ia", "operacoes", "pessoas",
       "Como é a colaboração entre ciência de dados e engenharia/plataforma?",
       ["Silos; muito retrabalho para colocar modelos em produção.",
        "Handoff informal entre cientistas e engenharia.",
        "Colaboração definida para os projetos críticos.",
        "Times multifuncionais sobre plataforma self-service de ML/IA."],
       mesh_principle="self_serve"),
    _q("CIA06", "ciencia_ia", "qualidade", "processos",
       "Como é o monitoramento de qualidade e drift dos modelos em produção?",
       ["Não há monitoramento de modelos em produção.",
        "Verificações manuais e esporádicas.",
        "Monitoramento para os modelos críticos.",
        "Monitoramento contínuo de performance, drift e viés, com alertas."],
       mesh_principle="data_as_product"),
]


# ---------------------------------------------------------------------------
# Mapeamento SECUNDARIO (dimensoes e funcoes adicionais que a questao afeta).
# Fundamento: DAMA-DMBOK / DCAM / CMMI-DMM tratam capacidades como sociotecnicas -
# uma pratica envolve papeis (Pessoas), procedimentos (Processos) e ferramentas
# (Tecnologia), e frequentemente toca mais de uma area de conhecimento. O mapeamento
# PRIMARIO (function/dimension) e o dono da remediacao; as chaves abaixo adicionam as
# dimensoes/funcoes que a mesma questao tambem exige. Roll-ups por funcao e por dimensao
# agregam primario + secundarios; a nota global conta cada questao uma vez (primario).
#   dims: dimensoes adicionais (pessoas | processos | tecnologia)
#   fns:  funcoes adicionais (chaves de FUNCTIONS)
# ---------------------------------------------------------------------------
SECONDARY = {
    # Lideranca
    "LID02": {"dims": ["pessoas"]},
    "LID04": {"fns": ["governanca"]},
    "LID05": {"dims": ["processos"], "fns": ["governanca"]},
    "LID07": {"fns": ["governanca"]},
    # Governanca / Data Office
    "GOV01": {"dims": ["tecnologia"]},
    "GOV02": {"dims": ["processos"]},
    "GOV03": {"dims": ["processos"], "fns": ["governanca"]},
    "GOV04": {"dims": ["tecnologia"], "fns": ["governanca"]},   # linhagem: Processos + Tecnologia
    "GOV05": {"dims": ["tecnologia"], "fns": ["metadados"]},
    "GOV06": {"fns": ["arquitetura", "governanca"]},
    "GOV07": {"dims": ["tecnologia"]},
    "GOV08": {"fns": ["governanca", "seguranca"]},
    # Plataforma / Engenharia
    "PLT02": {"dims": ["processos"]},
    "PLT03": {"dims": ["tecnologia"]},
    "PLT04": {"dims": ["processos"]},
    "PLT05": {"dims": ["processos"], "fns": ["seguranca"]},
    "PLT07": {"dims": ["processos"], "fns": ["qualidade", "metadados"]},
    "PLT08": {"dims": ["processos"]},
    # Arquitetura
    "ARQ02": {"dims": ["tecnologia"]},
    "ARQ03": {"dims": ["tecnologia"]},
    "ARQ04": {"dims": ["processos"]},
    "ARQ05": {"dims": ["processos"], "fns": ["governanca"]},
    "ARQ06": {"dims": ["tecnologia"], "fns": ["arquitetura"]},
    "ARQ07": {"dims": ["processos"], "fns": ["governanca"]},
    "ARQ08": {"dims": ["tecnologia"], "fns": ["metadados", "governanca"]},
    "ARQ09": {"dims": ["processos"], "fns": ["arquitetura"]},
    # Seguranca & Privacidade
    "SEG01": {"dims": ["processos"], "fns": ["governanca"]},
    "SEG02": {"dims": ["tecnologia"], "fns": ["metadados", "privacidade"]},
    "SEG03": {"dims": ["pessoas"], "fns": ["governanca"]},
    "SEG04": {"dims": ["processos"], "fns": ["seguranca"]},
    "SEG05": {"dims": ["tecnologia"]},
    "SEG06": {"dims": ["processos"]},
    "SEG07": {"dims": ["processos"]},
    # Dominios de Negocio
    "DOM01": {"dims": ["processos"]},
    "DOM02": {"dims": ["tecnologia"], "fns": ["seguranca", "governanca"]},
    "DOM03": {"dims": ["processos"]},
    "DOM04": {"fns": ["metadados", "governanca"]},
    "DOM06": {"dims": ["tecnologia"], "fns": ["qualidade", "arquitetura"]},
    "DOM07": {"fns": ["governanca"]},
    "DOM08": {"dims": ["processos"], "fns": ["arquitetura"]},
    # Novas perguntas
    "OPM01": {"dims": ["processos"]},
    "OPM02": {"fns": ["governanca"]},
    "OPM03": {"dims": ["pessoas"]},
    "OPM04": {"dims": ["processos"]},
    "OPS01": {"dims": ["tecnologia"]},
    "OPS02": {"dims": ["processos"]},
    "OPS03": {"dims": ["processos"], "fns": ["operacoes"]},
    "OPS04": {"dims": ["processos"], "fns": ["metadados", "governanca"]},
    "FIN01": {"dims": ["processos"]},
    "FIN02": {"dims": ["pessoas"], "fns": ["governanca"]},
    "FIN03": {"dims": ["tecnologia"]},
    "EST01": {"dims": ["pessoas"], "fns": ["metadados"]},
    # Ciencia de Dados & IA
    "CIA01": {"dims": ["processos"], "fns": ["arquitetura"]},
    "CIA02": {"dims": ["tecnologia"]},
    "CIA03": {"dims": ["tecnologia"], "fns": ["metadados"]},
    "CIA04": {"dims": ["processos"], "fns": ["operacoes"]},
    "CIA05": {"dims": ["processos"]},
    "CIA06": {"dims": ["tecnologia"], "fns": ["operacoes"]},
}


# Principios de Data Mesh que cada questao materialmente sustenta (multi-associacao, como
# em dimensoes/funcoes). Perguntas puramente fundacionais ficam sem principio.
#   DO=domain_ownership  DP=data_as_product  SS=self_serve  FG=federated_governance
#
# RECALIBRACAO (2026-09): a prontidao para Mesh e sociotecnica. Ajustes:
#  - LID01 (patrocinio executivo) passa a contar: sem patrocinio TOP-DOWN o Mesh nao acontece
#    (fortemente cultural); associado a data_as_product + domain_ownership como HABILITADOR.
#  - Removidas de federated_governance as questoes com vinculo fraco ao PRINCIPIO (SEG03 processo
#    de LGPD, SEG06 envolvimento do DPO): sao governanca/privacidade, mas nao a "governanca
#    computacional federada" em si. Mantidas as de controle computacional (acesso, classificacao,
#    mascaramento, auditoria).
#  - Novas questoes de modelo operacional / dataops / finops entram nos principios que sustentam.
# Alem do mapa, o scoring aplica um TETO CULTURAL (ver CULTURAL_READINESS_IDS).
PRINCIPLES_MAP = {
    "LID01": ["data_as_product", "domain_ownership"],
    "LID03": ["federated_governance"], "LID05": ["domain_ownership"], "LID07": ["data_as_product"],
    "GOV01": ["federated_governance"], "GOV02": ["domain_ownership", "federated_governance"],
    "GOV03": ["data_as_product", "federated_governance"], "GOV04": ["data_as_product", "federated_governance"],
    "GOV05": ["data_as_product"], "GOV06": ["data_as_product"], "GOV07": ["federated_governance"],
    "GOV08": ["federated_governance"],
    "PLT03": ["self_serve"], "PLT05": ["self_serve", "domain_ownership"], "PLT08": ["data_as_product"],
    "ARQ04": ["data_as_product"], "ARQ05": ["domain_ownership"],
    "ARQ06": ["federated_governance", "data_as_product"], "ARQ07": ["federated_governance"],
    "ARQ08": ["data_as_product"], "ARQ09": ["data_as_product"],
    "SEG01": ["federated_governance"], "SEG02": ["federated_governance"],
    "SEG04": ["federated_governance"], "SEG05": ["federated_governance"],
    "DOM01": ["data_as_product"], "DOM02": ["self_serve"], "DOM03": ["data_as_product"],
    "DOM04": ["data_as_product", "domain_ownership"], "DOM05": ["self_serve"], "DOM07": ["self_serve"],
    "DOM08": ["domain_ownership"],
    # Novas questoes
    "OPM01": ["domain_ownership"], "OPM02": ["domain_ownership", "data_as_product"],
    "OPM03": ["self_serve"], "OPM04": ["self_serve"], "OPM05": ["domain_ownership"],
    "OPS01": ["self_serve"], "OPS03": ["self_serve"], "OPS04": ["data_as_product"],
    "FIN01": ["self_serve"], "EST01": ["data_as_product"],
    "CIA01": ["self_serve"], "CIA02": ["self_serve"], "CIA03": ["data_as_product", "federated_governance"],
    "CIA04": ["self_serve"], "CIA05": ["self_serve", "domain_ownership"], "CIA06": ["data_as_product"],
}

# Dimensao de MATURIDADE (eixo executivo) de cada questao. Fonte unica de mapeamento.
MATURITY_MAP = {
    "LID01": "estrategia_cultura", "LID02": "estrategia_cultura", "LID03": "modelo_operacional",
    "LID04": "estrategia_cultura", "LID05": "modelo_operacional", "LID06": "estrategia_cultura",
    "LID07": "estrategia_cultura",
    "GOV01": "governanca_seguranca", "GOV02": "governanca_seguranca", "GOV03": "governanca_seguranca",
    "GOV04": "governanca_seguranca", "GOV05": "governanca_seguranca", "GOV06": "governanca_seguranca",
    "GOV07": "governanca_seguranca", "GOV08": "governanca_seguranca",
    "PLT01": "arquitetura_plataforma", "PLT02": "engenharia_dataops", "PLT03": "arquitetura_plataforma",
    "PLT04": "finops_valor", "PLT05": "arquitetura_plataforma", "PLT06": "arquitetura_plataforma",
    "PLT07": "engenharia_dataops", "PLT08": "engenharia_dataops",
    "ARQ01": "arquitetura_plataforma", "ARQ02": "arquitetura_plataforma", "ARQ03": "arquitetura_plataforma",
    "ARQ04": "arquitetura_plataforma", "ARQ05": "modelo_operacional", "ARQ06": "arquitetura_plataforma",
    "ARQ07": "arquitetura_plataforma", "ARQ08": "engenharia_dataops", "ARQ09": "arquitetura_plataforma",
    "SEG01": "governanca_seguranca", "SEG02": "governanca_seguranca", "SEG03": "governanca_seguranca",
    "SEG04": "governanca_seguranca", "SEG05": "governanca_seguranca", "SEG06": "governanca_seguranca",
    "SEG07": "governanca_seguranca",
    "DOM01": "arquitetura_plataforma", "DOM02": "modelo_operacional", "DOM03": "governanca_seguranca",
    "DOM04": "modelo_operacional", "DOM05": "arquitetura_plataforma", "DOM06": "governanca_seguranca",
    "DOM07": "estrategia_cultura", "DOM08": "modelo_operacional",
    "OPM01": "modelo_operacional", "OPM02": "modelo_operacional", "OPM03": "modelo_operacional",
    "OPM04": "modelo_operacional", "OPM05": "modelo_operacional",
    "OPS01": "engenharia_dataops", "OPS02": "engenharia_dataops", "OPS03": "engenharia_dataops",
    "OPS04": "engenharia_dataops",
    "FIN01": "finops_valor", "FIN02": "finops_valor", "FIN03": "finops_valor",
    "EST01": "estrategia_cultura",
    "CIA01": "engenharia_dataops", "CIA02": "engenharia_dataops", "CIA03": "governanca_seguranca",
    "CIA04": "arquitetura_plataforma", "CIA05": "modelo_operacional", "CIA06": "engenharia_dataops",
}

# Prontidao CULTURAL para Mesh (pre-condicao sociotecnica): patrocinio, estrategia, cultura,
# financiamento, cultura de ownership e estrutura de times/papeis. Usado como TETO SUAVE sobre a
# prontidao para Mesh no scoring (sem base cultural, capacidade tecnica nao vira Mesh real).
CULTURAL_READINESS_IDS = ["LID01", "LID02", "LID06", "LID04", "DOM08", "OPM01", "OPM02"]


def _dedup(seq):
    out = []
    for x in seq:
        if x not in out:
            out.append(x)
    return out


for _q_item in QUESTIONS:
    _sec = SECONDARY.get(_q_item["id"], {})
    _q_item["dimensions"] = _dedup([_q_item["dimension"]] + _sec.get("dims", []))
    _q_item["functions"] = _dedup([_q_item["function"]] + _sec.get("fns", []))
    # Principios: usa o mapa; fallback ao mesh_principle unico anterior.
    _prins = PRINCIPLES_MAP.get(_q_item["id"]) or ([_q_item["mesh_principle"]] if _q_item.get("mesh_principle") else [])
    _q_item["mesh_principles"] = _dedup(_prins)
    _q_item["mesh_principle"] = _q_item["mesh_principles"][0] if _q_item["mesh_principles"] else None
    _q_item["maturity_dimension"] = MATURITY_MAP.get(_q_item["id"])


# Indice util para validacao/lookup
QUESTIONS_BY_ID = {q["id"]: q for q in QUESTIONS}


def questions_for_area(area_key: str):
    return [q for q in QUESTIONS if q["area"] == area_key]
