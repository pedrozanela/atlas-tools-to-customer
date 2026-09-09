# Atlas — Guia de Deploy (para agente de coding / Genie Code)

Você é um agente encarregado de fazer o deploy do **Atlas** (suíte de discovery da Databricks:
TAP, Maturity/MAS, Operating Model, WAF, Forge e People/Certifica) como **um único
Databricks App** no workspace do cliente. Siga este guia na ordem. Ele já incorpora
correções e pega os erros conhecidos — não improvise fora daqui sem necessidade.

> **Nota:** este pacote já traz 2 correções aplicadas em relação ao upstream:
> (1) `apps/people/package.json` — o `build` não roda mais `typecheck` (evita um erro
> de conflito `@types/react` 18 vs 19 que não afeta runtime);
> (2) `notebooks/deploy_atlas.py` — `configure_lakebase_role` faz `GRANT CREATE ON DATABASE`
> ao role `atlas-admin` (sem isso o módulo People/Certifica crasha no boot com
> "permission denied for database"). **Não reverta essas duas mudanças.**

## Modelo de deploy
O deploy tem duas partes:
- **Parte A — Build do artefato** numa máquina com Node (FORA do Databricks). O notebook
  de deploy roda em serverless, que **não** é ambiente de build.
- **Parte B — Rodar `notebooks/deploy_atlas.py`** no workspace. Ele provisiona tudo numa
  execução (Lakebase, Unity Catalog, secrets, role, o App), baixando o artefato de um Volume.

## Pré-requisitos
**Workspace (o usuário que faz o deploy precisa de):**
- Serverless notebooks habilitado
- Permissão para gerenciar: Databricks Apps, SQL Warehouses, Secrets, Lakebase e os
  objetos de Unity Catalog (catálogo/schema/tabela) alvo
- Um SQL Warehouse ativo (anote o `warehouse_id`)
- Lakebase habilitado
- Um endpoint de Foundation Model para o Certifica (ex.: um `databricks-claude-*` que esteja `READY`)
- *(Opcional)* Preview "Agent Mode APIs for Genie Agents" — só se quiser as recomendações
  automáticas do WAF. O resto funciona sem isso.

**Máquina de build:** Node **20, 22 ou 24** (NÃO use Node 25 — quebra o build) + npm.

---

## Parte A — Build do artefato

```bash
unzip databricks-atlas-tools-CORRIGIDO.zip
cd databricks-atlas-tools-main

# 1) Instale EXATAMENTE o lockfile. Use `npm ci`, não `npm install`
#    (install re-resolve deps e recria o conflito @types/react).
npm ci

# 2) Build dos 6 módulos + empacotamento dos bundles standalone em chunks
npm run prepare:deploy

# 3) PASSO OBRIGATÓRIO e fácil de esquecer: gerar os SQLs de schema do Lakebase.
#    Sem isto o notebook de deploy falha em "Prebuilt artifact is missing
#    serverless Lakebase schema SQL". (Gera resources/lakebase-schema/*.sql)
node scripts/generate-lakebase-schema-sql.mjs

# 4) Empacote o artefato pré-buildado (~70 MB)
zip -r atlas-prebuilt.zip . \
  -x ".git/*" "node_modules/*" "apps/*/node_modules/*" \
     ".turbo/*" "apps/*/.turbo/*" "apps/*/.next/*"
```

**Se o `npm ci` falhar com `ECONNREFUSED` em `registry.npmjs.org`:** sua rede bloqueia o
registry público. Use o mirror npm corporativo:
`npm ci --registry=https://<seu-mirror-npm>/ --no-audit --no-fund`.

**Validação do artefato antes de subir** — precisa existir chunk para os 5 apps Next e os SQLs:
```bash
for a in forge waf tap mas web; do ls apps/$a/standalone.tar.gz.part-* >/dev/null && echo "$a OK"; done
ls resources/lakebase-schema/forge.sql resources/lakebase-schema/waf.sql resources/lakebase-schema/mas.sql
```

---

## Parte B — Deploy no workspace

### B.1 — Subir o artefato para um Volume do Unity Catalog
Crie (ou reutilize) um Volume e faça upload do `atlas-prebuilt.zip`. Via CLI:
```bash
PROFILE=<seu-profile>
databricks schemas create atlas <catalogo> --profile $PROFILE            # se ainda não existir
databricks volumes create <catalogo> atlas artifacts MANAGED --profile $PROFILE
databricks fs cp atlas-prebuilt.zip \
  dbfs:/Volumes/<catalogo>/atlas/artifacts/atlas-prebuilt.zip \
  --overwrite --profile $PROFILE
```
Anote o caminho final: `/Volumes/<catalogo>/atlas/artifacts/atlas-prebuilt.zip`.

