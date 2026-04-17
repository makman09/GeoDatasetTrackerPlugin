import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.datasets import router as datasets_router


def _run_migrations() -> None:
    root = Path(__file__).resolve().parent.parent
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    db_url = os.environ.get("DATABASE_URL", "sqlite:////data/geo.db")
    cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(cfg, "head")


app = FastAPI(title="GEO Dataset Collector")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.ncbi.nlm.nih.gov"],
    allow_origin_regex=r"^(moz-extension://.*|chrome-extension://.*)$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets_router)


@app.on_event("startup")
def _startup() -> None:
    _run_migrations()
