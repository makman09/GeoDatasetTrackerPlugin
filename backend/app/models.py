from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Column, String
from sqlmodel import Field, SQLModel


class Status(str, Enum):
    NEW = "NEW"
    REJECTED_COMPLEX = "REJECTED_COMPLEX"
    REJECTED_CELL_CULTURE = "REJECTED_CELL_CULTURE"
    REJECTED_OTHER = "REJECTED_OTHER"
    COLLECTED_TODO = "COLLECTED_TODO"
    COLLECTED_COMPLETE = "COLLECTED_COMPLETE"


class GeoDataset(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    accession: str = Field(sa_column=Column(String, unique=True, index=True, nullable=False))
    title: str
    source_url: str
    status: Status = Field(default=Status.NEW)
    reason: str | None = None
    notes: str | None = None
    sample_count: int | None = None
    platform: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
