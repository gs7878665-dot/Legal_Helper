import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.safety_help import ScamAnalysis
from app.schemas.safety_help import (
    ScamAnalysisCreateRequest,
    ScamAnalysisResponse,
    ScamAnalysisListResponse,
)
from app.services.safety_help_service import safety_help_ai_service

router = APIRouter(prefix="/scam-detector", tags=["scam-detector"])


@router.post("/analyze", response_model=ScamAnalysisResponse, status_code=status.HTTP_201_CREATED)
async def analyze_suspicious_message(
    req: ScamAnalysisCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analyzes untrusted text communication for deceptive patterns, urgency,
    coercion, and credential solicitation.
    """
    analysis_data = await safety_help_ai_service.analyze_scam(
        content=req.submitted_content,
        sender_info=req.sender_info,
        claimed_url=req.claimed_url,
    )

    scam_rec = ScamAnalysis(
        user_id=current_user.id,
        submitted_content=req.submitted_content,
        sender_info=req.sender_info,
        claimed_url=req.claimed_url,
        risk_level=analysis_data.get("risk_level", "inconclusive"),
        confidence_score=analysis_data.get("confidence_score"),
        red_flags=analysis_data.get("red_flags", []),
        plain_explanation=analysis_data.get("plain_explanation", ""),
        safer_next_steps=analysis_data.get("safer_next_steps", []),
        verified_reporting_resources=analysis_data.get("verified_reporting_resources", []),
    )

    db.add(scam_rec)
    db.commit()
    db.refresh(scam_rec)
    return scam_rec


@router.get("/history", response_model=ScamAnalysisListResponse)
def get_user_scam_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns user's own scam analysis history.
    """
    query = (
        db.query(ScamAnalysis)
        .filter(ScamAnalysis.user_id == current_user.id)
        .order_by(ScamAnalysis.created_at.desc())
    )
    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/{analysis_id}", response_model=ScamAnalysisResponse)
def get_scam_analysis(
    analysis_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a specific analysis record owned by the authenticated user.
    """
    rec = (
        db.query(ScamAnalysis)
        .filter(
            ScamAnalysis.id == analysis_id,
            ScamAnalysis.user_id == current_user.id,
        )
        .first()
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis record not found or access denied.",
        )
    return rec


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scam_analysis(
    analysis_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deletes an analysis record owned by the authenticated user.
    """
    rec = (
        db.query(ScamAnalysis)
        .filter(
            ScamAnalysis.id == analysis_id,
            ScamAnalysis.user_id == current_user.id,
        )
        .first()
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis record not found or access denied.",
        )
    db.delete(rec)
    db.commit()
    return None
