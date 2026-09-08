# Deploy - Data Maturity Compass (Databricks App)

Publicacao do app em um workspace Databricks. Persistencia em **tabelas Delta no Unity
Catalog** (via SQL warehouse + Statement Execution API) - **nao usa Lakebase**. Todos os
comandos usam `-p <perfil>` do Databricks CLI.

## Arquitetura de persistencia

- Backend FastAPI + frontend estatico (JS puro, sem build).
- Tabelas Delta no schema `<UC_CATALOG>.<UC_SCHEMA>` (criadas no startup por `store.init_db()`):
  `dm_assessments`, `dm_responses`, `dm_assessments_archive`, `dm_responses_archive`, `dm_hidden`.
- Acesso ao lakehouse via **SQL warehouse** (serverless) usando a identidade do service
  principal do app.
- Sem warehouse/catalogo configurados, o app cai em **SQLite** local (efemero no Apps) - util
  so para rodar/testar localmente.

## Pre-requisitos

- Databricks CLI autenticado: `databricks auth login --host <workspace-url> --profile <perfil>`.
- Um **SQL warehouse** (de preferencia serverless) no workspace - anote o `id`.
- Um **catalogo** Unity Catalog onde criar o schema do app.

## 1. Sincronizar o codigo
A partir da pasta `app/` (o caminho de destino pode conter espacos - use aspas):
```bash
REMOTE="/Workspace/Users/<seu-email>/.../data-maturity-compass"
databricks sync . "$REMOTE" \
  --exclude ".venv" --exclude "__pycache__" --exclude "data" \
  --exclude "simulations/output" --exclude "*.pyc" --full -p <perfil>
```
O frontend ja esta pronto em `frontend/dist/` (nao ha build). Nao exclua essa pasta.

## 2. Criar o app
```bash
databricks apps create data-maturity-compass \
  --description "Data Maturity Compass (Databricks)" -p <perfil>
```
Anote no output o `service_principal_client_id` (ex.: `9b26...`) e o `url`.

## 3. Configurar o app.yaml (env)
No `app.yaml`, defina o catalogo, o schema e o warehouse:
```yaml
env:
  - name: UC_CATALOG
    value: '<seu_catalogo>'
  - name: UC_SCHEMA
    value: 'data_maturity_compass'
  - name: WAREHOUSE_ID
    value: '<id_do_warehouse>'
  # APP_MODE: 'internal' (default, mostra recursos internos de SA) ou 'client'.
```

## 4. Anexar o SQL warehouse como recurso do app
Concede ao service principal do app permissao de uso do warehouse (CAN_USE):
```bash
databricks apps update data-maturity-compass --json '{
  "resources": [{
    "name": "warehouse",
    "sql_warehouse": { "id": "<id_do_warehouse>", "permission": "CAN_USE" }
  }]
}' -p <perfil>
```

## 5. Conceder privilegios no Unity Catalog ao service principal (passo essencial)
O app cria e usa as tabelas com a identidade do seu SP. Crie o schema e conceda os
privilegios (via Statement Execution API). Substitua `<SP>` pelo `service_principal_client_id`
do passo 2:
```bash
WID="<id_do_warehouse>"; CAT="<seu_catalogo>"; SP="<service_principal_client_id>"
run() { databricks api post /api/2.0/sql/statements --json "{\"warehouse_id\":\"$WID\",\"statement\":\"$1\",\"wait_timeout\":\"50s\"}" -p <perfil>; }
run "CREATE SCHEMA IF NOT EXISTS $CAT.data_maturity_compass"
run "GRANT USE CATALOG ON CATALOG $CAT TO \`$SP\`"
run "GRANT USE SCHEMA, CREATE TABLE ON SCHEMA $CAT.data_maturity_compass TO \`$SP\`"
```

## 6. Deploy
```bash
databricks apps deploy data-maturity-compass --source-code-path "$REMOTE" -p <perfil>
```

## 7. Verificar
```bash
databricks apps get data-maturity-compass -p <perfil> -o json   # app_status.state = RUNNING
databricks apps logs data-maturity-compass -p <perfil>          # "Application startup complete"
```
As 5 tabelas Delta sao criadas automaticamente no startup. Teste a API com um Bearer token do
seu usuario:
```bash
URL=$(databricks apps get data-maturity-compass -p <perfil> -o json | python3 -c "import sys,json;print(json.load(sys.stdin)['url'])")
TOKEN=$(databricks auth token -p <perfil> | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s -H "Authorization: Bearer $TOKEN" "$URL/healthz"
```

## Deploy no ambiente do CLIENTE (modo cliente)

Cada cliente roda o **mesmo app** no proprio workspace (o SSO do cliente controla o acesso; o
responsavel envia os links para as areas/BUs responderem). Diferenca: no modo cliente o app
**nao exibe recursos internos de SA** (go/*, decks internos) - apenas documentacao publica
oficial e o conceito original.

Passos iguais aos de cima, no workspace do cliente, com `app.yaml`:
```yaml
env:
  - name: APP_MODE
    value: 'client'
  - name: UC_CATALOG
    value: '<catalogo do cliente>'
  - name: UC_SCHEMA
    value: 'data_maturity_compass'
  - name: WAREHOUSE_ID
    value: '<warehouse do cliente>'
```

**Fluxo cliente -> SA:** o cliente responde, gera o relatorio e usa **Exportar (JSON)** em cada
assessment; envia o JSON ao SA, que usa **Importar (JSON)** no app interno (modo `internal`)
para ter a mesma visao consolidada, com historico/ocultar para gerenciar varios clientes.

## Notas

- **Credencial do lakehouse:** o app executa SQL via `w.statement_execution.execute_statement`
  no warehouse, com a identidade do SP do app (nao usa Lakebase nem tokens Postgres).
- **Cache:** estaticos servidos com `no-cache`; os assets tem `?v=` versionado - apos um novo
  deploy, faca hard-refresh (Cmd+Shift+R) uma vez.
- **Sem LLM:** nao usa Foundation Models; nao e necessario serving endpoint.
- **Acesso:** o app fica atras do SSO do workspace; controle quem acessa via permissoes do App.
- **Dados de demo (interno):** `python3 -m simulations.seed_local` (grava no SQLite local).
- **Excluir dados:** na aba Assessments, "Arquivar" move para o historico; no historico,
  "Excluir definitivamente" remove de vez das tabelas de arquivo.
