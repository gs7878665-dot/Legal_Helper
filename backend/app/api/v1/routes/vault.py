import uuid
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.document import (
    DocumentResponse,
    VaultDocumentUpdate,
    VaultDocumentListResponse,
    VaultSearchResponse,
    DocumentDeleteResponse,
)
from app.services.document.vault_service import vault_service
from app.services.document.storage import document_storage

router = APIRouter(prefix="/vault", tags=["Legal Vault"])


@router.post(
    "/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and store a legal document in private vault"
)
async def upload_vault_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    category: Optional[str] = Form("Other"),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # Comma-separated or JSON string
    document_date: Optional[str] = Form(None),
    related_entity: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Securely uploads a legal document into the user's private Legal Vault.
    Validates file format (PDF, DOCX, TXT) and maximum size.
    Extracts text layer asynchronously or synchronously for content searching.
    """
    filename = file.filename or "uploaded_document.pdf"
    content = await file.read()

    # Parse tags if string provided
    parsed_tags = []
    if tags:
        try:
            val = json.loads(tags)
            if isinstance(val, list):
                parsed_tags = [str(t).strip() for t in val if str(t).strip()]
        except Exception:
            parsed_tags = [t.strip() for t in tags.split(",") if t.strip()]

    doc = vault_service.create_vault_document_from_upload(
        db=db,
        user_id=current_user.id,
        filename=filename,
        mime_type=file.content_type or "application/octet-stream",
        file_bytes=content,
        title=title,
        category=category,
        description=description,
        tags=parsed_tags,
        document_date=document_date,
        related_entity=related_entity,
    )
    return doc


@router.get(
    "/documents",
    response_model=VaultDocumentListResponse,
    summary="List, search, filter, and paginate user vault documents"
)
def list_vault_documents(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by title, description, or metadata"),
    file_type: Optional[str] = Query(None, description="Filter by file type: pdf, docx, txt"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    sort_by: str = Query("newest", description="Sort by: newest, oldest, title, document_date, size"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(12, ge=1, le=100, description="Documents per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns server-side paginated documents for the authenticated user,
    with available categories and tags for frontend dynamic filtering.
    """
    result = vault_service.list_vault_documents(
        db=db,
        user_id=current_user.id,
        category=category,
        search_query=search,
        file_type=file_type,
        tag=tag,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )
    return result


@router.get(
    "/documents/{document_id}",
    response_model=DocumentResponse,
    summary="Get vault document details and metadata"
)
def get_vault_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves full metadata and extracted text for a specific document.
    Enforces strict user ownership scoping.
    """
    doc = vault_service.get_vault_document(db=db, document_id=document_id, user_id=current_user.id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )
    return doc


@router.patch(
    "/documents/{document_id}",
    response_model=DocumentResponse,
    summary="Update vault document metadata"
)
def update_vault_document(
    document_id: uuid.UUID,
    payload: VaultDocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates document title, category, description, tags, document date, or related entity.
    """
    doc = vault_service.update_vault_document(
        db=db,
        document_id=document_id,
        user_id=current_user.id,
        title=payload.title,
        category=payload.category,
        description=payload.description,
        tags=payload.tags,
        document_date=payload.document_date,
        related_entity=payload.related_entity,
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )
    return doc


@router.delete(
    "/documents/{document_id}",
    response_model=DocumentDeleteResponse,
    summary="Delete vault document and safe removal of file"
)
def delete_vault_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Permanently deletes the document record and removes the file from private storage.
    """
    success = vault_service.delete_vault_document(
        db=db,
        document_id=document_id,
        user_id=current_user.id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )
    return DocumentDeleteResponse(document_id=document_id, success=True)


@router.get(
    "/documents/{document_id}/download",
    summary="Download original file securely"
)
def download_vault_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Downloads original file with correct headers. Strictly owner-scoped.
    """
    doc = vault_service.get_vault_document(db=db, document_id=document_id, user_id=current_user.id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    try:
        file_bytes = document_storage.get_file_bytes(doc.storage_key)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found in storage.",
        )

    safe_filename = doc.original_filename.replace('"', '\\"')
    return Response(
        content=file_bytes,
        media_type=doc.mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
    )


@router.get(
    "/documents/{document_id}/preview",
    summary="Stream document file for browser inline preview"
)
def preview_vault_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Streams document file for inline browser viewing (e.g. PDF embed or text).
    Strictly scoped to owner.
    """
    doc = vault_service.get_vault_document(db=db, document_id=document_id, user_id=current_user.id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    try:
        file_bytes = document_storage.get_file_bytes(doc.storage_key)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found in storage.",
        )

    safe_filename = doc.original_filename.replace('"', '\\"')
    return Response(
        content=file_bytes,
        media_type=doc.mime_type,
        headers={
            "Content-Disposition": f'inline; filename="{safe_filename}"',
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
    )


@router.post(
    "/documents/{document_id}/extract",
    response_model=DocumentResponse,
    summary="Retry or run text extraction on document"
)
def extract_vault_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Re-runs text extraction for a document whose extraction was pending or failed.
    """
    return vault_service.extract_document_text(
        db=db,
        document_id=document_id,
        user_id=current_user.id,
    )


@router.post(
    "/documents/{document_id}/overview",
    response_model=DocumentResponse,
    summary="Generate AI document overview and key entities"
)
async def generate_vault_overview(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Produces non-blocking AI overview with key dates, parties, and amounts.
    Falls back gracefully if AI service is unconfigured or rate-limited.
    """
    return await vault_service.generate_overview(
        db=db,
        document_id=document_id,
        user_id=current_user.id,
    )


@router.get(
    "/search",
    response_model=VaultSearchResponse,
    summary="Search across metadata and extracted content in user vault"
)
def search_vault(
    q: str = Query(..., min_length=2, description="Search term"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full search across document titles, descriptions, categories, tags,
    and extracted document text layer. Returns matched excerpts.
    """
    matches = vault_service.search_vault_content(
        db=db,
        user_id=current_user.id,
        query_text=q,
        limit=limit,
    )
    return VaultSearchResponse(
        results=matches,
        total_matches=len(matches),
        query=q,
    )
