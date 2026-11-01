import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_optional_current_user
from app.schemas.advisor import (
    AdvisorSessionCreate,
    AdvisorSessionResponse,
    AdvisorMessageCreate,
    AdvisorMessageResponse,
)
from app.services.advisor_service import advisor_service

router = APIRouter(prefix="/advisor", tags=["Legal Advisor"])

@router.post(
    "/sessions",
    response_model=AdvisorSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Legal Advisor session"
)
def create_session(
    payload: AdvisorSessionCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Initializes a new legal inquiry session with optional initial context.
    If the user is authenticated, the session is securely bound to their account.
    """
    session = advisor_service.create_session(
        db=db,
        title=payload.title,
        jurisdiction=payload.jurisdiction,
        context_data=payload.context_data,
        user_id=current_user.id if current_user else None
    )
    return session

@router.get(
    "/sessions/{session_id}",
    response_model=AdvisorSessionResponse,
    summary="Get an Advisor session with conversation history"
)
def get_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Fetches the session record along with all sequential user and assistant messages.
    If session is owned by a specific user, access is restricted to the session owner.
    """
    session = advisor_service.get_session(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Advisor session '{session_id}' not found."
        )

    # Scoped authorization: if session is owned by a user, enforce owner identity
    if session.user_id is not None:
        if not current_user or session.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Advisor session '{session_id}' not found."
            )

    return session

@router.post(
    "/sessions/{session_id}/messages",
    response_model=AdvisorMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message to the Legal Advisor"
)
async def send_message(
    session_id: uuid.UUID,
    payload: AdvisorMessageCreate,
    db: Session = Depends(get_db)
):
    """
    Sends a natural-language legal question or follow-up to the advisor.
    The service:
    1. Validates and saves the user question.
    2. Retrieves relevant statutory / precedent context from the RAG layer.
    3. Prompts the legal AI engine with structured anti-hallucination instructions.
    4. Persists and returns the structured advice, follow-ups, and sources.
    """
    try:
        assistant_message = await advisor_service.process_user_message(
            db=db,
            session_id=session_id,
            content=payload.content,
            jurisdiction=payload.jurisdiction,
            context_data=payload.context_data
        )
        return assistant_message
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing legal advisory query: {str(e)}"
        )
