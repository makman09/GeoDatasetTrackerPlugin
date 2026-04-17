"""initial

Revision ID: 0001
Revises:
Create Date: 2026-04-13

"""
from alembic import op
from sqlmodel import SQLModel

from app import models  # noqa: F401

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    SQLModel.metadata.create_all(bind, tables=[SQLModel.metadata.tables["geodataset"]])


def downgrade() -> None:
    bind = op.get_bind()
    SQLModel.metadata.drop_all(bind, tables=[SQLModel.metadata.tables["geodataset"]])
