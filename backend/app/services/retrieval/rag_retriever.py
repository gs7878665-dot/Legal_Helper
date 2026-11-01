import logging
from typing import List, Optional, Dict, Any
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.rag import RAGDocument, RAGChunk
from app.services.retrieval.base import (
    LegalRetriever,
    RetrievedDocument,
    RetrievalResult,
)
from app.services.retrieval.dev_retriever import dev_retriever_instance
from app.rag.vector_store import vector_store
from app.config import settings

logger = logging.getLogger(__name__)

class PersistentRAGRetriever(LegalRetriever):
    """
    Persistent RAG Retriever connecting Legal Advisor, Legal Research,
    and future Legal Helper tools to the persistent PostgreSQL vector store.
    """

    def __init__(self):
        self.vector_store = vector_store
        self.default_top_k = settings.RAG_TOP_K
        self.threshold = settings.RAG_SIMILARITY_THRESHOLD

    async def retrieve(
        self,
        query: str,
        jurisdiction: str = "India",
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 5
    ) -> RetrievalResult:
        query_clean = query.strip()
        if not query_clean:
            return RetrievalResult(
                query=query,
                jurisdiction=jurisdiction,
                filters=filters or {},
                documents=[],
                total_found=0,
                retrieval_mode="trained_rag",
                retrieval_notice="Empty search query provided."
            )

        db = SessionLocal()
        try:
            source_type = None
            if filters and "source_type" in filters:
                source_type = filters["source_type"]

            k = top_k or self.default_top_k

            # Search persistent PostgreSQL vector store
            matches = self.vector_store.similarity_search(
                db=db,
                query=query_clean,
                jurisdiction=jurisdiction,
                source_type=source_type,
                top_k=k,
                threshold=self.threshold
            )

            # If the database has indexed documents
            if matches:
                documents: List[RetrievedDocument] = []
                for m in matches:
                    meta = m.get("metadata", {})
                    doc_title = meta.get("document_title", "Indian Legal Document")
                    section = m.get("section_heading") or "Statutory Provision"
                    citation = f"{doc_title} — {section}"

                    doc_type = meta.get("document_type", "legislation").lower()
                    if "act" in doc_type or "statute" in doc_type:
                        std_type = "legislation"
                    elif "judgment" in doc_type or "order" in doc_type:
                        std_type = "judgment"
                    elif "rule" in doc_type or "regulation" in doc_type:
                        std_type = "rule"
                    else:
                        std_type = "legislation"

                    documents.append(
                        RetrievedDocument(
                            id=m["chunk_id"],
                            title=doc_title,
                            citation=citation,
                            source_type=std_type,
                            jurisdiction=meta.get("jurisdiction", jurisdiction),
                            court_or_authority=meta.get("issuing_authority"),
                            content_excerpt=m["chunk_text"],
                            full_text=m["chunk_text"],
                            url=meta.get("source_url"),
                            confidence_score=m["score"],
                            is_development_fixture=False,
                            tags=[std_type, "indian_law", meta.get("jurisdiction", "India")]
                        )
                    )

                return RetrievalResult(
                    query=query,
                    jurisdiction=jurisdiction,
                    filters=filters or {},
                    documents=documents,
                    total_found=len(documents),
                    retrieval_mode="trained_rag",
                    retrieval_notice="Retrieved from persistent Indian Legal Documents corpus."
                )

            # Check if database has any chunks at all
            stats = self.vector_store.get_index_stats(db)
            if stats.get("total_chunks", 0) == 0:
                # If vector database is not yet seeded, delegate to dev retriever fallback
                logger.info("Persistent vector store is empty. Using development adapter fixtures.")
                dev_res = await dev_retriever_instance.retrieve(
                    query=query,
                    jurisdiction=jurisdiction,
                    filters=filters,
                    top_k=k
                )
                return dev_res

            # If database is indexed but query score didn't meet threshold -> return explicit empty result
            return RetrievalResult(
                query=query,
                jurisdiction=jurisdiction,
                filters=filters or {},
                documents=[],
                total_found=0,
                retrieval_mode="trained_rag",
                retrieval_notice="No legal passages met the relevance threshold in the corpus."
            )

        finally:
            db.close()

    async def get_document_by_id(self, document_id: str) -> Optional[RetrievedDocument]:
        db = SessionLocal()
        try:
            # 1. First check if it's a chunk ID
            chunk = db.get(RAGChunk, document_id)
            if chunk:
                meta = chunk.source_metadata or {}
                doc_title = meta.get("document_title", "Legal Source")
                sec = chunk.section_heading or "Section"
                return RetrievedDocument(
                    id=chunk.id,
                    title=doc_title,
                    citation=f"{doc_title} — {sec}",
                    source_type=meta.get("document_type", "legislation").lower(),
                    jurisdiction=meta.get("jurisdiction", "India"),
                    court_or_authority=meta.get("issuing_authority"),
                    content_excerpt=chunk.chunk_text,
                    full_text=chunk.chunk_text,
                    url=meta.get("source_url"),
                    confidence_score=0.95,
                    is_development_fixture=False,
                    tags=["indian_law", meta.get("jurisdiction", "India")]
                )

            # 2. Check if it's a document ID
            doc = db.get(RAGDocument, document_id)
            if doc:
                first_chunk_text = doc.chunks[0].chunk_text if doc.chunks else (doc.short_description or "")
                return RetrievedDocument(
                    id=doc.id,
                    title=doc.document_title,
                    citation=f"{doc.document_title} ({doc.document_jurisdiction})",
                    source_type=doc.document_type.lower(),
                    jurisdiction=doc.document_jurisdiction,
                    court_or_authority=doc.issuing_authority,
                    content_excerpt=doc.short_description or first_chunk_text[:300],
                    full_text=first_chunk_text,
                    url=doc.source_url,
                    confidence_score=0.95,
                    is_development_fixture=False,
                    tags=["indian_law", doc.document_jurisdiction]
                )

            # 3. Fallback to dev retriever if fixture ID
            return await dev_retriever_instance.get_document_by_id(document_id)

        finally:
            db.close()

# Singleton persistent RAG retriever instance
persistent_rag_retriever = PersistentRAGRetriever()
