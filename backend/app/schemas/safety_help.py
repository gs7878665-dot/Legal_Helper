from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
import uuid
from datetime import datetime


# -------------------------------------------------------------
# 1. LAWYER PREPARATION SCHEMAS
# -------------------------------------------------------------

class LawyerPreparationCreateRequest(BaseModel):
    category: str = Field(..., min_length=2, max_length=100)
    situation_description: str = Field(..., min_length=15, max_length=10000)
    relevant_dates: Optional[str] = Field(None, max_length=255)
    state: str = Field(..., min_length=2, max_length=100)
    city: str = Field(..., min_length=2, max_length=100)
    has_notice_or_deadline: bool = Field(False)
    notice_details: Optional[str] = Field(None, max_length=2000)


class QuestionItem(BaseModel):
    topic: str
    question: str
    purpose: str


class DocumentToGatherItem(BaseModel):
    document_name: str
    relevance: str
    importance: str  # "Critical", "Recommended", "Optional"
    is_statutory_requirement: bool = False


class PotentialLegalIssueItem(BaseModel):
    issue_title: str
    potential_statute_or_area: str
    jurisdiction: str
    caveat: str


class LawyerPreparationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category: str
    situation_description: str
    relevant_dates: Optional[str]
    state: str
    city: str
    has_notice_or_deadline: bool
    notice_details: Optional[str]
    case_summary: str
    user_provided_facts: List[str]
    ai_interpretation: str
    information_to_gather: List[DocumentToGatherItem]
    questions_to_ask: List[QuestionItem]
    potential_legal_issues: List[PotentialLegalIssueItem]
    consultation_document: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LawyerPreparationListResponse(BaseModel):
    items: List[LawyerPreparationResponse]
    total: int


# -------------------------------------------------------------
# 2. LEGAL AID FINDER SCHEMAS
# -------------------------------------------------------------

class LegalAidItem(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    state: str
    district: str
    city: Optional[str]
    address: str
    phone: Optional[str]
    email: Optional[str]
    website: Optional[str]
    eligibility_info: Optional[str]
    services_offered: List[str]
    source_name: str
    source_url: Optional[str]
    verification_date: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class LegalAidSearchResponse(BaseModel):
    items: List[LegalAidItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    available_states: List[str]
    available_districts: List[str]
    available_categories: List[str]


class LegalAidLocationsResponse(BaseModel):
    states: List[str]
    districts_by_state: Dict[str, List[str]]


# -------------------------------------------------------------
# 3. SCAM DETECTOR SCHEMAS
# -------------------------------------------------------------

class RedFlagItem(BaseModel):
    signal: str
    quote: Optional[str] = None
    explanation: str
    severity: str  # "high", "medium", "low"


class VerifiedReportingResource(BaseModel):
    name: str
    url_or_portal: str
    contact: Optional[str] = None
    description: str


class ScamAnalysisCreateRequest(BaseModel):
    submitted_content: str = Field(..., min_length=5, max_length=20000)
    sender_info: Optional[str] = Field(None, max_length=255)
    claimed_url: Optional[str] = Field(None, max_length=500)


class ScamAnalysisResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    submitted_content: str
    sender_info: Optional[str]
    claimed_url: Optional[str]
    risk_level: str
    confidence_score: Optional[int]
    red_flags: List[RedFlagItem]
    plain_explanation: str
    safer_next_steps: List[str]
    verified_reporting_resources: List[VerifiedReportingResource]
    created_at: datetime

    class Config:
        from_attributes = True


class ScamAnalysisListResponse(BaseModel):
    items: List[ScamAnalysisResponse]
    total: int
