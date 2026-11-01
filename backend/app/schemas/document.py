import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    original_filename: str
    title: Optional[str] = None
    category: str = "Other"
    description: Optional[str] = None
    tags: List[str] = []
    document_date: Optional[str] = None
    related_entity: Optional[str] = None
    mime_type: str
    file_size_bytes: int
    source_type: str
    status: str
    extracted_text: Optional[str] = None
    ai_overview: Optional[Dict[str, Any]] = None
    word_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class VaultDocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    document_date: Optional[str] = Field(None, max_length=50)
    related_entity: Optional[str] = Field(None, max_length=255)


class VaultDocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int
    categories: List[str]
    all_tags: List[str]


class VaultSearchItem(BaseModel):
    document: DocumentResponse
    matched_in: str  # "title", "description", "tags", "content", "related_entity"
    matching_excerpt: Optional[str] = None


class VaultSearchResponse(BaseModel):
    results: List[VaultSearchItem]
    total_matches: int
    query: str


class PastedTextCreate(BaseModel):
    title: Optional[str] = Field("Pasted Legal Document", max_length=255)
    text: str = Field(..., min_length=15, description="Raw legal text to simplify")


class SimplificationRequest(BaseModel):
    level: str = Field("standard", description="Simplification level: basic, standard, or detailed")
    language: str = Field("en", max_length=20)
    preserve_legal_terms: bool = Field(True, description="Keep legal terms and identifiers intact")
    explain_terminology: bool = Field(True, description="Include plain language definitions of dense terms")


class SimplificationResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    user_id: uuid.UUID
    simplification_level: str
    language: str
    preserve_legal_terms: bool
    explain_terminology: bool
    status: str
    simplified_text: str
    structured_output: Optional[Dict[str, Any]] = None
    retrieved_sources: Optional[List[Dict[str, Any]]] = None
    error_message: Optional[str] = None
    created_at: datetime


class DocumentDeleteResponse(BaseModel):
    document_id: uuid.UUID
    message: str = "Document successfully removed"
    success: bool = True


# --- DRAFTING ASSISTANT SCHEMAS ---

class DraftBasics(BaseModel):
    document_type: str = Field(..., description="formal_letter, legal_representation, formal_complaint, general_correspondence")
    title: str = Field(..., min_length=3, max_length=255)
    purpose: Optional[str] = None
    desired_outcome: Optional[str] = None
    jurisdiction: str = Field("India", max_length=100)
    language: str = Field("en", max_length=20)
    tone: str = Field("formal", description="formal, polite, firm, or neutral")


class DraftSender(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None


class DraftRecipient(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    designation: Optional[str] = None
    department: Optional[str] = None
    address: Optional[str] = None


class DraftDatesAndReferences(BaseModel):
    date_of_drafting: Optional[str] = None
    incident_date: Optional[str] = None
    reference_number: Optional[str] = None
    deadline_date: Optional[str] = None


class DraftFactsAndCircumstances(BaseModel):
    what_happened: str = Field(..., min_length=10)
    background: Optional[str] = None
    chronology: Optional[List[str]] = None
    previous_communication: Optional[str] = None
    supporting_material_excerpt: Optional[str] = None
    legal_provisions: Optional[str] = None


class DraftRequestedAction(BaseModel):
    what_should_recipient_do: str = Field(..., min_length=5)
    requested_remedy: Optional[str] = None
    desired_deadline: Optional[str] = None
    additional_instructions: Optional[str] = None


class StructuredDraftInputs(BaseModel):
    basics: Optional[DraftBasics] = None
    sender: Optional[DraftSender] = None
    recipient: Optional[DraftRecipient] = None
    dates_and_references: Optional[DraftDatesAndReferences] = None
    facts_and_circumstances: Optional[DraftFactsAndCircumstances] = None
    requested_action: Optional[DraftRequestedAction] = None


class DraftCreate(BaseModel):
    document_type: str = Field(..., description="formal_letter, legal_representation, formal_complaint, general_correspondence")
    title: str = Field(..., min_length=3, max_length=255)
    tone: str = Field("formal")
    language: str = Field("en")
    jurisdiction: str = Field("India")
    structured_inputs: Dict[str, Any] = Field(default_factory=dict)


class DraftUpdate(BaseModel):
    title: Optional[str] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    structured_inputs: Optional[Dict[str, Any]] = None
    user_edited_content: Optional[str] = None
    status: Optional[str] = None


class DraftRegenerateRequest(BaseModel):
    section: Optional[str] = Field(None, description="Optional specific section to regenerate (e.g., 'facts', 'remedy', or full)")
    additional_instructions: Optional[str] = None


class LegalDraftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    document_type: str
    title: str
    status: str
    language: str
    tone: str
    jurisdiction: str
    structured_inputs: Dict[str, Any]
    generated_content: Optional[str] = None
    user_edited_content: Optional[str] = None
    explanatory_notes: Optional[str] = None
    retrieved_sources: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime


class DraftDeleteResponse(BaseModel):
    draft_id: uuid.UUID
    message: str = "Legal draft successfully removed"
    success: bool = True


# --- NOTICE REPLY SCHEMAS ---

class NoticeReplyCreate(BaseModel):
    document_id: Optional[uuid.UUID] = None
    notice_text: Optional[str] = None
    title: Optional[str] = "Reply to Legal Notice"
    tone: str = Field("firm", description="formal, polite, firm, or neutral")
    language: str = Field("en", max_length=20)
    jurisdiction: str = Field("India", max_length=100)


class NoticeReplyUpdate(BaseModel):
    title: Optional[str] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    user_responses: Optional[Dict[str, Any]] = None
    user_edited_reply: Optional[str] = None
    status: Optional[str] = None


class NoticeReplyRegenerateRequest(BaseModel):
    section: Optional[str] = None
    additional_instructions: Optional[str] = None


class NoticeReplyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    document_id: Optional[uuid.UUID] = None
    title: str
    status: str
    tone: str
    language: str
    jurisdiction: str
    raw_notice_text: str
    extracted_notice_details: Dict[str, Any]
    allegations_and_demands: List[Dict[str, Any]]
    user_responses: Dict[str, Any]
    generated_reply: Optional[str] = None
    user_edited_reply: Optional[str] = None
    explanatory_notes: Optional[str] = None
    retrieved_sources: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime


class NoticeReplyDeleteResponse(BaseModel):
    reply_id: uuid.UUID
    message: str = "Notice reply successfully removed"
    success: bool = True


