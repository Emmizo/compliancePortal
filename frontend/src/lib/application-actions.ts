import type { ApplicationStatus, ApplicationSummary, Role } from '@/types';



export interface ActionFlags {
  canSubmitDraft: boolean;
  canBeginReview: boolean;
  canReviewerFollowUp: boolean;
  canSubmitReview: boolean;
  canResubmit: boolean;
  canDecide: boolean;
  canUploadDocument: boolean;
}

export const NO_ACTIONS: ActionFlags = {
  canSubmitDraft: false,
  canBeginReview: false,
  canReviewerFollowUp: false,
  canSubmitReview: false,
  canResubmit: false,
  canDecide: false,
  canUploadDocument: false,
};

export function actionsFor(
  app: ApplicationSummary,
  role: Role,
  currentUserId: number,
): ActionFlags {
  const status: ApplicationStatus = app.status;
  const isOwner = app.applicantId === currentUserId;
  const isLastReviewer = app.lastReviewerId !== null && app.lastReviewerId === currentUserId;

  switch (role) {
    case 'APPLICANT':
      return {
        ...NO_ACTIONS,
        canSubmitDraft: isOwner && status === 'DRAFT',
        canResubmit: isOwner && status === 'PENDING_ADDITIONAL_INFO',
        canUploadDocument:
          isOwner && (status === 'DRAFT' || status === 'PENDING_ADDITIONAL_INFO'),
      };
    case 'REVIEWER':
      return {
        ...NO_ACTIONS,
        canBeginReview: status === 'SUBMITTED',
        canReviewerFollowUp: status === 'UNDER_REVIEW',
        canSubmitReview: status === 'UNDER_REVIEW',
      };
    case 'APPROVER':
      return {
        ...NO_ACTIONS,
        canDecide: status === 'REVIEWED' && !isLastReviewer,
      };
    case 'ADMIN':
      return NO_ACTIONS;
  }
}
