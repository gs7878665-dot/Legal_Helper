import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.safety_help import LawyerPreparationSession
from app.schemas.safety_help import (
    LawyerPreparationCreateRequest,
    LawyerPreparationResponse,
    LawyerPreparationListResponse,
)
from app.services.safety_help_service import safety_help_ai_service

router = APIRouter(prefix="/lawyer-preparation", tags=["lawyer-preparation"])


@router.post("", response_model=LawyerPreparationResponse, status_code=status.HTTP_201_CREATED)
async def create_lawyer_preparation(
    req: LawyerPreparationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates a new Lawyer Preparation session.
    Distinguishes user-provided facts from AI interpretation.
    Does not fabricate facts or citations.
    """
    ai_result = await safety_help_ai_service.generate_lawyer_prep(
        category=req.category,
        situation=req.situation_description,
        dates=req.relevant_dates,
        state=req.state,
        city=req.city,
        has_notice=req.has_notice_or_deadline,
        notice_details=req.notice_details,
    )

    session = LawyerPreparationSession(
        user_id=current_user.id,
        category=req.category,
        situation_description=req.situation_description,
        relevant_dates=req.relevant_dates,
        state=req.state,
        city=req.city,
        has_notice_or_deadline=req.has_notice_or_deadline,
        notice_details=req.notice_details,
        case_summary=ai_result.get("case_summary", "Briefing for advocate consultation"),
        user_provided_facts=ai_result.get("user_provided_facts", []),
        ai_interpretation=ai_result.get("ai_interpretation", ""),
        information_to_gather=ai_result.get("information_to_gather", []),
        questions_to_ask=ai_result.get("questions_to_ask", []),
        potential_legal_issues=ai_result.get("potential_legal_issues", []),
        consultation_document=ai_result.get("consultation_document", ""),
    )

    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("", response_model=LawyerPreparationListResponse)
def list_lawyer_preparations(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns authenticated user's saved preparation sessions.
    """
    query = (
        db.query(LawyerPreparationSession)
        .filter(LawyerPreparationSession.user_id == current_user.id)
        .order_by(LawyerPreparationSession.created_at.desc())
    )
    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/{session_id}", response_model=LawyerPreparationResponse)
def get_lawyer_preparation(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a specific preparation session owned by the authenticated user.
    """
    session = (
        db.query(LawyerPreparationSession)
        .filter(
            LawyerPreparationSession.id == session_id,
            LawyerPreparationSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lawyer preparation session not found or access denied.",
        )
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lawyer_preparation(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deletes a preparation session owned by the authenticated user.
    """
    session = (
        db.query(LawyerPreparationSession)
        .filter(
            LawyerPreparationSession.id == session_id,
            LawyerPreparationSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lawyer preparation session not found or access denied.",
        )
    db.delete(session)
    db.commit()
    return None
