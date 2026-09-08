# Validacao como especialista em Governanca de Dados

Registro das revisoes criticas feitas sobre o assessment e o gerador de relatorio, com as
correcoes aplicadas e re-testes. Objetivo: garantir que o diagnostico seja metodologicamente
solido e que a recomendacao de Data Mesh seja responsavel (nao "empurrar" federacao).

## Passo 1 - Confiabilidade do scoring (balanceamento das perguntas)
**Problema:** funcoes `modelagem`, `qualidade` e `dados_mestres` tinham apenas 2 perguntas
cada, e o principio `domain_ownership` (que influencia a topologia) tambem. Poucas perguntas
tornam a nota da funcao fragil (uma resposta destoante desloca todo o resultado).
**Correcao:** +4 perguntas (PLT08, ARQ08, ARQ09, DOM08). Agora toda funcao tem >= 3 e todo
principio tem >= 3. Total: 47 perguntas.
**Re-teste:** distribuicao reauditada; 3 simulacoes reexecutadas sem regressao.

## Passo 2 - Recomendacao de topologia responsavel (teto de fundacao)
**Problema:** a topologia era puxada demais pela "prontidao para mesh" (peso 0,6). Um cliente
com dominios entusiasmados, mas base fraca, poderia receber recomendacao de mesh federado -
o erro classico de querer Data Mesh sem maturidade de governanca (contrario ao que prega o
DAMA-DMBOK).
**Correcao:** em `mesh.py`, (a) reponderado para favorecer a maturidade geral
(0,55 global + 0,45 mesh) e (b) **teto de fundacao**: a topologia nao ultrapassa
`foundation_score + 0,5`, onde a fundacao = media de governanca, seguranca, qualidade,
operacoes e arquitetura. O relatorio exibe esse teto e alerta quando a vontade de federar
supera a base.
**Re-teste:** cenario media deixou de saltar para hub-and-spoke e passou a recomendar
"Data Mesh Governado", coerente com a maturidade Inicial.

## Passo 3 - Consistencia do enquadramento de estagio
**Problema:** `round()` do Python usa banker's rounding (2,5 -> 2, mas 3,5 -> 4), gerando
enquadramento assimetrico.
**Correcao:** arredondamento "half-up" explicito em `stage_for_score`.
**Re-teste:** invariante "estagio == floor(nota+0,5)" verificado nos 3 cenarios.

## Passo 4 - Criticidade ponderada por risco regulatorio
**Problema:** pontos de atencao usavam so a nota para a criticidade. No diagnostico de
referencia, quase todos os pontos de seguranca/privacidade sao "Alta" (risco LGPD).
**Correcao:** funcoes de alto risco (seguranca, privacidade, governanca) com nota < Definido
tem a criticidade elevada em um nivel.
**Re-teste:** no cenario baixa, privacidade/seguranca/governanca aparecem como criticidade
"Alta".

## Passo 5 - Reprodutibilidade das simulacoes
**Problema:** a seed usava `hash()` do nome do cenario, que varia por processo
(PYTHONHASHSEED), tornando as simulacoes nao reprodutiveis.
**Correcao:** seeds fixas por cenario.
**Re-teste:** duas execucoes consecutivas produzem exatamente as mesmas notas.

## Verificacao de invariantes (automatizada)
Checado nos 3 relatorios:
- estagio coerente com a nota (half-up);
- nenhuma funcao aparece simultaneamente como destaque e ponto de atencao;
- todo ponto de atencao possui >= 1 recomendacao Databricks;
- roadmap sem acao duplicada por horizonte;
- **topologia monotonica com a maturidade** entre os cenarios (posicoes 1, 2, 4).

## Teste de interface (Chrome DevTools)
7 rotas testadas (educacao, assessments, painel, escolha de area, questionario, relatorio
baixa e alta): renderizacao OK, **zero erros de console**, radar SVG e tabela de pontos de
atencao presentes, e interacao (selecao de resposta + barra de progresso) confirmada.

## Resultado final dos 3 cenarios (reprodutivel)
| Cenario | Nota global | Estagio | Topologia recomendada |
|---|---|---|---|
| Baixa | 1,45 | Reativo | Fundacao Lakehouse Governada (centralizada) |
| Media | 2,39 | Inicial | Data Mesh Governado (hub central) |
| Alta | 3,53 | Coordenado | Data Mesh Federado (descentralizado) |

## Passo 6 - Mapeamento pergunta x dimensao x funcao (multi-mapeamento)
**Pergunta:** uma pergunta deve pontuar em mais de uma dimensao/funcao? (ex.: linhagem em
Processos + Tecnologia).

**Fundamento (DAMA-DMBOK / DCAM - EDM Council / CMMI-DMM):** gestao de dados e sociotecnica -
a pratica de uma capacidade envolve Pessoas, Processos e Tecnologia e frequentemente toca mais
de uma area de conhecimento (funcao). A pratica recomendada por esses frameworks e o
mapeamento PRIMARIO (a funcao dona da remediacao) + SECUNDARIOS (demais dimensoes/funcoes que
a questao exige), com **roll-up duplo**: funcao e dimensao agregam toda questao marcada nelas;
a nota global conta cada questao uma unica vez (evita dupla contagem).

**Decisao:** adotado o multi-mapeamento primario+secundario. Implementado em
`questions.SECONDARY` e `scoring`. A Governanca aparece como funcao secundaria de muitas
praticas por ser a funcao CENTRAL da roda do DAMA (orienta as demais) - o que e correto, e nao
infla a nota (a nota por funcao e media ponderada, nao soma). Ex.: linhagem/dicionario conta em
Processos + Tecnologia, funcoes Metadados + Governanca.
