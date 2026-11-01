import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class AdvisorSessionCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    jurisdiction: str = Field("India", max_length=50)
    context_data: Optional[Dict[str, Any]] = Field(default_factory=dict)

class AdvisorMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    jurisdiction: Optional[str] = Field(None, max_length=50)
    context_data: Optional[Dict[str, Any]] = Field(default_factory=dict)

class AdvisorStructuredData(BaseModel):
    summary: str
    legal_concepts: List[str] = Field(default_factory=list)
    plain_language_explanation: str
    practical_steps: List[str] = Field(default_factory=list)
    missing_facts: List[str] = Field(default_factory=list)
    follow_up_questions: List[str] = Field(default_factory=list)
    cited_source_ids: Optional[List[str]] = Field(default_factory=list)
    disclaimer: str

class AdvisorSourceItem(BaseModel):
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

class AdvisorMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    structured_data: Optional[Dict[str, Any]] = None
    sources: Optional[List[AdvisorSourceItem]] = None
    created_at: datetime

class AdvisorSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    title: str
    jurisdiction: str
    context_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    messages: List[AdvisorMessageResponse] = Field(default_factory=list)
