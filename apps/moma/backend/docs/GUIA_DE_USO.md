# Guia de Uso e Metodologia - Data Maturity Compass (Databricks)

Este documento ensina a usar a ferramenta e detalha **todos os calculos e metricas** por
tras do assessment e do relatorio. Publico-alvo: Solution Architects (SAs) e os times de
dados dos clientes.

- Parte 1 - [Visao geral](#1-visao-geral)
- Parte 2 - [Conceitos do modelo](#2-conceitos-do-modelo)
- Parte 3 - [Como usar (passo a passo)](#3-como-usar-passo-a-passo)
- Parte 4 - [Como ler o relatorio](#4-como-ler-o-relatorio)
- Parte 5 - [Detalhes dos calculos e metricas](#5-detalhes-dos-calculos-e-metricas)
- Parte 6 - [Exemplo numerico completo](#6-exemplo-numerico-completo)
- Parte 7 - [Customizacao](#7-customizacao)
- Parte 8 - [Boas praticas e limitacoes](#8-boas-praticas-e-limitacoes)

---

## 1. Visao geral

O Data Maturity Compass faz tres coisas:

1. **Educa** sobre Data Mesh (paradigma organizacional/arquitetural, nao um produto) e sobre
   o espectro de topologias possiveis no Databricks.
2. **Coleta um assessment** de maturidade em dados, respondido por **varias areas** do cliente
   de forma **assincrona** (cada area responde a sua parte, quando puder).
3. **Gera um relatorio** que traduz as respostas em notas de maturidade, recomenda a
   **topologia de Data Mesh adequada aquele nivel** e propoe um **roadmap** com produtos e
   solucoes Databricks.

Base metodologica: DAMA-DMBOK (9 funcoes de dados x 3 dimensoes x 4 estagios de maturidade),
adaptada para direcionar tudo a Databricks e conectar a maturidade a um modelo de Data Mesh.

---

## 2. Conceitos do modelo

### 2.1 Escala de maturidade (1 a 4)

| Nivel | Nome | Significado |
|---|---|---|
| 1 | **Reativo** | Praticas desconhecidas ou eventuais; silos; acoes reativas. |
| 2 | **Inicial** | Necessidades mapeadas; praticas em poucas areas. |
| 3 | **Definido** | Praticas padronizadas em varias areas; monitoramento parcial. |
| 4 | **Coordenado** | Praticas corporativas; governanca federada e monitorada. |

### 2.2 Dimensoes (3)
**Pessoas** (papeis, responsabilidades, patrocinio), **Processos** (politicas, padroes,
metricas) e **Tecnologia** (ferramentas e plataformas). Cada pergunta tem uma dimensao
PRIMARIA e pode tocar dimensoes SECUNDARIAS (ver 5.3 - mapeamento multiplo).

### 2.3 Funcoes de dados (9)
Governanca, Arquitetura, Metadados, Modelagem, Operacoes, Qualidade, Dados Mestres, Seguranca
e Privacidade. Cada pergunta tem uma funcao PRIMARIA (dona da remediacao) e pode contribuir
para funcoes SECUNDARIAS (ver 5.3).

### 2.4 Principios de Data Mesh (4)
Propriedade orientada a dominios, Dados como produto, Plataforma self-service e Governanca
federada computacional. Algumas perguntas sao adicionalmente marcadas com um principio (usado
para medir a "prontidao para mesh").

### 2.5 Areas respondentes (grupos) e seus pesos

Cada area responde a um **subconjunto proprio** de perguntas (o time de dados nao responde as
mesmas perguntas que o negocio) e tem um **peso** que reflete o conhecimento/credibilidade
daquele grupo sobre a maturidade REAL da plataforma. Uma mesma pergunta pode ser respondida
por varias pessoas da mesma area.

| Area (grupo) | Peso | Perfil |
|---|---|---|
| Plataforma / Engenharia de Dados | **1,5** | Time de dados - conhece a realidade tecnica |
| Governanca / Data Office | **1,4** | Stewards, escritorio de dados |
| Arquitetura de Dados / Solucoes | **1,3** | Arquitetos de dados e solucoes |
| Seguranca & Privacidade | **1,2** | SI, privacidade, DPO |
| Lideranca / Patrocinio | **1,0** | CDO, diretoria (visao estrategica) |
| Dominios de Negocio / Analytics | **0,7** | Negocio - perspectiva de consumo, menos profundidade tecnica |

**Por que pesos diferentes?** Sem ponderacao, se o time de dados avalia uma capacidade como 1
e o negocio como 5, a media (3) fica dominada por quem tem menos visibilidade tecnica,
mascarando o problema. O peso maior dos grupos tecnicos faz a nota refletir melhor a realidade.
Ver o calculo em 5.3.

### 2.6 Espectro de topologias (4 etapas)

| Etapa | Topologia | Controle central | Autonomia | Workspaces |
|---|---|---|---|---|
| 1 | Fundacao Lakehouse Governada (centralizada) | Alto | Baixa | 1-2, time central |
| 2 | Data Mesh Governado (hub central) | Medio-alto | Baixa-media | poucos; dominios = catalogos |
| 3 | Data Mesh Harmonizado (hub-and-spoke) | Medio | Media-alta | 1 workspace por dominio |
| 4 | Data Mesh Federado (descentralizado) | Baixo-medio | Alta | multiplos por dominio, self-service |

---

## 3. Como usar (passo a passo)

### 3.1 SA - criar o assessment
1. Acesse a aba **Assessments** e crie um assessment com o nome do cliente.
2. Voce cai no **Painel**, que mostra o **link geral**, os **links por area** e o **progresso**.
3. Combine com o **gestor da area de dados** do cliente (CDO / lider de dados) quem sera o
   ponto focal por area. Repasse a ele o link geral e/ou os links por area.

### 3.2 Gestor da area de dados - convidar as pessoas que vao responder
O app usa **convite por link** (nao ha cadastro previo de usuarios), o que simplifica a coleta.
Passo a passo:

1. Abra o **Painel** do assessment (link recebido do SA).
2. Para cada uma das 6 areas, decida **quem responde** (idealmente 1-3 pessoas por area, as
   mais proximas do tema). Sugestao de mapeamento:
   - **Plataforma / Engenharia de Dados:** lider de engenharia de dados, tech leads de dados.
   - **Governanca / Data Office:** data stewards, responsavel de governanca.
   - **Arquitetura de Dados / Solucoes:** arquitetos de dados/solucoes.
   - **Seguranca & Privacidade:** SI, DPO/privacidade.
   - **Lideranca / Patrocinio:** CDO, diretoria de dados, patrocinador.
   - **Dominios de Negocio / Analytics:** referentes de dados das areas de negocio.
3. No Painel, em cada card de area, clique em **"Copiar link da area"** e **envie esse link**
   (e-mail/Slack/Teams) para as pessoas daquela area, pedindo que respondam ate uma data.
   - Alternativamente, use **"Copiar link geral"**: quem abre escolhe a propria area.
4. **Acompanhe o progresso** no Painel: cada card mostra quantas pessoas responderam e o % de
   perguntas cobertas. Cobre as areas com 0% ou baixa cobertura.
5. Quando a cobertura estiver satisfatoria, avise o SA (ou gere o relatorio, item 3.4).

> **Regra de cobertura (importante):**
> - Deve haver **1 representante por área** (idealmente 2-3 para reduzir viés; várias pessoas
>   da mesma área respondem o mesmo questionário e suas respostas são promediadas - item 5.2).
> - Em **Domínios de Negócio**, o ideal é **1 representante por BU / área de negócio** (Crédito,
>   Cartões, Investimentos, etc.). Cada um informa a sua área de negócio ao responder.
> - **Se não houver representante de alguma área, eleja o responsável mais próximo do tema.**
>   Exemplo: se não há alguém dedicado a Segurança & Privacidade, o time de Governança ou de
>   Plataforma pode responder por essa área. É melhor a resposta do responsável mais próximo do
>   que deixar a área sem cobertura (a cobertura influencia a confiabilidade do diagnóstico).

### 3.3 Participante (cada area) - responder
1. Abra o link recebido. Se for o link geral, **escolha a sua area**; se for o link da area, ja
   abre na secao certa.
2. Informe **seu nome** (permite salvar e retomar depois; nao mistura suas respostas com as de
   outra pessoa).
3. Para cada pergunta, escolha a opcao que melhor descreve a realidade da empresa - ou
   **"Nao sei / Nao se aplica"**, que **nao entra no calculo** (melhor do que chutar).
4. Clique em **Salvar respostas**. Da para fechar e voltar depois com o **mesmo nome** para
   continuar de onde parou.

> A coleta e **assincrona**: nao e preciso responder tudo de uma vez nem todas as areas ao
> mesmo tempo. O relatorio consolida o que existir ate o momento.

### 3.4 Gerar e exportar o relatorio
No Painel, clique em **Gerar relatorio**. Use **Exportar PDF / Imprimir** para salvar ou
compartilhar. O relatorio pode ser regenerado a qualquer momento conforme novas respostas
chegam.

---

## 4. Como ler o relatorio

- **Sumario executivo:** nota global, estagio, prontidao para Data Mesh, topologia recomendada
  e um paragrafo-sintese. Mostra tambem o **teto de fundacao** (ver 5.6).
- **Radar por funcao:** visao rapida das 9 funcoes (0 a 4).
- **Por dimensao / por principio:** onde estao as forcas e fraquezas (Pessoas x Processos x
  Tecnologia; e os 4 principios de mesh).
- **Pontos de destaque:** funcoes ja maduras (nota >= 3).
- **Pontos de atencao:** funcoes imaturas, com criticidade, consequencias e **recomendacoes
  Databricks** para avancar.
- **Modelo de Data Mesh recomendado:** a topologia adequada ao nivel e a proxima etapa.
- **Roadmap:** acoes por horizonte (Fundacao / Padronizacao / Federacao).
- **Produtos de dados e Federacao:** primeiros passos concretos.

---

## 5. Detalhes dos calculos e metricas

Todas as notas usam a escala continua de **1,0 a 4,0**. O motor esta em
`server/domain/scoring.py`, `mesh.py` e `report.py`.

### 5.1 Da resposta ao nivel
Cada opcao escolhida vale um nivel inteiro de **1 a 4**. "Nao sei / Nao se aplica" vira
resposta **nula** e e **excluida** de todos os calculos (nao conta como zero).

### 5.2 Nivel consolidado por pergunta
Quando varias pessoas respondem a mesma pergunta, o nivel da pergunta e a **media aritmetica**
dos niveis nao nulos:

```
nivel_pergunta = media(niveis informados por todos os respondentes)
```

### 5.2.1 Mapeamento primario e secundario (multiplo)
Base metodologica: **DAMA-DMBOK**, com praticas de maturidade do **DCAM (EDM Council)** e do
**CMMI-DMM**. Gestao de dados e sociotecnica - uma pratica envolve papeis (Pessoas),
procedimentos (Processos) e ferramentas (Tecnologia) e costuma tocar mais de uma funcao. Por
isso cada pergunta tem:
- um **mapeamento primario**: uma funcao (dona da remediacao) e uma dimensao;
- **mapeamentos secundarios**: as demais funcoes e dimensoes que ela materialmente exige
  (ex.: linhagem/dicionario conta em **Processos e Tecnologia**, funcao **Metadados** e tambem
  **Governanca**).

**Roll-up duplo:** a nota por funcao e por dimensao agrega toda pergunta marcada nela
(primaria ou secundaria); a **nota global conta cada pergunta uma unica vez** (pelo primario),
evitando dupla contagem. O mapeamento completo esta na aba "Como e calculado" do app.

### 5.3 Peso efetivo (pergunta x grupo) e nota por funcao/dimensao/principio
Cada pergunta pertence a **uma area (grupo)** e tem um **peso de pergunta** (`weight`, padrao
1,0). O **peso efetivo** de uma pergunta combina os dois:

```
peso_efetivo = peso_da_pergunta × peso_da_area
```

Os **pesos de area** (ver 2.5) ponderam o conhecimento do grupo: Plataforma 1,5; Governanca
1,4; Arquitetura 1,3; Seguranca 1,2; Lideranca 1,0; Negocio 0,7. Assim, uma pergunta respondida
pelo time de dados conta mais do que uma respondida pelo negocio.

A nota de um agrupamento (funcao, dimensao ou principio) e a **media ponderada** dos niveis das
perguntas daquele agrupamento que foram respondidas, usando o peso efetivo:

```
nota_grupo = Σ(nivel_pergunta × peso_efetivo) / Σ(peso_efetivo)   (apenas perguntas respondidas)
```

Como hoje o peso de pergunta e 1,0, na pratica o peso efetivo = peso da area. O peso de pergunta
existe para calibrar perguntas mais decisivas no futuro (ver Customizacao).

### 5.4 Nota global
Media ponderada (pelo peso efetivo) dos niveis de **todas** as perguntas respondidas:

```
nota_global = Σ(nivel_pergunta × peso_efetivo) / Σ(peso_efetivo)   (todas as perguntas respondidas)
```

### 5.5 Prontidao para Data Mesh (`mesh_readiness`)
Media simples das notas dos **4 principios** de Data Mesh (considerando apenas os que tiveram
ao menos uma resposta):

```
mesh_readiness = media(nota_principio para os 4 principios com resposta)
```

### 5.6 Nota de fundacao (`foundation_score`)
Media das notas das **funcoes-base** que precisam estar solidas para viabilizar federacao:
**Governanca, Seguranca, Qualidade, Operacoes e Arquitetura**.

```
foundation_score = media(nota das 5 funcoes-base com resposta)
```

### 5.7 Enquadramento em estagio (arredondamento half-up)
Qualquer nota continua vira um estagio inteiro de 1 a 4 por **arredondamento "half-up"**
(0,5 sempre sobe), limitado a [1,4]:

```
estagio = min(4, max(1, floor(nota + 0,5)))
```

Faixas resultantes: **[1,0-1,5)=Reativo**, **[1,5-2,5)=Inicial**, **[2,5-3,5)=Definido**,
**[3,5-4,0]=Coordenado**. (Usamos half-up de proposito para evitar o "banker's rounding" do
Python, em que 2,5 iria para 2.)

### 5.8 Recomendacao de topologia
Passo a passo (em `mesh.py::recommend_topology`):

1. **Indice base** - combina a maturidade geral com a prontidao para mesh, dando mais peso a
   maturidade geral (a base viabiliza o modelo):

   ```
   base = 0,55 × nota_global + 0,45 × mesh_readiness
   ```
   (Se nao houver `mesh_readiness`, usa-se `nota_global`. Sem respostas, base = 1,0.)

2. **Teto de fundacao** - a topologia **nao pode ultrapassar** a maturidade da base + 0,5.
   Este e o mecanismo que impede recomendar federacao sem fundacao:

   ```
   base = min(base, foundation_score + 0,5)
   ```

3. **Faixas de topologia** - o indice `base` cai em uma das etapas:

   | base | Topologia |
   |---|---|
   | [1,0 - 2,0) | Fundacao Lakehouse Governada (centralizada) |
   | [2,0 - 2,7) | Data Mesh Governado (hub central) |
   | [2,7 - 3,4) | Data Mesh Harmonizado (hub-and-spoke) |
   | [3,4 - 4,0] | Data Mesh Federado (descentralizado) |

O relatorio tambem mostra a **proxima etapa** (evolucao) e, se `mesh_readiness − foundation_score ≥ 0,5`,
exibe um **alerta**: a vontade de federar supera a maturidade da base.

### 5.9 Destaque x ponto de atencao
Para cada funcao com nota disponivel:
- **nota >= 3,0** -> vira **ponto de destaque**;
- **nota < 3,0** -> vira **ponto de atencao** (com recomendacoes Databricks).

### 5.10 Criticidade do ponto de atencao
Primeiro pela nota, depois ajustada por risco:

```
se nota < 1,8      -> Alta
senao se nota < 2,5 -> Media
senao              -> Baixa
```

Em seguida, para funcoes de **alto risco regulatorio** (Seguranca, Privacidade, Governanca)
com nota **< 3,0**, a criticidade **sobe um nivel** (ex.: Media -> Alta). Reflete o risco
LGPD/seguranca de manter essas funcoes imaturas.

### 5.11 Selecao de recomendacoes e complexidade de resolucao
Cada funcao tem um conjunto de recomendacoes no catalogo (`catalog.py`), cada uma com um
**estagio-alvo** (2, 3 ou 4) e um **esforco** (Simples/Media/Complexa). Para uma funcao no
estagio atual `E`, sao selecionadas as recomendacoes com **estagio-alvo > E**, ordenadas por
(estagio-alvo, esforco). A **complexidade de resolucao** exibida no ponto de atencao e o
**maior esforco entre as duas primeiras** recomendacoes.

### 5.12 Roadmap por horizontes
As recomendacoes selecionadas de todas as funcoes sao agrupadas pelo estagio-alvo:

| Estagio-alvo | Horizonte | Janela | Objetivo |
|---|---|---|---|
| 2 | Horizonte 1 - Fundacao | 0-3 meses | Consolidar o lakehouse governado, sair do Reativo |
| 3 | Horizonte 2 - Padronizacao | 3-9 meses | Padronizar praticas, habilitar produtos de dados |
| 4 | Horizonte 3 - Federacao | 9+ meses | Governanca federada e malha de produtos de dados |

### 5.13 Cobertura
```
cobertura% = round(100 × perguntas_respondidas / total_de_perguntas)   (total = 47)
```
Uma pergunta conta como respondida se teve ao menos um nivel nao nulo (de qualquer
respondente). Cobertura baixa indica que o diagnostico ainda e parcial.

---

## 6. Exemplo numerico completo

### 6.1 Efeito da ponderacao por grupo (o caso "time de dados x negocio")
Considere a funcao **Qualidade**, respondida por 3 grupos com pesos diferentes:

| Pergunta | Area (peso) | nivel |
|---|---|---|
| PLT08 (qualidade nos pipelines) | Plataforma (1,5) | 1 |
| GOV05 (programa de qualidade) | Governanca (1,4) | 2 |
| DOM03 (confianca nos dados) | Negocio (0,7) | 4 |

- **Media simples** (sem ponderacao) = (1 + 2 + 4) / 3 = **2,33**.
- **Media ponderada** = (1×1,5 + 2×1,4 + 4×0,7) / (1,5 + 1,4 + 0,7) = (1,5 + 2,8 + 2,8) / 3,6 =
  7,1 / 3,6 = **1,97**.

O negocio, otimista (4), nao consegue mascarar o problema apontado pelo time de dados: a nota
ponderada (1,97) fica proxima da visao tecnica, e nao da media ingenua (2,33).

### 6.2 Nivel de pergunta com multiplos respondentes
| Pergunta | Respondentes (niveis) | nivel_pergunta |
|---|---|---|
| Q (patrocinio) | Ana=2, Bruno=1 | (2+1)/2 = **1,5** |
| Q (papeis) | Carla=1, Ana=null | 1 (null excluido) = **1,0** |

Pessoas da mesma area sao promediadas igualmente entre si; o peso de grupo entra so na
consolidacao por funcao/dimensao/global.

### 6.3 Do global a topologia (numeros ilustrativos)
- `nota_global = 2,2`, `mesh_readiness = 2,4`, `foundation_score = 1,9`.
- **base** = 0,55×2,2 + 0,45×2,4 = 1,21 + 1,08 = **2,29**.
- **teto de fundacao** = 1,9 + 0,5 = 2,40. Como 2,29 < 2,40, o teto nao corta -> base = **2,29**.
- 2,29 cai em [2,0-2,7) -> **Data Mesh Governado (hub central)**. Proxima etapa: Harmonizado.
- Se a `foundation_score` fosse 1,5 (base fraca), o teto seria 2,0 e a base cairia para 2,0,
  puxando para o limite inferior de "Governado" - o mecanismo segura a recomendacao.

---

## 7. Customizacao

Tudo e dirigido pelo dominio em `server/domain/` e servido ao frontend via `/api/framework`
(sem rebuild do frontend):

- **Perguntas, funcoes, dimensoes, areas, principios:** `framework.py` e `questions.py`.
  Para dar mais peso a uma pergunta decisiva, ajuste o `weight` em `questions.py`.
- **Solucoes e recomendacoes Databricks (por funcao):** `catalog.py` (texto, produtos,
  esforco, estagio-alvo).
- **Topologias, pesos da recomendacao e teto de fundacao:** `mesh.py` e
  `report.py::_FOUNDATION_KEYS`.
- **Mensagens-chave e links (go/data-mesh etc.):** `references.py`.
- **Faixas de criticidade e horizontes do roadmap:** `report.py`.

Apos qualquer mudanca, rode as simulacoes para validar: `python3 -m simulations.simulate`.

---

## 8. Boas praticas e limitacoes

- **Multiplas perspectivas > uma so:** incentive varias areas (e mais de uma pessoa por area)
  a responder. A triangulacao reduz vies.
- **Cobertura importa:** trate relatorios com cobertura baixa como preliminares.
- **A ferramenta apoia, nao substitui, o julgamento do SA:** as notas orientam a conversa; o
  contexto do cliente (regulatorio, organizacional) sempre pesa.
- **Data Mesh e um alvo movel:** reavalie periodicamente; a topologia recomendada evolui com a
  maturidade.
- **Nao e um produto que se compra:** a recomendacao aponta habilitadores Databricks para
  cada lacuna, mas a adocao de Data Mesh envolve pessoas e processos, nao so tecnologia.
```
