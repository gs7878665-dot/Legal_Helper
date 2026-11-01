import uuid
import logging
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, desc, asc, cast, Text
from fastapi import HTTPException, status

from app.models.document import Document
from app.services.document.storage import document_storage
from app.services.document.extractor import document_extractor
from app.services.gemini_service import gemini_service
from app.config import settings

logger = logging.getLogger(__name__)

STANDARD_VAULT_CATEGORIES = [
    "Agreements & Contracts",
    "Notices & Replies",
    "Identity & Personal Documents",
    "Property Documents",
    "Court & Case Documents",
    "Financial & Tax Documents",
    "Other",
]


class VaultService:
    @staticmethod
    def create_vault_document_from_upload(
        db: Session,
        user_id: uuid.UUID,
        filename: str,
        mime_type: str,
        file_bytes: bytes,
        title: Optional[str] = None,
        category: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        document_date: Optional[str] = None,
        related_entity: Optional[str] = None,
    ) -> Document:
        """
        Validates file size/format, saves to isolated private storage,
        extracts text layer (if possible), and records metadata in database.
        """
        # 1. Validate file size
        if len(file_bytes) > settings.MAX_DOCUMENT_SIZE_BYTES:
            max_mb = settings.MAX_DOCUMENT_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {max_mb} MB.",
            )

        # 2. Validate file extension
        lower_name = filename.lower()
        if not (lower_name.endswith(".pdf") or lower_name.endswith(".docx") or lower_name.endswith(".txt")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. Legal Vault supports PDF (.pdf), Word Document (.docx), and Text (.txt) files.",
            )

        doc_id = uuid.uuid4()

        # 3. Save to private isolated storage
        try:
            storage_key = document_storage.save_file(
                user_id=user_id,
                document_id=doc_id,
                filename=filename,
                content=file_bytes,
            )
        except Exception as e:
            logger.error(f"Failed to store document file in storage: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to securely persist document file in storage.",
            )

        # 4. Extract text layer
        extracted_text = None
        word_count = 0
        error_msg = None
        doc_status = "extracted"

        try:
            extracted_text, word_count = document_extractor.extract_text(
                filename=filename,
                mime_type=mime_type,
                file_bytes=file_bytes,
            )
        except Exception as e:
            # Document is still stored safely even if text extraction fails (e.g. image-only PDF)
            doc_status = "failed"
            error_msg = str(e)
            logger.info(f"Extraction failed for document {doc_id} ('{filename}'): {error_msg}")

        # 5. Determine title and category defaults
        doc_title = title.strip() if title and title.strip() else filename
        doc_category = category.strip() if category and category.strip() else "Other"
        clean_tags = [t.strip() for t in (tags or []) if t and t.strip()]

        doc = Document(
            id=doc_id,
            user_id=user_id,
            original_filename=filename,
            title=doc_title,
            category=doc_category,
            description=description.strip() if description else None,
            tags=clean_tags,
            document_date=document_date.strip() if document_date else None,
            related_entity=related_entity.strip() if related_entity else None,
            storage_key=storage_key,
            mime_type=mime_type,
            file_size_bytes=len(file_bytes),
            source_type="upload",
            status=doc_status,
            extracted_text=extracted_text,
            word_count=word_count,
            error_message=error_msg,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    def list_vault_documents(
        db: Session,
        user_id: uuid.UUID,
        category: Optional[str] = None,
        search_query: Optional[str] = None,
        file_type: Optional[str] = None,
        tag: Optional[str] = None,
        sort_by: str = "newest",  # "newest", "oldest", "title", "document_date", "size"
        page: int = 1,
        page_size: int = 12,
    ) -> Dict[str, Any]:
        """
        Server-side filtered, sorted, and paginated document list.
        Strictly isolated to current user.
        """
        query = db.query(Document).filter(Document.user_id == user_id)

        # Category filter
        if category and category != "All":
            query = query.filter(Document.category == category)

        # File type filter
        if file_type and file_type != "All":
            ft = file_type.lower()
            if ft == "pdf":
                query = query.filter(Document.original_filename.ilike("%.pdf"))
            elif ft == "docx":
                query = query.filter(Document.original_filename.ilike("%.docx"))
            elif ft == "txt":
                query = query.filter(Document.original_filename.ilike("%.txt"))

        # Search filter (title, description, original_filename, related_entity)
        if search_query and search_query.strip():
            sq = f"%{search_query.strip()}%"
            query = query.filter(
                or_(
                    Document.title.ilike(sq),
                    Document.description.ilike(sq),
                    Document.original_filename.ilike(sq),
                    Document.related_entity.ilike(sq),
                    Document.category.ilike(sq),
                )
            )

        # Tag filter (JSON array contains tag)
        if tag and tag.strip():
            clean_tag = tag.strip().lower()
            # In SQLite or Postgres JSON containment: we can do string match or JSON cast
            query = query.filter(cast(Document.tags, Text).ilike(f"%{clean_tag}%"))

        # Sorting
        if sort_by == "oldest":
            query = query.order_by(asc(Document.created_at))
        elif sort_by == "title":
            query = query.order_by(asc(func.coalesce(Document.title, Document.original_filename)))
        elif sort_by == "document_date":
            query = query.order_by(desc(Document.document_date).nullslast(), desc(Document.created_at))
        elif sort_by == "size":
            query = query.order_by(desc(Document.file_size_bytes))
        else:  # newest default
            query = query.order_by(desc(Document.created_at))

        total_count = query.count()
        total_pages = max(1, (total_count + page_size - 1) // page_size) if total_count > 0 else 1
        safe_page = max(1, min(page, total_pages))
        offset = (safe_page - 1) * page_size

        documents = query.offset(offset).limit(page_size).all()

        # Collect distinct user categories and tags for filter options
        user_categories_query = db.query(Document.category).filter(Document.user_id == user_id).distinct().all()
        user_categories = sorted(list({c[0] for c in user_categories_query if c[0]} | set(STANDARD_VAULT_CATEGORIES)))

        # Collect distinct user tags
        all_tags_set = set()
        user_tags_query = db.query(Document.tags).filter(Document.user_id == user_id).all()
        for row in user_tags_query:
            if row[0] and isinstance(row[0], list):
                for t in row[0]:
                    if t and isinstance(t, str):
                        all_tags_set.add(t.strip())

        return {
            "documents": documents,
            "total_count": total_count,
            "page": safe_page,
            "page_size": page_size,
            "total_pages": total_pages,
            "categories": user_categories,
            "all_tags": sorted(list(all_tags_set)),
        }

    @staticmethod
    def get_vault_document(
        db: Session,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[Document]:
        """Scoped single document retrieval."""
        return db.query(Document).filter(
            Document.id == document_id,
            Document.user_id == user_id,
        ).first()

    @staticmethod
    def update_vault_document(
        db: Session,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        title: Optional[str] = None,
        category: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        document_date: Optional[str] = None,
        related_entity: Optional[str] = None,
    ) -> Optional[Document]:
        """Update editable document metadata."""
        doc = VaultService.get_vault_document(db=db, document_id=document_id, user_id=user_id)
        if not doc:
            return None

        if title is not None:
            doc.title = title.strip() if title.strip() else doc.original_filename
        if category is not None:
            doc.category = category.strip() if category.strip() else "Other"
        if description is not None:
            doc.description = description.strip() if description.strip() else None
        if tags is not None:
            doc.tags = [t.strip() for t in tags if t and t.strip()]
        if document_date is not None:
            doc.document_date = document_date.strip() if document_date.strip() else None
        if related_entity is not None:
            doc.related_entity = related_entity.strip() if related_entity.strip() else None

        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    def delete_vault_document(
        db: Session,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """Deletes database record and securely removes physical file from storage."""
        doc = VaultService.get_vault_document(db=db, document_id=document_id, user_id=user_id)
        if not doc:
            return False

        storage_key = doc.storage_key
        db.delete(doc)
        db.commit()

        # Remove physical file
        try:
            document_storage.delete_file(storage_key)
        except Exception as e:
            logger.warning(f"Could not delete physical file '{storage_key}': {e}")

        return True

    @staticmethod
    def extract_document_text(
        db: Session,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Document:
        """Retry text extraction on an existing document."""
        doc = VaultService.get_vault_document(db=db, document_id=document_id, user_id=user_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

        try:
            file_bytes = document_storage.get_file_bytes(doc.storage_key)
            extracted_text, word_count = document_extractor.extract_text(
                filename=doc.original_filename,
                mime_type=doc.mime_type,
                file_bytes=file_bytes,
            )
            doc.extracted_text = extracted_text
            doc.word_count = word_count
            doc.status = "extracted"
            doc.error_message = None
        except Exception as e:
            doc.status = "failed"
            doc.error_message = str(e)

        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    async def generate_overview(
        db: Session,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Document:
        """Generate AI overview using Gemini service with deterministic fallback."""
        doc = VaultService.get_vault_document(db=db, document_id=document_id, user_id=user_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

        if not doc.extracted_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document text must be extracted before generating an AI overview.",
            )

        overview = await gemini_service.generate_document_overview(
            document_text=doc.extracted_text,
            filename=doc.original_filename,
        )
        doc.ai_overview = overview
        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    def search_vault_content(
        db: Session,
        user_id: uuid.UUID,
        query_text: str,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        Searches across user's documents in both metadata and extracted text.
        Returns matched excerpt snippets.
        """
        if not query_text or not query_text.strip():
            return []

        q = query_text.strip()
        sq = f"%{q}%"

        # Search matching documents
        docs = db.query(Document).filter(
            Document.user_id == user_id,
            or_(
                Document.title.ilike(sq),
                Document.original_filename.ilike(sq),
                Document.description.ilike(sq),
                Document.related_entity.ilike(sq),
                Document.extracted_text.ilike(sq),
                cast(Document.tags, Text).ilike(sq),
            ),
        ).limit(limit).all()

        results = []
        lower_q = q.lower()

        for doc in docs:
            matched_in = "metadata"
            excerpt = None

            if doc.extracted_text and lower_q in doc.extracted_text.lower():
                matched_in = "content"
                # Extract excerpt around query
                idx = doc.extracted_text.lower().find(lower_q)
                start = max(0, idx - 80)
                end = min(len(doc.extracted_text), idx + len(lower_q) + 80)
                prefix = "..." if start > 0 else ""
                suffix = "..." if end < len(doc.extracted_text) else ""
                excerpt = f"{prefix}{doc.extracted_text[start:end].strip()}{suffix}"
            elif doc.title and lower_q in doc.title.lower():
                matched_in = "title"
                excerpt = doc.title
            elif doc.description and lower_q in doc.description.lower():
                matched_in = "description"
                excerpt = doc.description
            elif doc.related_entity and lower_q in doc.related_entity.lower():
                matched_in = "related_entity"
                excerpt = f"Related Entity: {doc.related_entity}"
            else:
                matched_in = "filename"
                excerpt = doc.original_filename

            results.append({
                "document": doc,
                "matched_in": matched_in,
                "matching_excerpt": excerpt,
            })

        return results


vault_service = VaultService()
