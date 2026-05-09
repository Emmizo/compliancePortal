
export type Role = 'APPLICANT' | 'REVIEWER' | 'APPROVER' | 'ADMIN';

export const ALL_ROLES: readonly Role[] = ['APPLICANT', 'REVIEWER', 'APPROVER', 'ADMIN'];

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PENDING_ADDITIONAL_INFO'
  | 'REVIEWED'
  | 'APPROVED'
  | 'REJECTED';

export const TERMINAL_STATUSES: readonly ApplicationStatus[] = ['APPROVED', 'REJECTED'];

export type ReviewRecommendation = 'RECOMMEND_APPROVAL' | 'RECOMMEND_REJECTION';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
}

export interface AdminUser extends User {
  enabled: boolean;
  createdAt: string;
}

export interface LicenseType {
  id: number;
  code: string;
  label: string;
  enabled: boolean;
  createdAt: string;
}

export interface ApplicationSummary {
  id: number;
  institutionName: string;
  licenseType: string;
  description: string | null;
  status: ApplicationStatus;
  applicantId: number;
  assignedReviewerId: number | null;
  lastReviewerId: number | null;
  finalDecisionById: number | null;
  reviewRecommendation: ReviewRecommendation | null;
  decisionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface DocumentMeta {
  id: number;
  applicationId: number;
  uploaderId: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  versionNumber: number;
  uploadedAt: string;
}

export interface AuditLogEntry {
  id: number;
  occurredAt: string;
  actingUserId: number;
  actingUserFullName: string;
  actingUserEmail: string | null;
  applicationId: number | null;
  action: string;
  stateBefore: string | null;
  stateAfter: string | null;
  notes: string | null;
}

export interface ApiErrorBody {
  status: number;
  error: string;
  message: string;
  timestamp: string;
  details?: string[];
}


export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: User;
}

export interface RegisterRequest {
  email: string;
  fullName: string;
  password: string;
}

export interface CreateApplicationRequest {
  institutionName: string;
  licenseType: string;
  description?: string;
}

export interface ReviewerFollowUpRequest {
  reviewerNotes: string;
}

export interface ResubmitRequest {
  applicantNotes?: string;
}

export interface SubmitReviewRequest {
  recommendation: ReviewRecommendation;
  reviewerNotes?: string;
}

export interface FinalDecisionRequest {
  decision: 'APPROVED' | 'REJECTED';
  decisionNotes?: string;
}

export interface CreateUserRequest {
  email: string;
  fullName: string;
  password: string;
  role: Role;
}

export interface ChangeRoleRequest {
  role: Role;
}
