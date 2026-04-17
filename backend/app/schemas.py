from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models import Status


class DatasetCreate(BaseModel):
    accession: str
    title: str
    source_url: str
    status: Status = Status.NEW
    reason: str | None = None
    notes: str | None = None
    sample_count: int | None = None
    platform: str | None = None


class DatasetPatch(BaseModel):
    status: Status | None = None
    reason: str | None = None
    notes: str | None = None
    sample_count: int | None = None
    platform: str | None = None
    title: str | None = None
    source_url: str | None = None


class DatasetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    accession: str
    title: str
    source_url: str
    status: Status
    reason: str | None = None
    notes: str | None = None
    sample_count: int | None = None
    platform: str | None = None
    created_at: datetime
    updated_at: datetime


class DatasetListResponse(BaseModel):
    items: list[DatasetRead]
    total: int


class LookupItem(BaseModel):
    accession: str
    title: str
    source_url: str
    sample_count: int | None = None
    platform: str | None = None


class LookupRequest(BaseModel):
    items: list[LookupItem]


class LookupResponse(BaseModel):
    datasets: dict[str, DatasetRead]
