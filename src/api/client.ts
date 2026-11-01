import type {
  CategoryItem,
  ToolItem,
  AdvisorSession,
  AdvisorMessage,
  ResearchSearchResponse,
  ResearchSourceDetail,
  User,
  AuthResponse,
  RegisterPayload,
  LoginPayload,
  DocumentItem,
  SimplificationResultItem,
  SimplificationPayload,
  LegalDraftItem,
  DraftCreatePayload,
  DraftUpdatePayload,
  DraftRegeneratePayload,
  NoticeReplyItem,
  NoticeReplyCreatePayload,
  NoticeReplyUpdatePayload,
  NoticeReplyRegeneratePayload,
  VaultDocumentListResponse,
  VaultDocumentUpdatePayload,
  VaultSearchResponse,
  LawItem,
  LegalProvisionItem,
  ProvisionConversionResponse,
  ProvisionSearchResponse,
  LegalSourceItem,
  LawyerPreparationItem,
  LawyerPreparationCreatePayload,
  LawyerPreparationListResponse,
  LegalAidItem,
  LegalAidSearchResponse,
  LegalAidLocationsResponse,
  ScamAnalysisItem,
  ScamAnalysisCreatePayload,
  ScamAnalysisListResponse,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// In-memory access token storage (never saved in localStorage to resist XSS)
let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

async function fetchJson<T>(endpoint: string, options?: RequestInit, isRetry = false): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  // Only default Content-Type to application/json if not uploading FormData
  if (!(options?.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (inMemoryAccessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include', // Always include HttpOnly cookies across origins/ports
      headers,
    });

    // Check if token expired and we can refresh
    if (res.status === 401 && !isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register') && !endpoint.includes('/auth/refresh')) {
      const refreshedToken = await coordinateTokenRefresh();
      if (refreshedToken) {
        // Retry the original request once with new token
        return fetchJson<T>(endpoint, options, true);
      }
    }

    if (!res.ok) {
      let errorMsg = `API request failed with status ${res.status}`;
      try {
        const data = await res.json();
        if (data && data.detail) {
          errorMsg = data.detail;
        }
      } catch {
        // Fallback to text
      }
      throw new ApiError(errorMsg, res.status);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      err?.message || 'Network connection to Legal Helper API failed. Please ensure the backend is running.',
      0
    );
  }
}

