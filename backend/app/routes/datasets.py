from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, func, select

from app.db import get_session
from app.models import GeoDataset, Status
from app.schemas import (
    DatasetCreate,
    DatasetListResponse,
    DatasetPatch,
    DatasetRead,
    LookupRequest,
    LookupResponse,
)

router = APIRouter()


@router.get("/healthz")
def healthz() -> dict[str, bool]:
    return {"ok": True}


@router.get("/datasets", response_model=DatasetListResponse)
def list_datasets(
    session: Session = Depends(get_session),
    status: Status | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> DatasetListResponse:
    stmt = select(GeoDataset)
    count_stmt = select(func.count()).select_from(GeoDataset)
    if status is not None:
        stmt = stmt.where(GeoDataset.status == status)
        count_stmt = count_stmt.where(GeoDataset.status == status)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(GeoDataset.title.ilike(pattern))
        count_stmt = count_stmt.where(GeoDataset.title.ilike(pattern))
    stmt = stmt.order_by(GeoDataset.created_at.desc()).offset(offset).limit(limit)
    items = session.exec(stmt).all()
    total = session.exec(count_stmt).one()
    return DatasetListResponse(
        items=[DatasetRead.model_validate(i) for i in items],
        total=int(total),
    )


@router.get("/datasets/{accession}", response_model=DatasetRead)
def get_dataset(accession: str, session: Session = Depends(get_session)) -> DatasetRead:
    row = session.exec(select(GeoDataset).where(GeoDataset.accession == accession)).first()
    if row is None:
        raise HTTPException(status_code=404, detail="dataset not found")
    return DatasetRead.model_validate(row)


@router.post("/datasets", response_model=DatasetRead, status_code=status.HTTP_201_CREATED)
def create_dataset(
    payload: DatasetCreate, session: Session = Depends(get_session)
) -> DatasetRead:
    existing = session.exec(
        select(GeoDataset).where(GeoDataset.accession == payload.accession)
    ).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="accession already exists")
    row = GeoDataset(**payload.model_dump())
    session.add(row)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="accession already exists")
    session.refresh(row)
    return DatasetRead.model_validate(row)


@router.patch("/datasets/{accession}", response_model=DatasetRead)
def patch_dataset(
    accession: str,
    payload: DatasetPatch,
    session: Session = Depends(get_session),
) -> DatasetRead:
    row = session.exec(select(GeoDataset).where(GeoDataset.accession == accession)).first()
    if row is None:
        raise HTTPException(status_code=404, detail="dataset not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    session.refresh(row)
    return DatasetRead.model_validate(row)


@router.delete("/datasets/{accession}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(accession: str, session: Session = Depends(get_session)) -> None:
    row = session.exec(select(GeoDataset).where(GeoDataset.accession == accession)).first()
    if row is None:
        raise HTTPException(status_code=404, detail="dataset not found")
    session.delete(row)
    session.commit()
    return None


@router.post("/datasets/lookup", response_model=LookupResponse)
def lookup_datasets(
    payload: LookupRequest, session: Session = Depends(get_session)
) -> LookupResponse:
    result: dict[str, DatasetRead] = {}
    for item in payload.items:
        row = session.exec(
            select(GeoDataset).where(GeoDataset.accession == item.accession)
        ).first()
        if row is None:
            row = GeoDataset(
                accession=item.accession,
                title=item.title,
                source_url=item.source_url,
                sample_count=item.sample_count,
                platform=item.platform,
                status=Status.NEW,
            )
            session.add(row)
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                row = session.exec(
                    select(GeoDataset).where(GeoDataset.accession == item.accession)
                ).first()
            else:
                session.refresh(row)
        result[item.accession] = DatasetRead.model_validate(row)
    return LookupResponse(datasets=result)
