import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.document import (
    NoticeReplyCreate,
    NoticeReplyUpdate,
    NoticeReplyRegenerateRequest,
    NoticeReplyResponse,
    NoticeReplyDeleteResponse,
)
from app.services.document.notice_reply_service import notice_reply_service

router = APIRouter(prefix="/notice-replies", tags=["Notice Reply"])


@router.post("", response_model=NoticeReplyResponse, status_code=status.HTTP_201_CREATED)
def create_notice_reply(
    payload: NoticeReplyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new notice reply record from uploaded document or direct text.
    """
    return notice_reply_service.create_notice_reply(
        db=db,
        user_id=current_user.id,
        document_id=payload.document_id,
        notice_text=payload.notice_text,
        title=payload.title,
        tone=payload.tone,
        language=payload.language,
        jurisdiction=payload.jurisdiction
    )


@router.get("", response_model=List[NoticeReplyResponse])
def list_notice_replies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all notice reply records owned by the authenticated user.
    """
    return notice_reply_service.list_notice_replies(db=db, user_id=current_user.id)


@router.get("/{reply_id}", response_model=NoticeReplyResponse)
def get_notice_reply(
    reply_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves a single notice reply record scoped to the authenticated owner.
    """
    reply = notice_reply_service.get_notice_reply(db=db, reply_id=reply_id, user_id=current_user.id)
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notice reply record '{reply_id}' not found."
        )
    return reply


@router.patch("/{reply_id}", response_model=NoticeReplyResponse)
def update_notice_reply(
    reply_id: uuid.UUID,
    payload: NoticeReplyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates user responses to allegations or user-edited reply text.
    """
    return notice_reply_service.update_notice_reply(
        db=db,
        reply_id=reply_id,
        user_id=current_user.id,
        title=payload.title,
        tone=payload.tone,
        language=payload.language,
        user_responses=payload.user_responses,
        user_edited_reply=payload.user_edited_reply,
        status_val=payload.status
    )


@router.post("/{reply_id}/analyze", response_model=NoticeReplyResponse)
async def analyze_notice(
    reply_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyzes the notice text, extracting deadlines and granular allegations/demands.
    """
    return await notice_reply_service.analyze_notice(
        db=db,
        reply_id=reply_id,
        user_id=current_user.id
    )


@router.post("/{reply_id}/generate", response_model=NoticeReplyResponse)
async def generate_reply(
    reply_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a formal legal reply based on the notice and user-supplied positions.
    """
    return await notice_reply_service.generate_reply(
        db=db,
        reply_id=reply_id,
        user_id=current_user.id
    )


@router.post("/{reply_id}/regenerate", response_model=NoticeReplyResponse)
async def regenerate_reply(
    reply_id: uuid.UUID,
    payload: NoticeReplyRegenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Regenerates the reply or adjusts sections without losing core facts.
    """
    return await notice_reply_service.regenerate_reply(
        db=db,
        reply_id=reply_id,
        user_id=current_user.id,
        section=payload.section,
        additional_instructions=payload.additional_instructions
    )


@router.delete("/{reply_id}", response_model=NoticeReplyDeleteResponse)
def delete_notice_reply(
    reply_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permanently deletes a notice reply record.
    """
    success = notice_reply_service.delete_notice_reply(
        db=db,
        reply_id=reply_id,
        user_id=current_user.id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notice reply record '{reply_id}' not found."
        )
    return NoticeReplyDeleteResponse(reply_id=reply_id)
