from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.research import (
    ResearchSearchRequest,
    ResearchSearchResponse,
    ResearchSourceDetail,
)
from app.services.research_service import research_service

router = APIRouter(prefix="/research", tags=["Legal Research"])

@router.post(
    "/search",
    response_model=ResearchSearchResponse,
    summary="Search verified legal sources and jurisprudence"
)
async def search_sources(
    payload: ResearchSearchRequest,
    db: Session = Depends(get_db)
):
    """
    Searches statutory provisions, judicial precedents, and regulations.
    - Decoupled via the stable LegalRetriever interface.
    - Preserves citation metadata and provides explicit empty results when no sources match.
    - Distinguishes authentic records from development fixtures.
    """
    try:
        result = await research_service.search(
            db=db,
            query=payload.query,
            jurisdiction=payload.jurisdiction,
            source_types=payload.source_types,
            limit=payload.limit,
            offset=payload.offset
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Legal research query execution error: {str(e)}"
        )

@router.get(
    "/sources/{source_id}",
    response_model=ResearchSourceDetail,
    summary="Get detailed text and analysis for a legal source"
)
async def get_source(source_id: str):
    """
    Retrieves full text, citation, and judicial summary for a specific legal source id.
    """
    doc = await research_service.get_source_by_id(source_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Legal source '{source_id}' not found."
        )
    return doc
