from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class RetrievedDocument(BaseModel):
    id: str
    title: str
    citation: str
    source_type: str  # "legislation", "judgment", "rule", "circular"
    jurisdiction: str = "India"
    court_or_authority: Optional[str] = None
    year: Optional[int] = None
    content_excerpt: str
    full_text: Optional[str] = None
    url: Optional[str] = None
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    is_development_fixture: bool = True
    tags: List[str] = Field(default_factory=list)

    def to_citation_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "citation": self.citation,
            "source_type": self.source_type,
            "jurisdiction": self.jurisdiction,
            "court_or_authority": self.court_or_authority,
            "year": self.year,
            "excerpt": self.content_excerpt,
            "url": self.url,
            "confidence_score": self.confidence_score,
            "is_development_fixture": self.is_development_fixture,
        }

class RetrievalResult(BaseModel):
    query: str
    jurisdiction: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    documents: List[RetrievedDocument] = Field(default_factory=list)
    total_found: int = 0
    retrieval_mode: str = "development_adapter"  # "development_adapter" or "trained_rag"
    retrieval_notice: str = (
        "Operating with Development Retriever Adapter. "
        "Trained RAG pipeline will replace this adapter upon completion."
    )

class LegalRetriever(ABC):
    """
    Stable retrieval abstraction decoupling the application, Gemini reasoning,
    and frontend views from the underlying vector/hybrid RAG engine.
    """

    @abstractmethod
    async def retrieve(
        self,
        query: str,
        jurisdiction: str = "India",
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 5
    ) -> RetrievalResult:
        """Retrieve relevant legal documents matching the query."""
        pass

    @abstractmethod
    async def get_document_by_id(self, document_id: str) -> Optional[RetrievedDocument]:
        """Fetch a single legal document by unique identifier."""
        pass
