import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.document import (
    DraftCreate,
    DraftUpdate,
    DraftRegenerateRequest,
    LegalDraftResponse,
    DraftDeleteResponse,
)
from app.services.document.drafting_service import drafting_service

router = APIRouter(prefix="/drafts", tags=["Drafting Assistant"])


@router.post("", response_model=LegalDraftResponse, status_code=status.HTTP_201_CREATED)
def create_draft(
    payload: DraftCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new legal draft record scoped to the authenticated user.
    """
    draft = drafting_service.create_draft(
        db=db,
        user_id=current_user.id,
        document_type=payload.document_type,
        title=payload.title,
        tone=payload.tone,
        language=payload.language,
        jurisdiction=payload.jurisdiction,
        structured_inputs=payload.structured_inputs
    )
    return draft


@router.get("", response_model=List[LegalDraftResponse])
def list_drafts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all saved legal drafts for the authenticated user.
    """
    return drafting_service.list_drafts(db=db, user_id=current_user.id)


@router.get("/{draft_id}", response_model=LegalDraftResponse)
def get_draft(
    draft_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves a single legal draft, strictly scoped to the owner.
    """
    draft = drafting_service.get_draft(db=db, draft_id=draft_id, user_id=current_user.id)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Legal draft '{draft_id}' not found."
        )
    return draft


@router.patch("/{draft_id}", response_model=LegalDraftResponse)
def update_draft(
    draft_id: uuid.UUID,
    payload: DraftUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates form details, structured inputs, or user-edited document content.
    """
    return drafting_service.update_draft(
        db=db,
        draft_id=draft_id,
        user_id=current_user.id,
        title=payload.title,
        tone=payload.tone,
        language=payload.language,
        structured_inputs=payload.structured_inputs,
        user_edited_content=payload.user_edited_content,
        status_val=payload.status
    )


@router.post("/{draft_id}/generate", response_model=LegalDraftResponse)
async def generate_draft(
    draft_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a formal legal document from structured inputs using Gemini + RAG.
    """
    return await drafting_service.generate_draft_content(
        db=db,
        draft_id=draft_id,
        user_id=current_user.id
    )


@router.post("/{draft_id}/regenerate", response_model=LegalDraftResponse)
async def regenerate_draft(
    draft_id: uuid.UUID,
    payload: DraftRegenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Regenerates the draft or a section with optional additional instructions.
    """
    return await drafting_service.regenerate_section(
        db=db,
        draft_id=draft_id,
        user_id=current_user.id,
        section=payload.section,
        additional_instructions=payload.additional_instructions
    )


@router.delete("/{draft_id}", response_model=DraftDeleteResponse)
def delete_draft(
    draft_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a legal draft permanently.
    """
    success = drafting_service.delete_draft(
        db=db,
        draft_id=draft_id,
        user_id=current_user.id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Legal draft '{draft_id}' not found."
        )
    return DraftDeleteResponse(draft_id=draft_id)
