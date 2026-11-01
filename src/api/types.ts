export interface BranchPosition {
  level: number;
  height: number;
  angle: number;
  radius: number;
  color: string;
  glow?: string;
}

export interface ToolItem {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description?: string;
  route: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  sort_order: number;
  branch_position: BranchPosition;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  tools?: ToolItem[];
}

// Legal Advisor Interfaces
export interface AdvisorSourceItem {
  id: string;
  title: string;
  citation: string;
  source_type: string;
  jurisdiction: string;
  court_or_authority?: string;
  year?: number;
  excerpt: string;
  url?: string;
  confidence_score: number;
  is_development_fixture: boolean;
}

export interface AdvisorStructuredData {
  summary: string;
  legal_concepts: string[];
  plain_language_explanation: string;
  practical_steps: string[];
  missing_facts: string[];
  follow_up_questions: string[];
  cited_source_ids?: string[];
  disclaimer: string;
}

export interface AdvisorMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  structured_data?: AdvisorStructuredData | null;
  sources?: AdvisorSourceItem[] | null;
  created_at: string;
}

export interface AdvisorSession {
  id: string;
  title: string;
  jurisdiction: string;
  context_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  messages: AdvisorMessage[];
}

// Legal Research Interfaces
export interface ResearchResultItem {
  id: string;
  title: string;
  citation: string;
  source_type: string;
  jurisdiction: string;
  court_or_authority?: string;
  year?: number;
  excerpt: string;
  url?: string;
  confidence_score: number;
  is_development_fixture: boolean;
}

export interface ResearchSearchResponse {
  query: string;
  jurisdiction: string;
  source_types: string[];
  total_found: number;
  limit: number;
  offset: number;
  retrieval_mode: string;
  retrieval_notice: string;
  results: ResearchResultItem[];
}

export interface ResearchSourceDetail {
  id: string;
  title: string;
  citation: string;
  source_type: string;
  jurisdiction: string;
  court_or_authority?: string;
  year?: number;
  content_excerpt: string;
  full_text?: string;
  url?: string;
  confidence_score: number;
  is_development_fixture: boolean;
  tags: string[];
}

