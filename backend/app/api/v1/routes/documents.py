import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.document import SimplificationResult
from app.api.deps import get_current_user
from app.schemas.document import (
    DocumentResponse,
    PastedTextCreate,
    SimplificationRequest,
    SimplificationResultResponse,
    DocumentDeleteResponse,
)
from app.services.document.simplifier_service import simplifier_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and extract legal document (PDF, DOCX, TXT)"
)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Securely uploads a legal document to private storage, validates format and size,
    and extracts text layer. Returns document ID and processing status.
    """
    filename = file.filename or "uploaded_document.pdf"
    content = await file.read()

    doc = simplifier_service.create_document_from_upload(
        db=db,
        user_id=current_user.id,
        filename=filename,
        mime_type=file.content_type or "application/octet-stream",
        file_bytes=content
    )
    return doc


@router.post(
    "/text",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create document from pasted legal text"
)
def create_from_text(
    payload: PastedTextCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a document directly from user-pasted text, bypassing file upload.
    """
    doc = simplifier_service.create_document_from_text(
        db=db,
        user_id=current_user.id,
        title=payload.title or "Pasted Document",
        raw_text=payload.text
    )
    return doc


@router.get(
    "",
    response_model=List[DocumentResponse],
    summary="List all documents owned by current user"
)
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all documents owned by the authenticated user.
    """
    return simplifier_service.list_documents(db=db, user_id=current_user.id)


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document details and extracted text"
)
def get_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves document metadata and extracted text.
    Enforces that only the document owner can access it.
    """
    doc = simplifier_service.get_document(db=db, document_id=document_id, user_id=current_user.id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )
    return doc


@router.post(
    "/{document_id}/simplify",
    response_model=SimplificationResultResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Simplify legal document using AI"
)
async def simplify_document(
    document_id: uuid.UUID,
    payload: SimplificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes AI simplification for an uploaded or pasted document.
    Instructs the AI engine to translate complex clauses to plain language,
    preserves critical terms and numbers, and integrates relevant RAG sources.
    """
    result = await simplifier_service.simplify_document(
        db=db,
        document_id=document_id,
        user_id=current_user.id,
        level=payload.level,
        preserve_legal_terms=payload.preserve_legal_terms,
        explain_terminology=payload.explain_terminology,
        language=payload.language
    )
    return result


@router.get(
    "/{document_id}/simplifications/{result_id}",
    response_model=SimplificationResultResponse,
    summary="Get a specific simplification result"
)
def get_simplification_result(
    document_id: uuid.UUID,
    result_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves a past simplification result for a document owned by the user.
    """
    doc = simplifier_service.get_document(db=db, document_id=document_id, user_id=current_user.id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )

    result = db.query(SimplificationResult).filter(
        SimplificationResult.id == result_id,
        SimplificationResult.document_id == document_id,
        SimplificationResult.user_id == current_user.id
    ).first()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simplification result '{result_id}' not found."
        )

    return result


@router.delete(
    "/{document_id}",
    response_model=DocumentDeleteResponse,
    summary="Delete a document and its stored file"
)
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes the document record and removes the file from private storage.
    """
    success = simplifier_service.delete_document(db=db, document_id=document_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )
    return DocumentDeleteResponse(document_id=document_id, success=True)
