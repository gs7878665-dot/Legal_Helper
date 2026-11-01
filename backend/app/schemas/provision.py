import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class LawResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    full_name: str
    short_name: str
    jurisdiction: str
    law_type: str
    enactment_year: Optional[int] = None
    commencement_date: Optional[str] = None
    repeal_date: Optional[str] = None
    status: str
    official_source_url: Optional[str] = None
    description: Optional[str] = None
    version_metadata: Dict[str, Any] = {}
    sort_order: int = 0


class LegalProvisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    law_id: uuid.UUID
    law_slug: Optional[str] = None
    law_short_name: Optional[str] = None
    provision_type: str
    provision_number: str
    title: str
    official_text: Optional[str] = None
    plain_language_explanation: Optional[str] = None
    practical_example: Optional[str] = None
    key_conditions: List[str] = []
    source_url: Optional[str] = None
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None
    version_metadata: Dict[str, Any] = {}


class ProvisionCorrespondenceItem(BaseModel):
    id: uuid.UUID
    relationship_type: str
    mapping_status: str
    explanation: Optional[str] = None
    substantive_changes: Optional[str] = None
    source_reference: Optional[str] = None
    verification_status: str
    dataset_version: str
    target_provision: LegalProvisionResponse


class ProvisionConversionResponse(BaseModel):
    source_law: LawResponse
    target_law: LawResponse
    source_provision: LegalProvisionResponse
    correspondences: List[ProvisionCorrespondenceItem]
    has_verified_mapping: bool
    status_summary: str
    caveat: str = (
        "Correspondence between provisions does not by itself determine which law applies to a particular matter. "
        "Applicability depends on the incident date, facts, amendments, and applicable repeal-and-savings provisions."
    )


class ProvisionSearchItem(BaseModel):
    provision: LegalProvisionResponse
    matched_field: str
    snippet: Optional[str] = None


class ProvisionSearchResponse(BaseModel):
    results: List[ProvisionSearchItem]
    total_matches: int
    query: str
    law_slug: Optional[str] = None


class LegalSourceInfo(BaseModel):
    title: str
    short_name: str
    source_type: str
    authority: str
    url: Optional[str] = None
    description: str
