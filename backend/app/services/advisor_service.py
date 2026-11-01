import uuid
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.advisor import AdvisorSession, AdvisorMessage
from app.services.retrieval.rag_retriever import persistent_rag_retriever
from app.services.retrieval.base import LegalRetriever
from app.services.gemini_service import gemini_service

class AdvisorService:
    def __init__(self, retriever: Optional[LegalRetriever] = None):
        self.retriever = retriever or persistent_rag_retriever

    def create_session(
        self,
        db: Session,
        title: Optional[str] = None,
        jurisdiction: str = "India",
        context_data: Optional[Dict[str, Any]] = None,
        user_id: Optional[uuid.UUID] = None
    ) -> AdvisorSession:
        session = AdvisorSession(
            title=title or "New Legal Inquiry",
            jurisdiction=jurisdiction,
            context_data=context_data or {},
            user_id=user_id
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def get_session(self, db: Session, session_id: uuid.UUID) -> Optional[AdvisorSession]:
        stmt = select(AdvisorSession).where(AdvisorSession.id == session_id)
        return db.scalar(stmt)

    async def process_user_message(
        self,
        db: Session,
        session_id: uuid.UUID,
        content: str,
        jurisdiction: Optional[str] = None,
        context_data: Optional[Dict[str, Any]] = None
    ) -> AdvisorMessage:
        session = self.get_session(db, session_id)
        if not session:
            raise ValueError(f"Advisor session {session_id} not found.")

        # Update session metadata if context is supplemented
        if jurisdiction and jurisdiction.strip():
            session.jurisdiction = jurisdiction.strip()
        if context_data:
            merged_context = dict(session.context_data)
            merged_context.update(context_data)
            session.context_data = merged_context

        # Auto-generate a title if it's the initial default inquiry
        if session.title in ["New Legal Inquiry", "Legal Advisory Session"] and len(content) > 5:
            words = content.strip().split()
            session.title = " ".join(words[:7]) + ("..." if len(words) > 7 else "")

        # 1. Persist User Message
        user_msg = AdvisorMessage(
            session_id=session.id,
            role="user",
            content=content.strip(),
            structured_data=None,
            sources=None
        )
        db.add(user_msg)
        db.commit()

        # 2. Gather conversation history
        history: List[Dict[str, str]] = []
        for msg in session.messages:
            history.append({
                "role": msg.role,
                "content": msg.content
            })

        # 3. Retrieve relevant legal context via stable LegalRetriever interface
        retrieval_result = await self.retriever.retrieve(
            query=content,
            jurisdiction=session.jurisdiction,
            top_k=4
        )

        # 4. Synthesize cautious legal assessment with Gemini
        structured_response = await gemini_service.generate_legal_response(
            user_message=content,
            conversation_history=history,
            context_data=session.context_data,
            retrieved_documents=retrieval_result.documents,
            jurisdiction=session.jurisdiction
        )

        # 5. Format cited sources metadata
        cited_ids = set(structured_response.get("cited_source_ids", []))
        citations: List[Dict[str, Any]] = []
        for doc in retrieval_result.documents:
            # Include if cited or if top confident match
            if doc.id in cited_ids or not cited_ids:
                citations.append(doc.to_citation_dict())

        # 6. Persist Assistant Message
        assistant_msg = AdvisorMessage(
            session_id=session.id,
            role="assistant",
            content=structured_response.get("plain_language_explanation", ""),
            structured_data=structured_response,
            sources=citations
        )
        db.add(assistant_msg)
        db.commit()
        db.refresh(assistant_msg)
        return assistant_msg

advisor_service = AdvisorService()
