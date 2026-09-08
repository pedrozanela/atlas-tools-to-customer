"""
Data Maturity Compass (Databricks) - entrypoint FastAPI.

App para apoiar clientes na jornada de adocao de Data Mesh:
  - educa sobre o que e Data Mesh (paradigma, nao produto) e o espectro de topologias;
  - coleta um assessment de maturidade multi-area (assincrono);
  - gera um relatorio de diagnostico direcionado a produtos/solucoes Databricks,
    recomendando a topologia de Data Mesh adequada a maturidade aferida.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from server import store
from server.routes.api import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tolerante: se o schema/grants ainda nao estiverem prontos (ex.: 1o boot como
    # modulo no Atlas), loga e segue servindo em vez de derrubar o app inteiro.
    try:
        store.init_db()
    except Exception as e:  # noqa: BLE001
        print(f"[maturity] init_db falhou (seguindo mesmo assim): {e}")
    yield


app = FastAPI(title="Maturity & Operating Model Assessment (Databricks)", lifespan=lifespan)
app.include_router(api_router, prefix="/api")

# Base path (ex.: "/moma") quando embarcado como modulo dentro de outro app (Atlas).
# Vazio = app standalone (comportamento atual identico). Ver montagem no fim do arquivo.
_BASE = os.environ.get("APP_BASE_PATH", "").rstrip("/")


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


# Servir o frontend React (build de producao), se existir.
_frontend = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.isdir(_frontend):
    _assets = os.path.join(_frontend, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    # no-cache: forca o navegador/proxy a revalidar os estaticos a cada carga,
    # evitando servir app.js/styles.css/index.html antigos apos um deploy.
    _NOCACHE = {"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache"}

    def _index_html():
        # Injeta o basePath no index (assets relativos + window.__BASE__ p/ API/imports).
        # _BASE vazio -> href="/" e __BASE__="" (identico ao standalone).
        with open(os.path.join(_frontend, "index.html"), encoding="utf-8") as f:
            html = f.read()
        href = (_BASE + "/") if _BASE else "/"
        html = html.replace('<base id="appbase" href="/">', f'<base id="appbase" href="{href}">')
        html = html.replace('window.__BASE__ = "";', f'window.__BASE__ = "{_BASE}";')
        return HTMLResponse(html, headers=_NOCACHE)

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Deixa a API responder; qualquer outra rota cai no index.html (SPA).
        candidate = os.path.join(_frontend, full_path)
        if full_path and os.path.isfile(candidate):
            # .mjs precisa de MIME text/javascript, senao o browser rejeita o modulo ESM (ELK loader).
            _mt = "text/javascript" if full_path.endswith(".mjs") else None
            # libs versionadas (vendor/) podem ser cacheadas (evita rebaixar o mermaid a cada carga)
            if full_path.startswith("vendor/"):
                return FileResponse(candidate, media_type=_mt,
                                    headers={"Cache-Control": "public, max-age=604800"})
            return FileResponse(candidate, media_type=_mt, headers=_NOCACHE)
        return _index_html()


# Quando embarcado como modulo (APP_BASE_PATH set, ex.: "/moma"), monta o app sob o
# basePath para casar com o proxy do shell Atlas (que encaminha /moma/... sem strip).
# Standalone (_BASE vazio) mantem `app` como esta. Mesmo lifespan (store.init_db).
if _BASE:
    _outer = FastAPI(lifespan=lifespan)

    # Serve o index da SPA diretamente no path base (ex.: GET /moma e /moma/),
    # ANTES do mount. Sem isto, o Mount do Starlette redireciona /moma -> /moma/
    # com uma URL absoluta montada a partir do Host que o proxy repassa
    # (localhost:PORT), vazando o host interno para o browser (ERR_CONNECTION_
    # REFUSED). Mesma ideia do modulo People (rota explicita no prefixo base).
    if os.path.isdir(_frontend):
        @_outer.get(_BASE, include_in_schema=False)
        @_outer.get(_BASE + "/", include_in_schema=False)
        async def _serve_base_root():
            return _index_html()

    _outer.mount(_BASE, app)
    app = _outer