### B.2 — Importar o notebook de deploy
Importe `notebooks/deploy_atlas.py` para o workspace, por ex.:
```bash
databricks workspace import /Users/<voce>/atlas/deploy_atlas \
  --file notebooks/deploy_atlas.py --language PYTHON --format SOURCE --overwrite --profile $PROFILE
```
(Ou simplesmente importe a pasta do projeto pela UI.)

### B.3 — Rodar o notebook
Duas opções — escolha a que couber no seu ambiente.

**Opção 1 (mais simples): interativo.** Abra o notebook em **compute serverless**, preencha
os widgets (tabela abaixo) e rode todas as células.

**Opção 2 (automatizável): job serverless via CLI.** O notebook lê o token do próprio
contexto, então funciona como job. Crie `run.json` (ajuste os valores) e submeta:
```json
{
  "run_name": "atlas-deploy",
  "timeout_seconds": 5400,
  "tasks": [{
    "task_key": "deploy_atlas",
    "notebook_task": {
      "notebook_path": "/Users/<voce>/atlas/deploy_atlas",
      "base_parameters": {
        "app_name": "atlas",
        "company_name": "<Nome do Cliente>",
        "company_industry": "<Setor>",
        "warehouse_id": "<warehouse_id>",
        "uc_catalog": "<catalogo>",
        "uc_schema": "tap",
        "certifica_llm_endpoint": "<endpoint-foundation-model>",
        "certifica_superadmin_emails": "<email-admin>",
        "prebuilt_artifact_url": "/Volumes/<catalogo>/atlas/artifacts/atlas-prebuilt.zip",
        "run_app": "true",
        "smoke_test": "true"
      }
    }
  }]
}
```
```bash
databricks jobs submit --json @run.json --profile $PROFILE
```

### Widgets / parâmetros principais
| Widget | O que é | Sugestão |
| --- | --- | --- |
| `app_name` | Nome do Databricks App | `atlas` |
| `company_name` / `company_industry` | Carimbados no TAP/relatórios | nome e setor do cliente |
| `warehouse_id` | SQL Warehouse que o App usa | seu warehouse |
| `uc_catalog` / `uc_schema` | Onde o TAP grava | catálogo existente + `tap` (criar catálogo novo exige privilégio de metastore) |
| `certifica_llm_endpoint` | Foundation Model p/ o Certifica | endpoint `READY` do workspace |
| `certifica_superadmin_emails` | Admin do Certifica | e-mail do admin |
| `prebuilt_artifact_url` | Caminho do Volume (B.1) | `/Volumes/.../atlas-prebuilt.zip` |
| Lakebase (`lakebase_*`) | Compute do Postgres | padrão: 0.5–1 CU, scale-to-zero 300s |

---

## Parte C — Verificação e troubleshooting

Ao terminar, o notebook imprime a URL do App e roda um smoke-test.

**IMPORTANTE — comportamento esperado:** logo após o primeiro start, o smoke-test pode
**falhar por timing** (o backend do People em `/people/api/health` ainda aquecendo) e/ou o
`app_status` pode reportar `CRASHED` de um start anterior. Isso **não** significa que o
deploy quebrou. Verifique o estado real e, se necessário, reinicie:

```bash
# status atual
databricks apps get atlas --profile $PROFILE   # olhe compute_status e app_status

# logs (procure o seed do People e "ready")
databricks apps logs atlas --profile $PROFILE

# se app_status=CRASHED, reinicie e aguarde virar RUNNING
databricks apps stop  atlas --profile $PROFILE
databricks apps start atlas --profile $PROFILE
```

Nos logs, um deploy saudável mostra os 5 módulos `ready at /forge|/waf|/tap|/maturity` e o
People semeando o schema (`[seed] criando schema/tabelas em 'certifica'...`) seguido de
`people ready at /people/api/health`. O aviso `[dashboard] Failed to fetch stats ... No user
identity found` no boot é **normal** (não há usuário na requisição de boot; some quando alguém
acessa autenticado pelo proxy do Apps).

O App fica com `CAN MANAGE` só para o usuário que fez o deploy (por design, não é exposto a
todos os usuários do workspace).

## Teardown
`notebooks/destroy_atlas.py` remove tudo. Roda em `dry_run=true` por padrão — revise o plano
impresso e só então rode com `dry_run=false` digitando `DESTROY <app-name>`.
