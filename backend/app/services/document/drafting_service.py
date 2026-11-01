import uuid
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.document import LegalDraft
from app.services.gemini_service import gemini_service
from app.services.retrieval.rag_retriever import persistent_rag_retriever

logger = logging.getLogger(__name__)


class DraftingService:
    """
    Core service managing guided legal draft workflows, persistence,
    contextual RAG legal statutory grounding, and Gemini draft generation.
    """

    @staticmethod
    def create_draft(
        db: Session,
        user_id: uuid.UUID,
        document_type: str,
        title: str,
        tone: str = "formal",
        language: str = "en",
        jurisdiction: str = "India",
        structured_inputs: Optional[Dict[str, Any]] = None
    ) -> LegalDraft:
        clean_inputs = structured_inputs or {}
        draft = LegalDraft(
            id=uuid.uuid4(),
            user_id=user_id,
            document_type=document_type,
            title=title.strip() if title else f"Draft {document_type.replace('_', ' ').title()}",
            status="draft",
            language=language,
            tone=tone,
            jurisdiction=jurisdiction,
            structured_inputs=clean_inputs,
            generated_content=None,
            user_edited_content=None,
            explanatory_notes=None,
            retrieved_sources=None
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)
        return draft

    @staticmethod
    def list_drafts(
        db: Session,
        user_id: uuid.UUID
    ) -> List[LegalDraft]:
        stmt = (
            select(LegalDraft)
            .where(LegalDraft.user_id == user_id)
            .order_by(LegalDraft.updated_at.desc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_draft(
        db: Session,
        draft_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[LegalDraft]:
        stmt = select(LegalDraft).where(
            LegalDraft.id == draft_id,
            LegalDraft.user_id == user_id
        )
        return db.scalar(stmt)

    @staticmethod
    def update_draft(
        db: Session,
        draft_id: uuid.UUID,
        user_id: uuid.UUID,
        title: Optional[str] = None,
        tone: Optional[str] = None,
        language: Optional[str] = None,
        structured_inputs: Optional[Dict[str, Any]] = None,
        user_edited_content: Optional[str] = None,
        status_val: Optional[str] = None
    ) -> LegalDraft:
        draft = DraftingService.get_draft(db, draft_id, user_id)
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Draft '{draft_id}' not found."
            )

        if title is not None:
            draft.title = title.strip()
        if tone is not None:
            draft.tone = tone
        if language is not None:
            draft.language = language
        if structured_inputs is not None:
            draft.structured_inputs = structured_inputs
        if user_edited_content is not None:
            draft.user_edited_content = user_edited_content
            draft.status = "edited"
        if status_val is not None:
            draft.status = status_val

        db.commit()
        db.refresh(draft)
        return draft

    @staticmethod
    def delete_draft(
        db: Session,
        draft_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> bool:
        draft = DraftingService.get_draft(db, draft_id, user_id)
        if not draft:
            return False
        db.delete(draft)
        db.commit()
        return True

    @classmethod
    async def generate_draft_content(
        cls,
        db: Session,
        draft_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> LegalDraft:
        draft = cls.get_draft(db, draft_id, user_id)
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Draft '{draft_id}' not found."
            )

        inputs = draft.structured_inputs or {}
        facts = inputs.get("facts_and_circumstances") or {}
        legal_provisions = facts.get("legal_provisions") or ""
        what_happened = facts.get("what_happened") or ""

        # Query RAG only if relevant legal provision or complex dispute is stated
        retrieved_sources_json = []
        retrieved_docs = []
        rag_query = f"{legal_provisions} {what_happened}".strip()
        if len(rag_query) > 20 and (legal_provisions or any(w in rag_query.lower() for w in ["section", "act", "rights", "notice", "breach", "complaint", "statutory", "consumer"])):
            try:
                rag_res = await persistent_rag_retriever.retrieve(
                    query=rag_query[:300],
                    jurisdiction=draft.jurisdiction,
                    top_k=3
                )
                if hasattr(rag_res, "documents") and rag_res.documents:
                    retrieved_docs = rag_res.documents
                    for d in rag_res.documents:
                        excerpt = getattr(d, "content_excerpt", getattr(d, "excerpt", ""))
                        retrieved_sources_json.append({
                            "id": getattr(d, "id", str(uuid.uuid4())),
                            "title": getattr(d, "title", "Statutory Source"),
                            "citation": getattr(d, "citation", ""),
                            "source_type": getattr(d, "source_type", "statute"),
                            "excerpt": excerpt[:300],
                            "confidence_score": getattr(d, "confidence_score", 0.85)
                        })
            except Exception as e:
                logger.warning(f"RAG retrieval skipped or failed during draft generation: {e}")

        # Execute draft generation via Gemini
        res = await gemini_service.generate_legal_draft(
            document_type=draft.document_type,
            title=draft.title,
            structured_inputs=inputs,
            retrieved_documents=retrieved_docs,
            tone=draft.tone,
            language=draft.language,
            jurisdiction=draft.jurisdiction
        )

        content = res.get("document_content", "")
        notes = res.get("explanatory_notes", "")

        draft.generated_content = content
        if not draft.user_edited_content:
            draft.user_edited_content = content
        draft.explanatory_notes = notes
        draft.retrieved_sources = retrieved_sources_json
        draft.status = "generated"

        db.commit()
        db.refresh(draft)
        return draft

    @classmethod
    async def regenerate_section(
        cls,
        db: Session,
        draft_id: uuid.UUID,
        user_id: uuid.UUID,
        section: Optional[str] = None,
        additional_instructions: Optional[str] = None
    ) -> LegalDraft:
        draft = cls.get_draft(db, draft_id, user_id)
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Draft '{draft_id}' not found."
            )

        # Merge additional instructions if provided
        inputs = dict(draft.structured_inputs or {})
        if additional_instructions:
            action = dict(inputs.get("requested_action") or {})
            existing_notes = action.get("additional_instructions") or ""
            action["additional_instructions"] = f"{existing_notes}\n[Regeneration Request]: {additional_instructions}".strip()
            inputs["requested_action"] = action
            draft.structured_inputs = inputs

        return await cls.generate_draft_content(db, draft_id, user_id)


drafting_service = DraftingService()