// Single-flight refresh token coordination
async function coordinateTokenRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        setAccessToken(null);
        return null;
      }

      const data = (await res.json()) as AuthResponse;
      setAccessToken(data.access_token);
      return data.access_token;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const apiClient = {
  // Authentication Endpoints
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await fetchJson<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAccessToken(res.access_token);
    return res;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await fetchJson<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAccessToken(res.access_token);
    return res;
  },

  async refreshToken(): Promise<AuthResponse> {
    const res = await fetchJson<AuthResponse>('/api/v1/auth/refresh', {
      method: 'POST',
    });
    setAccessToken(res.access_token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await fetchJson('/api/v1/auth/logout', {
        method: 'POST',
      });
    } finally {
      setAccessToken(null);
    }
  },

  async getCurrentUser(): Promise<User> {
    return fetchJson<User>('/api/v1/auth/me');
  },

  // Categories & Tools
  async getCategories(): Promise<CategoryItem[]> {
    return fetchJson<CategoryItem[]>('/api/v1/categories');
  },

  async getCategoryBySlug(slug: string): Promise<CategoryItem> {
    return fetchJson<CategoryItem>(`/api/v1/categories/${slug}`);
  },

  async getTools(categorySlug?: string): Promise<ToolItem[]> {
    const query = categorySlug ? `?category_slug=${encodeURIComponent(categorySlug)}` : '';
    return fetchJson<ToolItem[]>(`/api/v1/tools${query}`);
  },

  async getToolBySlug(slug: string): Promise<ToolItem> {
    return fetchJson<ToolItem>(`/api/v1/tools/${slug}`);
  },

  // Legal Advisor Endpoints
  async createAdvisorSession(
    title?: string,
    jurisdiction: string = 'India',
    context_data: Record<string, any> = {}
  ): Promise<AdvisorSession> {
    return fetchJson<AdvisorSession>('/api/v1/advisor/sessions', {
      method: 'POST',
      body: JSON.stringify({ title, jurisdiction, context_data }),
    });
  },

  async getAdvisorSession(sessionId: string): Promise<AdvisorSession> {
    return fetchJson<AdvisorSession>(`/api/v1/advisor/sessions/${sessionId}`);
  },

  async sendAdvisorMessage(
    sessionId: string,
    content: string,
    jurisdiction?: string,
    context_data?: Record<string, any>
  ): Promise<AdvisorMessage> {
    return fetchJson<AdvisorMessage>(`/api/v1/advisor/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, jurisdiction, context_data }),
    });
  },

  // Legal Research Endpoints
  async searchLegalSources(
    query: string,
    jurisdiction: string = 'India',
    source_types?: string[],
    limit: number = 10,
    offset: number = 0
  ): Promise<ResearchSearchResponse> {
    return fetchJson<ResearchSearchResponse>('/api/v1/research/search', {
      method: 'POST',
      body: JSON.stringify({ query, jurisdiction, source_types, limit, offset }),
    });
  },

  async getLegalSource(sourceId: string): Promise<ResearchSourceDetail> {
    return fetchJson<ResearchSourceDetail>(`/api/v1/research/sources/${sourceId}`);
  },

  // Document Infrastructure & Simplifier Endpoints
  async uploadDocument(file: File): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    return fetchJson<DocumentItem>('/api/v1/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async createDocumentFromText(title: string, text: string): Promise<DocumentItem> {
    return fetchJson<DocumentItem>('/api/v1/documents/text', {
      method: 'POST',
      body: JSON.stringify({ title, text }),
    });
  },

  async listDocuments(): Promise<DocumentItem[]> {
    return fetchJson<DocumentItem[]>('/api/v1/documents');
  },

  async getDocument(documentId: string): Promise<DocumentItem> {
    return fetchJson<DocumentItem>(`/api/v1/documents/${documentId}`);
  },

  async simplifyDocument(documentId: string, payload: SimplificationPayload = {}): Promise<SimplificationResultItem> {
    return fetchJson<SimplificationResultItem>(`/api/v1/documents/${documentId}/simplify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getSimplificationResult(documentId: string, resultId: string): Promise<SimplificationResultItem> {
    return fetchJson<SimplificationResultItem>(`/api/v1/documents/${documentId}/simplifications/${resultId}`);
  },

  async deleteDocument(documentId: string): Promise<void> {
    await fetchJson(`/api/v1/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  // Drafting Assistant Endpoints
  async createDraft(payload: DraftCreatePayload): Promise<LegalDraftItem> {
    return fetchJson<LegalDraftItem>('/api/v1/drafts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listDrafts(): Promise<LegalDraftItem[]> {
    return fetchJson<LegalDraftItem[]>('/api/v1/drafts');
  },

  async getDraft(draftId: string): Promise<LegalDraftItem> {
    return fetchJson<LegalDraftItem>(`/api/v1/drafts/${draftId}`);
  },

  async updateDraft(draftId: string, payload: DraftUpdatePayload): Promise<LegalDraftItem> {
    return fetchJson<LegalDraftItem>(`/api/v1/drafts/${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async generateDraft(draftId: string): Promise<LegalDraftItem> {
    return fetchJson<LegalDraftItem>(`/api/v1/drafts/${draftId}/generate`, {
      method: 'POST',
    });
  },

  async regenerateDraft(draftId: string, payload: DraftRegeneratePayload = {}): Promise<LegalDraftItem> {
    return fetchJson<LegalDraftItem>(`/api/v1/drafts/${draftId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteDraft(draftId: string): Promise<void> {
    await fetchJson(`/api/v1/drafts/${draftId}`, {
      method: 'DELETE',
    });
  },

  // Notice Reply Endpoints
  async createNoticeReply(payload: NoticeReplyCreatePayload): Promise<NoticeReplyItem> {
    return fetchJson<NoticeReplyItem>('/api/v1/notice-replies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listNoticeReplies(): Promise<NoticeReplyItem[]> {
    return fetchJson<NoticeReplyItem[]>('/api/v1/notice-replies');
  },

  async getNoticeReply(replyId: string): Promise<NoticeReplyItem> {
    return fetchJson<NoticeReplyItem>(`/api/v1/notice-replies/${replyId}`);
  },

  async updateNoticeReply(replyId: string, payload: NoticeReplyUpdatePayload): Promise<NoticeReplyItem> {
    return fetchJson<NoticeReplyItem>(`/api/v1/notice-replies/${replyId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async analyzeNotice(replyId: string): Promise<NoticeReplyItem> {
    return fetchJson<NoticeReplyItem>(`/api/v1/notice-replies/${replyId}/analyze`, {
      method: 'POST',
    });
  },

  async generateNoticeReply(replyId: string): Promise<NoticeReplyItem> {
    return fetchJson<NoticeReplyItem>(`/api/v1/notice-replies/${replyId}/generate`, {
      method: 'POST',
    });
  },

  async regenerateNoticeReply(replyId: string, payload: NoticeReplyRegeneratePayload = {}): Promise<NoticeReplyItem> {
    return fetchJson<NoticeReplyItem>(`/api/v1/notice-replies/${replyId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteNoticeReply(replyId: string): Promise<void> {
    await fetchJson(`/api/v1/notice-replies/${replyId}`, {
      method: 'DELETE',
    });
  },

  // Legal Vault Endpoints
  async uploadVaultDocument(formData: FormData): Promise<DocumentItem> {
    return fetchJson<DocumentItem>('/api/v1/vault/documents', {
      method: 'POST',
      body: formData,
    });
  },

  async listVaultDocuments(params: {
    category?: string;
    search?: string;
    file_type?: string;
    tag?: string;
    sort_by?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<VaultDocumentListResponse> {
    const qp = new URLSearchParams();
    if (params.category && params.category !== 'All') qp.append('category', params.category);
    if (params.search) qp.append('search', params.search);
    if (params.file_type && params.file_type !== 'All') qp.append('file_type', params.file_type);
    if (params.tag) qp.append('tag', params.tag);
    if (params.sort_by) qp.append('sort_by', params.sort_by);
    if (params.page) qp.append('page', params.page.toString());
    if (params.page_size) qp.append('page_size', params.page_size.toString());

    const qs = qp.toString() ? `?${qp.toString()}` : '';
    return fetchJson<VaultDocumentListResponse>(`/api/v1/vault/documents${qs}`);
  },

  async getVaultDocument(documentId: string): Promise<DocumentItem> {
    return fetchJson<DocumentItem>(`/api/v1/vault/documents/${documentId}`);
  },

  async updateVaultDocument(documentId: string, payload: VaultDocumentUpdatePayload): Promise<DocumentItem> {
    return fetchJson<DocumentItem>(`/api/v1/vault/documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteVaultDocument(documentId: string): Promise<void> {
    await fetchJson(`/api/v1/vault/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  async extractVaultDocument(documentId: string): Promise<DocumentItem> {
    return fetchJson<DocumentItem>(`/api/v1/vault/documents/${documentId}/extract`, {
      method: 'POST',
    });
  },

  async generateVaultOverview(documentId: string): Promise<DocumentItem> {
    return fetchJson<DocumentItem>(`/api/v1/vault/documents/${documentId}/overview`, {
      method: 'POST',
    });
  },

  async searchVault(query: string, limit: number = 20): Promise<VaultSearchResponse> {
    return fetchJson<VaultSearchResponse>(`/api/v1/vault/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  getVaultDownloadUrl(documentId: string): string {
    return `${API_BASE_URL}/api/v1/vault/documents/${documentId}/download`;
  },

  getVaultPreviewUrl(documentId: string): string {
    return `${API_BASE_URL}/api/v1/vault/documents/${documentId}/preview`;
  },

  // General Legal Provision Converter Endpoints
  async getLaws(): Promise<LawItem[]> {
    return fetchJson<LawItem[]>('/api/v1/legal/laws');
  },

  async getLawDetails(lawSlug: string): Promise<LawItem> {
    return fetchJson<LawItem>(`/api/v1/legal/laws/${lawSlug}`);
  },

  async getProvision(lawSlug: string, provisionNumber: string): Promise<LegalProvisionItem> {
    return fetchJson<LegalProvisionItem>(`/api/v1/legal/provisions/${lawSlug}/${encodeURIComponent(provisionNumber)}`);
  },

  async convertProvision(
    sourceLaw: string,
    sourceProvision: string,
    targetLaw: string
  ): Promise<ProvisionConversionResponse> {
    const qp = new URLSearchParams({
      source_law: sourceLaw,
      source_provision: sourceProvision,
      target_law: targetLaw,
    });
    return fetchJson<ProvisionConversionResponse>(`/api/v1/legal/convert?${qp.toString()}`);
  },

  async searchProvisions(query: string, lawSlug?: string, limit: number = 15): Promise<ProvisionSearchResponse> {
    const qp = new URLSearchParams({ q: query, limit: limit.toString() });
    if (lawSlug && lawSlug !== 'all') {
      qp.append('law', lawSlug);
    }
    return fetchJson<ProvisionSearchResponse>(`/api/v1/legal/search?${qp.toString()}`);
  },

  async getLegalSources(): Promise<LegalSourceItem[]> {
    return fetchJson<LegalSourceItem[]>('/api/v1/legal/sources');
  },

  // -----------------------------------------------------------
  // Lawyer Preparation API
  // -----------------------------------------------------------
  async createLawyerPreparation(payload: LawyerPreparationCreatePayload): Promise<LawyerPreparationItem> {
    return fetchJson<LawyerPreparationItem>('/api/v1/lawyer-preparation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async getLawyerPreparations(limit = 20, offset = 0): Promise<LawyerPreparationListResponse> {
    return fetchJson<LawyerPreparationListResponse>(`/api/v1/lawyer-preparation?limit=${limit}&offset=${offset}`);
  },

  async getLawyerPreparationById(sessionId: string): Promise<LawyerPreparationItem> {
    return fetchJson<LawyerPreparationItem>(`/api/v1/lawyer-preparation/${sessionId}`);
  },

  async deleteLawyerPreparation(sessionId: string): Promise<void> {
    return fetchJson<void>(`/api/v1/lawyer-preparation/${sessionId}`, {
      method: 'DELETE',
    });
  },

  // -----------------------------------------------------------
  // Legal Aid Finder API
  // -----------------------------------------------------------
  async searchLegalAid(params?: {
    state?: string;
    district?: string;
    category?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<LegalAidSearchResponse> {
    const qp = new URLSearchParams();
    if (params?.state && params.state !== 'all') qp.append('state', params.state);
    if (params?.district && params.district !== 'all') qp.append('district', params.district);
    if (params?.category && params.category !== 'all') qp.append('category', params.category);
    if (params?.q) qp.append('q', params.q);
    if (params?.page) qp.append('page', params.page.toString());
    if (params?.pageSize) qp.append('page_size', params.pageSize.toString());
    return fetchJson<LegalAidSearchResponse>(`/api/v1/legal-aid?${qp.toString()}`);
  },

  async getLegalAidLocations(): Promise<LegalAidLocationsResponse> {
    return fetchJson<LegalAidLocationsResponse>('/api/v1/legal-aid/locations');
  },

  async getLegalAidCategories(): Promise<{ categories: string[] }> {
    return fetchJson<{ categories: string[] }>('/api/v1/legal-aid/categories');
  },

  async getLegalAidById(serviceId: string): Promise<LegalAidItem> {
    return fetchJson<LegalAidItem>(`/api/v1/legal-aid/${serviceId}`);
  },

  // -----------------------------------------------------------
  // Scam Detector API
  // -----------------------------------------------------------
  async analyzeScam(payload: ScamAnalysisCreatePayload): Promise<ScamAnalysisItem> {
    return fetchJson<ScamAnalysisItem>('/api/v1/scam-detector/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async getScamHistory(limit = 20, offset = 0): Promise<ScamAnalysisListResponse> {
    return fetchJson<ScamAnalysisListResponse>(`/api/v1/scam-detector/history?limit=${limit}&offset=${offset}`);
  },

  async getScamAnalysisById(analysisId: string): Promise<ScamAnalysisItem> {
    return fetchJson<ScamAnalysisItem>(`/api/v1/scam-detector/${analysisId}`);
  },

  async deleteScamAnalysis(analysisId: string): Promise<void> {
    return fetchJson<void>(`/api/v1/scam-detector/${analysisId}`, {
      method: 'DELETE',
    });
  },
};
