from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.research import ResearchQuery
from app.services.retrieval.rag_retriever import persistent_rag_retriever
from app.services.retrieval.base import LegalRetriever, RetrievedDocument, RetrievalResult

class ResearchService:
    def __init__(self, retriever: Optional[LegalRetriever] = None):
        self.retriever = retriever or persistent_rag_retriever

    async def search(
        self,
        db: Session,
        query: str,
        jurisdiction: str = "India",
        source_types: Optional[List[str]] = None,
        limit: int = 10,
        offset: int = 0
    ) -> Dict[str, Any]:
        filters: Dict[str, Any] = {}
        if source_types and len(source_types) == 1 and source_types[0] != "all":
            filters["source_type"] = source_types[0]

        # Retrieve documents via stable LegalRetriever interface
        retrieval_res: RetrievalResult = await self.retriever.retrieve(
            query=query,
            jurisdiction=jurisdiction,
            filters=filters,
            top_k=max(20, limit + offset)
        )

        all_docs = retrieval_res.documents

        # Filter by source_types if multiple types specified
        if source_types and "all" not in source_types:
            types_lower = {st.lower() for st in source_types}
            all_docs = [d for d in all_docs if d.source_type.lower() in types_lower]

        total_count = len(all_docs)
        paginated_docs = all_docs[offset : offset + limit]

        # Persist research query search history for analytics / audit
        try:
            record = ResearchQuery(
                query_text=query.strip(),
                jurisdiction=jurisdiction,
                source_types=source_types or ["all"],
                results_count=total_count
            )
            db.add(record)
            db.commit()
        except Exception:
            db.rollback()

        return {
            "query": query,
            "jurisdiction": jurisdiction,
            "source_types": source_types or ["all"],
            "total_found": total_count,
            "limit": limit,
            "offset": offset,
            "retrieval_mode": retrieval_res.retrieval_mode,
            "retrieval_notice": retrieval_res.retrieval_notice,
            "results": [d.to_citation_dict() for d in paginated_docs]
        }

    async def get_source_by_id(self, source_id: str) -> Optional[RetrievedDocument]:
        return await self.retriever.get_document_by_id(source_id)

research_service = ResearchService()
