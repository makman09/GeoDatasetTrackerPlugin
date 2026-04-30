from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models import Status

ACCESSION_PATTERN = r"^GSE\d+$"
PLATFORM_PATTERN = r"^GPL\d+$"
URL_PATTERN = r"^https?://"

AccessionStr = Field(pattern=ACCESSION_PATTERN, max_length=20)
PlatformStr = Field(default=None, pattern=PLATFORM_PATTERN, max_length=20)
TitleStr = Field(max_length=500)
SourceUrlStr = Field(pattern=URL_PATTERN, max_length=2048)
ReasonStr = Field(default=None, max_length=2000)
NotesStr = Field(default=None, max_length=5000)
SampleCount = Field(default=None, ge=0, le=10_000_000)


class DatasetCreate(BaseModel):
    accession: str = AccessionStr
    title: str = TitleStr
    source_url: str = SourceUrlStr
    status: Status = Status.NEW
    reason: str | None = ReasonStr
    notes: str | None = NotesStr
    sample_count: int | None = SampleCount
    platform: str | None = PlatformStr


class DatasetPatch(BaseModel):
    status: Status | None = None
    reason: str | None = ReasonStr
    notes: str | None = NotesStr
    sample_count: int | None = SampleCount
    platform: str | None = PlatformStr
    title: str | None = Field(default=None, max_length=500)
    source_url: str | None = Field(default=None, pattern=URL_PATTERN, max_length=2048)


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
    accession: str = AccessionStr
    title: str = TitleStr
    source_url: str = SourceUrlStr
    sample_count: int | None = SampleCount
    platform: str | None = PlatformStr


class LookupRequest(BaseModel):
    items: list[LookupItem] = Field(max_length=500)


class LookupResponse(BaseModel):
    datasets: dict[str, DatasetRead]
