import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.safety_help import (
    LegalAidItem,
    LegalAidSearchResponse,
    LegalAidLocationsResponse,
)
from app.services.legal_aid_service import LegalAidService

router = APIRouter(prefix="/legal-aid", tags=["legal-aid"])


@router.get("", response_model=LegalAidSearchResponse)
def search_legal_aid(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Search verified legal aid organizations and authorities in India.
    No fake or fabricated organizations.
    """
    items, total, total_pages, states, districts, categories = LegalAidService.search_organizations(
        db=db,
        state=state,
        district=district,
        category=category,
        search_query=q,
        page=page,
        page_size=page_size,
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "available_states": states,
        "available_districts": districts,
        "available_categories": categories,
    }


@router.get("/locations", response_model=LegalAidLocationsResponse)
def get_locations(db: Session = Depends(get_db)):
    """
    Returns available Indian states and districts present in verified data.
    """
    return LegalAidService.get_locations(db)


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """
    Returns categories supported by verified data.
    """
    _, _, _, _, _, categories = LegalAidService.search_organizations(db, page_size=1)
    return {"categories": categories}


@router.get("/{service_id}", response_model=LegalAidItem)
def get_legal_aid_detail(
    service_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Retrieves detailed verified information for a specific legal aid center.
    """
    org = LegalAidService.get_by_id(db, service_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Legal aid organization not found.",
        )
    return org
