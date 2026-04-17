from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app import models  # noqa: F401  -- register tables
from app.db import get_session
from app.main import app


@pytest.fixture()
def engine():
    eng = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(eng)
    try:
        yield eng
    finally:
        SQLModel.metadata.drop_all(eng)
        eng.dispose()


@pytest.fixture()
def session(engine) -> Generator[Session, None, None]:
    with Session(engine) as s:
        yield s


@pytest.fixture()
def client(engine) -> Generator[TestClient, None, None]:
    def _override() -> Generator[Session, None, None]:
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_session] = _override
    # Don't enter TestClient's context manager: that would fire the startup
    # event and run real Alembic migrations against the default DATABASE_URL.
    tc = TestClient(app, raise_server_exceptions=True)
    try:
        yield tc
    finally:
        app.dependency_overrides.clear()
