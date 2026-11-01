import uuid
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.document import NoticeReply, Document
from app.services.gemini_service import gemini_service
from app.services.retrieval.rag_retriever import persistent_rag_retriever
from app.services.document.extractor import document_extractor

logger = logging.getLogger(__name__)


class NoticeReplyService:
    """
    Core service managing legal notice intake, breakdown into discrete allegations/demands,
    factual posture tracking, statutory RAG verification, and formal reply generation.
    """

    @staticmethod
    def create_notice_reply(
        db: Session,
        user_id: uuid.UUID,
        document_id: Optional[uuid.UUID] = None,
        notice_text: Optional[str] = None,
        title: Optional[str] = "Reply to Legal Notice",
        tone: str = "firm",
        language: str = "en",
        jurisdiction: str = "India"
    ) -> NoticeReply:
        extracted_content = ""

        # If document_id provided, fetch extracted text from user's Document
        if document_id:
            stmt = select(Document).where(
                Document.id == document_id,
                Document.user_id == user_id
            )
            doc = db.scalar(stmt)
            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Uploaded document '{document_id}' not found."
                )
            if not doc.extracted_text:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The uploaded notice file contains no extracted text."
                )
            extracted_content = doc.extracted_text
        elif notice_text and notice_text.strip():
            extracted_content = document_extractor.normalize_text(notice_text.strip())
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either an uploaded document_id or direct notice_text must be provided."
            )

        if len(extracted_content) < 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Notice text is too brief to analyze. Please provide the complete notice text."
            )

        reply_record = NoticeReply(
            id=uuid.uuid4(),
            user_id=user_id,
            document_id=document_id,
            title=title.strip() if title else "Reply to Legal Notice",
            status="uploaded",
            tone=tone,
            language=language,
            jurisdiction=jurisdiction,
            raw_notice_text=extracted_content,
            extracted_notice_details={},
            allegations_and_demands=[],
            user_responses={},
            generated_reply=None,
            user_edited_reply=None,
            explanatory_notes=None,
            retrieved_sources=None
        )

        db.add(reply_record)
        db.commit()
        db.refresh(reply_record)
        return reply_record

    @staticmethod
    def get_notice_reply(
        db: Session,
        reply_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[NoticeReply]:
        stmt = select(NoticeReply).where(
            NoticeReply.id == reply_id,
            NoticeReply.user_id == user_id
        )
        return db.scalar(stmt)

    @staticmethod
    def list_notice_replies(
        db: Session,
        user_id: uuid.UUID
    ) -> List[NoticeReply]:
        stmt = (
            select(NoticeReply)
            .where(NoticeReply.user_id == user_id)
            .order_by(NoticeReply.updated_at.desc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def update_notice_reply(
        db: Session,
        reply_id: uuid.UUID,
        user_id: uuid.UUID,
        title: Optional[str] = None,
        tone: Optional[str] = None,
        language: Optional[str] = None,
        user_responses: Optional[Dict[str, Any]] = None,
        user_edited_reply: Optional[str] = None,
        status_val: Optional[str] = None
    ) -> NoticeReply:
        reply = NoticeReplyService.get_notice_reply(db, reply_id, user_id)
        if not reply:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notice reply record '{reply_id}' not found."
            )

        if title is not None:
            reply.title = title.strip()
        if tone is not None:
            reply.tone = tone
        if language is not None:
            reply.language = language
        if user_responses is not None:
            reply.user_responses = user_responses
        if user_edited_reply is not None:
            reply.user_edited_reply = user_edited_reply
            reply.status = "edited"
        if status_val is not None:
            reply.status = status_val

        db.commit()
        db.refresh(reply)
        return reply

    @staticmethod
    def delete_notice_reply(
        db: Session,
        reply_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> bool:
        reply = NoticeReplyService.get_notice_reply(db, reply_id, user_id)
        if not reply:
            return False
        db.delete(reply)
        db.commit()
        return True

    @classmethod
    async def analyze_notice(
        cls,
        db: Session,
        reply_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> NoticeReply:
        reply = cls.get_notice_reply(db, reply_id, user_id)
        if not reply:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notice reply record '{reply_id}' not found."
            )

        analysis = await gemini_service.analyze_legal_notice(reply.raw_notice_text)
        reply.extracted_notice_details = analysis.get("notice_details") or {}
        reply.allegations_and_demands = analysis.get("allegations_and_demands") or []
        reply.status = "analyzed"

        db.commit()
        db.refresh(reply)
        return reply

    @classmethod
    async def generate_reply(
        cls,
        db: Session,
        reply_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> NoticeReply:
        reply = cls.get_notice_reply(db, reply_id, user_id)
        if not reply:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notice reply record '{reply_id}' not found."
            )

        if reply.status == "uploaded" or not reply.allegations_and_demands:
            await cls.analyze_notice(db, reply_id, user_id)
            reply = cls.get_notice_reply(db, reply_id, user_id)

        # Check RAG statutory grounding if statutory issues or Section 138 / Contract breach mentioned
        details = reply.extracted_notice_details or {}
        matter_info = (reply.user_responses or {}).get("matter_info") or {}
        search_query = f"{details.get('notice_subject', '')} {details.get('consequences_asserted', '')} {matter_info.get('relevant_statute', '')}".strip()

        retrieved_sources_json = []
        retrieved_docs = []
        if len(search_query) > 15 and any(w in search_query.lower() for w in ["section", "act", "cheque", "dishonour", "138", "consumer", "arbitration", "specific relief", "damages"]):
            try:
                rag_res = await persistent_rag_retriever.retrieve(
                    query=search_query[:300],
                    jurisdiction=reply.jurisdiction,
                    top_k=3
                )
                if hasattr(rag_res, "documents") and rag_res.documents:
                    retrieved_docs = rag_res.documents
                    for d in rag_res.documents:
                        excerpt = getattr(d, "content_excerpt", getattr(d, "excerpt", ""))
                        retrieved_sources_json.append({
                            "id": getattr(d, "id", str(uuid.uuid4())),
                            "title": getattr(d, "title", "Statutory Precedent"),
                            "citation": getattr(d, "citation", ""),
                            "source_type": getattr(d, "source_type", "statute"),
                            "excerpt": excerpt[:300],
                            "confidence_score": getattr(d, "confidence_score", 0.85)
                        })
            except Exception as e:
                logger.warning(f"RAG lookup in notice reply generation encountered: {e}")

        res = await gemini_service.generate_notice_reply(
            notice_details=reply.extracted_notice_details,
            allegations=reply.allegations_and_demands,
            user_responses=reply.user_responses,
            retrieved_documents=retrieved_docs,
            tone=reply.tone,
            language=reply.language,
            jurisdiction=reply.jurisdiction
        )

        content = res.get("reply_content", "")
        reply.generated_reply = content
        if not reply.user_edited_reply:
            reply.user_edited_reply = content
        reply.explanatory_notes = res.get("explanatory_notes")
        reply.retrieved_sources = retrieved_sources_json
        reply.status = "generated"

        db.commit()
        db.refresh(reply)
        return reply

    @classmethod
    async def regenerate_reply(
        cls,
        db: Session,
        reply_id: uuid.UUID,
        user_id: uuid.UUID,
        section: Optional[str] = None,
        additional_instructions: Optional[str] = None
    ) -> NoticeReply:
        reply = cls.get_notice_reply(db, reply_id, user_id)
        if not reply:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notice reply record '{reply_id}' not found."
            )

        if additional_instructions:
            user_resp = dict(reply.user_responses or {})
            matter_info = dict(user_resp.get("matter_info") or {})
            existing = matter_info.get("additional_instructions") or ""
            matter_info["additional_instructions"] = f"{existing}\n[Adjustment Request]: {additional_instructions}".strip()
            user_resp["matter_info"] = matter_info
            reply.user_responses = user_resp

        return await cls.generate_reply(db, reply_id, user_id)


notice_reply_service = NoticeReplyService()