// Authentication Interfaces
export interface User {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
  refresh_token?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  display_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Document Infrastructure & Legal Vault Interfaces
export interface DocumentItem {
  id: string;
  user_id: string;
  original_filename: string;
  title?: string | null;
  category: string;
  description?: string | null;
  tags: string[];
  document_date?: string | null;
  related_entity?: string | null;
  mime_type: string;
  file_size_bytes: number;
  source_type: 'upload' | 'pasted_text';
  status: 'pending' | 'extracted' | 'failed';
  extracted_text?: string | null;
  ai_overview?: {
    summary: string;
    document_type_detected?: string;
    important_dates?: string[];
    identified_parties?: string[];
    key_amounts?: string[];
    key_sections?: string[];
    disclaimer?: string;
  } | null;
  word_count: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultDocumentListResponse {
  documents: DocumentItem[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  categories: string[];
  all_tags: string[];
}

export interface VaultDocumentUpdatePayload {
  title?: string;
  category?: string;
  description?: string;
  tags?: string[];
  document_date?: string;
  related_entity?: string;
}

export interface VaultSearchItem {
  document: DocumentItem;
  matched_in: string;
  matching_excerpt?: string | null;
}

export interface VaultSearchResponse {
  results: VaultSearchItem[];
  total_matches: number;
  query: string;
}

export interface SimplificationSection {
  title: string;
  simplified_content: string;
  original_reference?: string;
  practical_implication?: string;
}

export interface ExplainedTerm {
  term: string;
  plain_definition: string;
  context_in_document?: string;
}

export interface RedFlagItem {
  finding: string;
  severity: 'high' | 'medium' | 'low';
  explanation: string;
  source_reference?: string;
  source_excerpt?: string;
}

export interface StructuredSimplificationOutput {
  summary: string;
  key_facts?: {
    parties?: string[];
    dates_and_deadlines?: string[];
    financial_terms?: string[];
    governing_law_or_jurisdiction?: string;
  };
  sections?: SimplificationSection[];
  explained_terms?: ExplainedTerm[];
  ambiguities_and_risks?: string[];
  red_flags?: RedFlagItem[];
  plain_text_version?: string;
  disclaimer: string;
  is_development_fallback?: boolean;
}

export interface SimplificationResultItem {
  id: string;
  document_id: string;
  user_id: string;
  simplification_level: 'basic' | 'standard' | 'detailed';
  language: string;
  preserve_legal_terms: boolean;
  explain_terminology: boolean;
  status: string;
  simplified_text: string;
  structured_output?: StructuredSimplificationOutput | null;
  retrieved_sources?: Array<{
    id: string;
    title: string;
    citation: string;
    source_type: string;
    excerpt: string;
    confidence_score: number;
  }> | null;
  error_message?: string | null;
  created_at: string;
}

export interface SimplificationPayload {
  level?: 'basic' | 'standard' | 'detailed';
  language?: string;
  preserve_legal_terms?: boolean;
  explain_terminology?: boolean;
}

// --- DRAFTING ASSISTANT TYPES ---
export type DocumentTypeCode = 'formal_letter' | 'legal_representation' | 'formal_complaint' | 'general_correspondence';
export type ToneCode = 'formal' | 'polite' | 'firm' | 'neutral';

export interface DraftStructuredInputs {
  basics?: {
    document_type: DocumentTypeCode;
    title: string;
    purpose?: string;
    desired_outcome?: string;
    jurisdiction?: string;
    language?: string;
    tone?: ToneCode;
  };
  sender?: {
    full_name: string;
    address?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
  recipient?: {
    full_name: string;
    designation?: string;
    department?: string;
    address?: string;
  };
  dates_and_references?: {
    date_of_drafting?: string;
    incident_date?: string;
    reference_number?: string;
    deadline_date?: string;
  };
  facts_and_circumstances?: {
    what_happened: string;
    background?: string;
    chronology?: string[];
    previous_communication?: string;
    supporting_material_excerpt?: string;
    legal_provisions?: string;
  };
  requested_action?: {
    what_should_recipient_do: string;
    requested_remedy?: string;
    desired_deadline?: string;
    additional_instructions?: string;
  };
}

export interface LegalDraftItem {
  id: string;
  user_id: string;
  document_type: DocumentTypeCode;
  title: string;
  status: 'draft' | 'generated' | 'edited';
  language: string;
  tone: ToneCode;
  jurisdiction: string;
  structured_inputs: DraftStructuredInputs;
  generated_content?: string | null;
  user_edited_content?: string | null;
  explanatory_notes?: string | null;
  retrieved_sources?: Array<{
    id: string;
    title: string;
    citation: string;
    source_type: string;
    excerpt: string;
    confidence_score: number;
  }> | null;
  created_at: string;
  updated_at: string;
}

export interface DraftCreatePayload {
  document_type: DocumentTypeCode;
  title: string;
  tone?: ToneCode;
  language?: string;
  jurisdiction?: string;
  structured_inputs: DraftStructuredInputs;
}

export interface DraftUpdatePayload {
  title?: string;
  tone?: ToneCode;
  language?: string;
  structured_inputs?: DraftStructuredInputs;
  user_edited_content?: string;
  status?: 'draft' | 'generated' | 'edited';
}

export interface DraftRegeneratePayload {
  section?: string;
  additional_instructions?: string;
}

// --- NOTICE REPLY TYPES ---
export interface NoticeDetails {
  notice_subject?: string;
  sender_party?: string;
  recipient_party?: string;
  sender_advocate?: string | null;
  notice_date?: string | null;
  explicit_deadline?: string | null;
  deadline_excerpt?: string | null;
  amount_demanded?: string | null;
  reference_number?: string | null;
  matter_summary?: string;
  consequences_asserted?: string;
}

export interface NoticeAllegationItem {
  id: string;
  item_type: 'allegation' | 'demand' | 'factual_assertion';
  statement: string;
  source_excerpt?: string;
  source_reference?: string;
  associated_deadline?: string | null;
  associated_amount?: string | null;
}

export type UserStance = 'agree' | 'disagree' | 'partially_agree' | 'clarify' | 'unknown' | 'no_position_provided';

export interface UserAllegationResponse {
  stance: UserStance;
  explanation: string;
  supporting_evidence?: string;
}

export interface UserNoticeResponses {
  user_info?: {
    full_name: string;
    address?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
  matter_info?: {
    reply_date?: string;
    background?: string;
    desired_action?: string;
    relevant_statute?: string;
    additional_instructions?: string;
  };
  allegation_responses?: Record<string, UserAllegationResponse>;
}

export interface NoticeReplyItem {
  id: string;
  user_id: string;
  document_id?: string | null;
  title: string;
  status: 'uploaded' | 'analyzed' | 'responded' | 'generated' | 'edited';
  tone: ToneCode;
  language: string;
  jurisdiction: string;
  raw_notice_text: string;
  extracted_notice_details: NoticeDetails;
  allegations_and_demands: NoticeAllegationItem[];
  user_responses: UserNoticeResponses;
  generated_reply?: string | null;
  user_edited_reply?: string | null;
  explanatory_notes?: string | null;
  retrieved_sources?: Array<{
    id: string;
    title: string;
    citation: string;
    source_type: string;
    excerpt: string;
    confidence_score: number;
  }> | null;
  created_at: string;
  updated_at: string;
}

export interface NoticeReplyCreatePayload {
  document_id?: string;
  notice_text?: string;
  title?: string;
  tone?: ToneCode;
  language?: string;
  jurisdiction?: string;
}

export interface NoticeReplyUpdatePayload {
  title?: string;
  tone?: ToneCode;
  language?: string;
  user_responses?: UserNoticeResponses;
  user_edited_reply?: string;
  status?: string;
}

export interface NoticeReplyRegeneratePayload {
  section?: string;
  additional_instructions?: string;
}

// --- GENERAL LEGAL PROVISION CONVERTER TYPES ---
export interface LawItem {
  id: string;
  slug: string;
  full_name: string;
  short_name: string;
  jurisdiction: string;
  law_type: string;
  enactment_year?: number | null;
  commencement_date?: string | null;
  repeal_date?: string | null;
  status: 'active' | 'repealed' | 'amended' | 'historical';
  official_source_url?: string | null;
  description?: string | null;
  version_metadata?: Record<string, any>;
  sort_order: number;
}

export interface LegalProvisionItem {
  id: string;
  law_id: string;
  law_slug?: string;
  law_short_name?: string;
  provision_type: string;
  provision_number: string;
  title: string;
  official_text?: string | null;
  plain_language_explanation?: string | null;
  practical_example?: string | null;
  key_conditions: string[];
  source_url?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  version_metadata?: Record<string, any>;
}

export interface ProvisionCorrespondenceItem {
  id: string;
  relationship_type: string;
  mapping_status: string;
  explanation?: string | null;
  substantive_changes?: string | null;
  source_reference?: string | null;
  verification_status: string;
  dataset_version: string;
  target_provision: LegalProvisionItem;
}

export interface ProvisionConversionResponse {
  source_law: LawItem;
  target_law: LawItem;
  source_provision: LegalProvisionItem;
  correspondences: ProvisionCorrespondenceItem[];
  has_verified_mapping: boolean;
  status_summary: string;
  caveat: string;
}

export interface ProvisionSearchItem {
  provision: LegalProvisionItem;
  matched_field: string;
  snippet?: string | null;
}

export interface ProvisionSearchResponse {
  results: ProvisionSearchItem[];
  total_matches: number;
  query: string;
  law_slug?: string | null;
}

export interface LegalSourceItem {
  title: string;
  short_name: string;
  source_type: string;
  authority: string;
  url?: string | null;
  description: string;
}

// -------------------------------------------------------------
// Safety & Help Tool Interfaces
// -------------------------------------------------------------

export interface QuestionItem {
  topic: string;
  question: string;
  purpose: string;
}

export interface DocumentToGatherItem {
  document_name: string;
  relevance: string;
  importance: 'Critical' | 'Recommended' | 'Optional';
  is_statutory_requirement: boolean;
}

export interface PotentialLegalIssueItem {
  issue_title: string;
  potential_statute_or_area: string;
  jurisdiction: string;
  caveat: string;
}

export interface LawyerPreparationItem {
  id: string;
  user_id: string;
  category: string;
  situation_description: string;
  relevant_dates?: string | null;
  state: string;
  city: string;
  has_notice_or_deadline: boolean;
  notice_details?: string | null;
  case_summary: string;
  user_provided_facts: string[];
  ai_interpretation: string;
  information_to_gather: DocumentToGatherItem[];
  questions_to_ask: QuestionItem[];
  potential_legal_issues: PotentialLegalIssueItem[];
  consultation_document: string;
  created_at: string;
  updated_at: string;
}

export interface LawyerPreparationCreatePayload {
  category: string;
  situation_description: string;
  relevant_dates?: string;
  state: string;
  city: string;
  has_notice_or_deadline: boolean;
  notice_details?: string;
}

export interface LawyerPreparationListResponse {
  items: LawyerPreparationItem[];
  total: number;
}

export interface LegalAidItem {
  id: string;
  name: string;
  category: string;
  state: string;
  district: string;
  city?: string | null;
  address: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  eligibility_info?: string | null;
  services_offered: string[];
  source_name: string;
  source_url?: string | null;
  verification_date?: string | null;
  is_active: boolean;
}

export interface LegalAidSearchResponse {
  items: LegalAidItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_states: string[];
  available_districts: string[];
  available_categories: string[];
}

export interface LegalAidLocationsResponse {
  states: string[];
  districts_by_state: Record<string, string[]>;
}

export interface RedFlagItem {
  signal: string;
  quote?: string | null;
  explanation: string;
  severity: 'high' | 'medium' | 'low';
}

export interface VerifiedReportingResource {
  name: string;
  url_or_portal: string;
  contact?: string | null;
  description: string;
}

export interface ScamAnalysisItem {
  id: string;
  user_id: string;
  submitted_content: string;
  sender_info?: string | null;
  claimed_url?: string | null;
  risk_level: 'high' | 'medium' | 'low' | 'inconclusive';
  confidence_score?: number | null;
  red_flags: RedFlagItem[];
  plain_explanation: string;
  safer_next_steps: string[];
  verified_reporting_resources: VerifiedReportingResource[];
  created_at: string;
}

export interface ScamAnalysisCreatePayload {
  submitted_content: string;
  sender_info?: string;
  claimed_url?: string;
}

export interface ScamAnalysisListResponse {
  items: ScamAnalysisItem[];
  total: number;
}



