from typing import List, Optional
from pydantic import BaseModel, Field

class ResearchSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    jurisdiction: str = Field("India", max_length=50)
    source_types: Optional[List[str]] = Field(default=None)
    limit: int = Field(10, ge=1, le=50)
    offset: int = Field(0, ge=0)

class ResearchResultItem(BaseModel):
    id: str
    title: str
    citation: str
    source_type: str
    jurisdiction: str = "India"
    court_or_authority: Optional[str] = None
    year: Optional[int] = None
    excerpt: str
    url: Optional[str] = None
    confidence_score: float = 0.0
    is_development_fixture: bool = True

class ResearchSearchResponse(BaseModel):
    query: str
    jurisdiction: str
    source_types: List[str]
    total_found: int
    limit: int
    offset: int
    retrieval_mode: str
    retrieval_notice: str
    results: List[ResearchResultItem]

class ResearchSourceDetail(BaseModel):
    id: str
    title: str
    citation: str
    source_type: str
    jurisdiction: str = "India"
    court_or_authority: Optional[str] = None
    year: Optional[int] = None
    content_excerpt: str
    full_text: Optional[str] = None
    url: Optional[str] = None
    confidence_score: float = 0.0
    is_development_fixture: bool = True
    tags: List[str] = Field(default_factory=list)
