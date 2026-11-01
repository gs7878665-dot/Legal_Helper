import uuid
import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.document import Document, SimplificationResult
from app.services.document.storage import document_storage
from app.services.document.extractor import document_extractor
from app.services.gemini_service import gemini_service
from app.services.retrieval.rag_retriever import persistent_rag_retriever
from app.config import settings

logger = logging.getLogger(__name__)


class SimplifierService:
    @staticmethod
    def create_document_from_upload(
        db: Session,
        user_id: uuid.UUID,
        filename: str,
        mime_type: str,
        file_bytes: bytes
    ) -> Document:
        """
        Validates, saves to private storage, extracts text, and creates a Document record.
        """
        # 1. Validate file size
        if len(file_bytes) > settings.MAX_DOCUMENT_SIZE_BYTES:
            max_mb = settings.MAX_DOCUMENT_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {max_mb} MB."
            )

        # 2. Validate file extension
        lower_name = filename.lower()
        if not (lower_name.endswith(".pdf") or lower_name.endswith(".docx") or lower_name.endswith(".txt")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. Please upload a PDF (.pdf), Word Document (.docx), or Text file (.txt)."
            )

        doc_id = uuid.uuid4()

        # 3. Save to private isolated storage
        try:
            storage_key = document_storage.save_file(
                user_id=user_id,
                document_id=doc_id,
                filename=filename,
                content=file_bytes
            )
        except Exception as e:
            logger.error(f"Failed to store document file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to securely persist document in storage."
            )

        # 4. Extract and normalize text
        extracted_text = None
        word_count = 0
        error_msg = None
        doc_status = "extracted"

        try:
            extracted_text, word_count = document_extractor.extract_text(
                filename=filename,
                mime_type=mime_type,
                file_bytes=file_bytes
            )
        except ValueError as e:
            doc_status = "failed"
            error_msg = str(e)
            # Create document record with failed status for audit & tracking
            doc = Document(
                id=doc_id,
                user_id=user_id,
                original_filename=filename,
                storage_key=storage_key,
                mime_type=mime_type,
                file_size_bytes=len(file_bytes),
                source_type="upload",
                status=doc_status,
                extracted_text=None,
                word_count=0,
                error_message=error_msg
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=error_msg
            )

        # 5. Persist Document record
        doc = Document(
            id=doc_id,
            user_id=user_id,
            original_filename=filename,
            storage_key=storage_key,
            mime_type=mime_type,
            file_size_bytes=len(file_bytes),
            source_type="upload",
            status=doc_status,
            extracted_text=extracted_text,
            word_count=word_count,
            error_message=None
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    def create_document_from_text(
        db: Session,
        user_id: uuid.UUID,
        title: str,
        raw_text: str
    ) -> Document:
        """
        Creates a Document record directly from user-pasted text.
        """
        normalized = document_extractor.normalize_text(raw_text)
        if not normalized or len(normalized) < 15:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provided text is too short to simplify. Please provide at least one complete legal sentence or clause."
            )

        doc_id = uuid.uuid4()
        clean_title = (title.strip() if title and title.strip() else "Pasted Legal Document")
        if not clean_title.endswith(".txt"):
            filename = f"{clean_title}.txt"
        else:
            filename = clean_title

        text_bytes = normalized.encode("utf-8")
        storage_key = document_storage.save_file(
            user_id=user_id,
            document_id=doc_id,
            filename=filename,
            content=text_bytes
        )

        words = len(normalized.split())

        doc = Document(
            id=doc_id,
            user_id=user_id,
            original_filename=filename,
            storage_key=storage_key,
            mime_type="text/plain",
            file_size_bytes=len(text_bytes),
            source_type="pasted_text",
            status="extracted",
            extracted_text=normalized,
            word_count=words,
            error_message=None
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    def get_document(
        db: Session,
        document_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[Document]:
        """
        Retrieves a document strictly scoped to its authenticated owner.
        """
        stmt = select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id
        )
        return db.scalar(stmt)

    @staticmethod
    def list_documents(
        db: Session,
        user_id: uuid.UUID
    ) -> List[Document]:
        """
        Lists all documents owned by the authenticated user.
        """
        stmt = (
            select(Document)
            .where(Document.user_id == user_id)
            .order_by(Document.created_at.desc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def delete_document(
        db: Session,
        document_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> bool:
        """
        Deletes a document from the database and storage, enforcing ownership.
        """
        stmt = select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id
        )
        doc = db.scalar(stmt)
        if not doc:
            return False

        # Remove physical file
        document_storage.delete_file(doc.storage_key)

        db.delete(doc)
        db.commit()
        return True

    @classmethod
    async def simplify_document(
        cls,
        db: Session,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        level: str = "standard",
        preserve_legal_terms: bool = True,
        explain_terminology: bool = True,
        language: str = "en"
    ) -> SimplificationResult:
        """
        Performs AI simplification for an existing extracted document.
        Uses shared RAG retrieval to provide external statutory definitions if relevant,
        keeping sources strictly separate.
        """
        doc = cls.get_document(db, document_id, user_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{document_id}' not found."
            )

        if not doc.extracted_text or doc.status != "extracted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document text is not available or extraction failed."
            )

        # 1. Query shared RAG retriever for relevant legal context if terminology explanation is requested
        retrieved_sources_data: List[Dict[str, Any]] = []
        retrieved_docs = []

        if explain_terminology:
            try:
                # Query RAG with representative sample text
                sample_query = doc.extracted_text[:400]
                retrieval_result = await persistent_rag_retriever.retrieve(
                    query=sample_query,
                    top_k=2,
                    jurisdiction="India"
                )
                retrieved_docs = retrieval_result.documents if hasattr(retrieval_result, "documents") else (retrieval_result if isinstance(retrieval_result, list) else [])
                for r in retrieved_docs:
                    retrieved_sources_data.append({
                        "id": r.id,
                        "title": r.title,
                        "citation": r.citation or r.title,
                        "source_type": r.source_type,
                        "excerpt": getattr(r, "content_excerpt", getattr(r, "excerpt", "")),
                        "confidence_score": r.confidence_score,
                    })
            except Exception as rag_err:
                logger.warning(f"RAG retrieval skipped during simplification: {rag_err}")

        # 2. Invoke Gemini document simplification
        ai_result = await gemini_service.simplify_legal_document(
            document_text=doc.extracted_text,
            level=level,
            preserve_legal_terms=preserve_legal_terms,
            explain_terminology=explain_terminology,
            retrieved_documents=retrieved_docs,
            language=language
        )

        plain_text_version = ai_result.get("plain_text_version", "")
        if not plain_text_version:
            plain_text_version = ai_result.get("summary", "Document successfully simplified.")

        # 3. Persist SimplificationResult
        result_record = SimplificationResult(
            document_id=doc.id,
            user_id=user_id,
            simplification_level=level,
            language=language,
            preserve_legal_terms=preserve_legal_terms,
            explain_terminology=explain_terminology,
            status="completed",
            simplified_text=plain_text_version,
            structured_output=ai_result,
            retrieved_sources=retrieved_sources_data if retrieved_sources_data else None,
            error_message=None
        )
        db.add(result_record)
        db.commit()
        db.refresh(result_record)
        return result_record


simplifier_service = SimplifierService()
