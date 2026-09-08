"""
Certifica — FastAPI Application Entrypoint.

Hub multi-tenant de preparação para certificações Databricks (simulados +
flashcards), com banco em Postgres (Lakebase/RDS) e geração de questões via
Foundation Model API.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.config import get_settings
from app.api import certifications, tests, generate, auth, tracking, tenants

logging.basicConfig(
    level=getattr(logging, get_settings().LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, default_limits=["300/minute"])
STATIC_DIR = Path(__file__).parent.parent / "static"
PUBLIC_BASE_PATH = "/people"
API_PREFIX = f"{PUBLIC_BASE_PATH}/api"


def _validate_production_settings(s) -> None:
    if str(getattr(s, "APP_ENV", "development")).lower() != "production":
        return
    jwt_secret = str(getattr(s, "JWT_SECRET", "") or "")
    if not jwt_secret or jwt_secret in {
        "dev-secret-change-me",
        "troque-isto-em-producao",
    }:
        raise RuntimeError("JWT_SECRET seguro é obrigatório em produção")
    if getattr(s, "DATABRICKS_SSO_ENABLED", False) and not getattr(s, "DEFAULT_TENANT_SLUG", ""):
        raise RuntimeError("DEFAULT_TENANT_SLUG é obrigatório para SSO em produção")
    if (
        getattr(s, "SEED_ON_STARTUP", False)
        and getattr(s, "superadmin_emails_list", [])
        and not getattr(s, "SEED_ADMIN_PASSWORD", None)
    ):
        raise RuntimeError("SEED_ADMIN_PASSWORD explícito é obrigatório em produção")


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    _validate_production_settings(s)
    logger.info(f"{s.APP_NAME} iniciando em modo {'MOCK' if s.MOCK_MODE else 'DB'}")
    if not s.MOCK_MODE:
        try:
            from app.db import is_db_ready
            ready = await asyncio.to_thread(is_db_ready)
            logger.info(f"Postgres pronto: {ready}")
            if not ready:
                raise RuntimeError("Postgres não está pronto")
        except Exception:
            logger.exception("Postgres não inicializou; abortando startup")
            raise
        if s.SEED_ON_STARTUP:
            try:
                from seed.seed_db import run_seed
                logger.info("SEED_ON_STARTUP=true — semeando schema/dados (idempotente)...")
                await asyncio.to_thread(run_seed)
            except Exception:
                logger.exception("Seed no startup falhou; abortando startup")
                raise
    yield
    logger.info(f"{s.APP_NAME} encerrando")


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(
        title=s.APP_NAME,
        description="Multi-tenant hub for Databricks certification prep",
        version="1.0.0",
        docs_url=f"{API_PREFIX}/docs",
        openapi_url=f"{API_PREFIX}/openapi.json",
        lifespan=lifespan,
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["auth"])
    app.include_router(tenants.router, prefix=API_PREFIX, tags=["tenants"])
    app.include_router(certifications.router, prefix=f"{API_PREFIX}/certifications", tags=["certifications"])
    app.include_router(tests.router, prefix=f"{API_PREFIX}/tests", tags=["tests"])
    app.include_router(generate.router, prefix=f"{API_PREFIX}/generate", tags=["generate"])
    app.include_router(tracking.router, prefix=API_PREFIX, tags=["tracking"])

    @app.get(f"{API_PREFIX}/health")
    def health():
        return {
            "status": "ok",
            "mode": "mock" if s.MOCK_MODE else "lakebase",
            "llm_endpoint": s.LLM_ENDPOINT,
            "version": "1.0.0",
        }

    # Serve React SPA (produção)
    if STATIC_DIR.exists():
        assets_dir = STATIC_DIR / "assets"
        if assets_dir.exists():
            app.mount(
                f"{PUBLIC_BASE_PATH}/assets",
                StaticFiles(directory=str(assets_dir)),
                name="people-assets",
            )

        @app.get(PUBLIC_BASE_PATH, include_in_schema=False)
        def people_root():
            index = STATIC_DIR / "index.html"
            if index.exists():
                return FileResponse(str(index))
            return JSONResponse({"error": "Frontend não encontrado"}, status_code=404)

        @app.get(f"{PUBLIC_BASE_PATH}/{{full_path:path}}")
        def spa_catch_all(request: Request, full_path: str):
            if full_path.startswith("api/"):
                return JSONResponse({"error": "Not found"}, status_code=404)
            # arquivos estáticos da raiz (logo, favicon, etc.)
            if full_path:
                static_root = STATIC_DIR.resolve()
                candidate = (static_root / full_path).resolve()
                if candidate.is_relative_to(static_root) and candidate.is_file():
                    return FileResponse(str(candidate))
            index = STATIC_DIR / "index.html"
            if index.exists():
                return FileResponse(str(index))
            return JSONResponse({"error": "Frontend não encontrado"}, status_code=404)
    else:
        logger.warning("Static não encontrado — apenas API disponível")

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8005, reload=True)
