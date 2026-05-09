import { http } from './http';
import type {
  ApplicationSummary,
  AuditLogEntry,
  CreateApplicationRequest,
  FinalDecisionRequest,
  ResubmitRequest,
  ReviewerFollowUpRequest,
  SubmitReviewRequest,
} from '@/types';

export const applicationsApi = {
  async list(): Promise<ApplicationSummary[]> {
    return (await http.get<ApplicationSummary[]>('/applications')).data;
  },
  async get(id: number): Promise<ApplicationSummary> {
    return (await http.get<ApplicationSummary>(`/applications/${id}`)).data;
  },
  async create(payload: CreateApplicationRequest): Promise<ApplicationSummary> {
    return (await http.post<ApplicationSummary>('/applications', payload)).data;
  },
  async submitDraft(id: number): Promise<ApplicationSummary> {
    return (await http.post<ApplicationSummary>(`/applications/${id}/submit`)).data;
  },
  async beginReview(id: number): Promise<ApplicationSummary> {
    return (await http.post<ApplicationSummary>(`/applications/${id}/begin-review`)).data;
  },
  async requestReviewerFollowUp(id: number, payload: ReviewerFollowUpRequest): Promise<ApplicationSummary> {
    return (
      await http.post<ApplicationSummary>(`/applications/${id}/request-info`, payload)
    ).data;
  },
  async resubmit(id: number, payload: ResubmitRequest): Promise<ApplicationSummary> {
    return (await http.post<ApplicationSummary>(`/applications/${id}/resubmit`, payload)).data;
  },
  async submitReview(id: number, payload: SubmitReviewRequest): Promise<ApplicationSummary> {
    return (await http.post<ApplicationSummary>(`/applications/${id}/submit-review`, payload)).data;
  },
  async decide(id: number, payload: FinalDecisionRequest): Promise<ApplicationSummary> {
    return (await http.post<ApplicationSummary>(`/applications/${id}/decision`, payload)).data;
  },
  async auditTrail(id: number): Promise<AuditLogEntry[]> {
    return (await http.get<AuditLogEntry[]>(`/applications/${id}/audit`)).data;
  },
};
