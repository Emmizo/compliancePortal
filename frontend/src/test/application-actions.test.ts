import { describe, expect, it } from 'vitest';
import { actionsFor } from '@/lib/application-actions';
import type { ApplicationStatus, ApplicationSummary } from '@/types';


const baseApp: ApplicationSummary = {
  id: 100,
  institutionName: 'Acme Bank',
  licenseType: 'COMMERCIAL_BANK',
  description: null,
  status: 'DRAFT',
  applicantId: 1,
  assignedReviewerId: null,
  lastReviewerId: null,
  finalDecisionById: null,
  reviewRecommendation: null,
  decisionNotes: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  version: 0,
};

function withStatus(status: ApplicationStatus, patch: Partial<ApplicationSummary> = {}): ApplicationSummary {
  return { ...baseApp, status, ...patch };
}

describe('APPLICANT (the owner)', () => {
  it('can submit and upload while the application is DRAFT', () => {
    const flags = actionsFor(withStatus('DRAFT'), 'APPLICANT', 1);
    expect(flags.canSubmitDraft).toBe(true);
    expect(flags.canUploadDocument).toBe(true);
    expect(flags.canBeginReview).toBe(false);
    expect(flags.canReviewerFollowUp).toBe(false);
    expect(flags.canSubmitReview).toBe(false);
    expect(flags.canResubmit).toBe(false);
    expect(flags.canDecide).toBe(false);
  });

  it('can resubmit and upload while PENDING_ADDITIONAL_INFO', () => {
    const flags = actionsFor(withStatus('PENDING_ADDITIONAL_INFO'), 'APPLICANT', 1);
    expect(flags.canResubmit).toBe(true);
    expect(flags.canUploadDocument).toBe(true);
    expect(flags.canSubmitDraft).toBe(false);
  });

  it('cannot do anything once the application is SUBMITTED', () => {
    const flags = actionsFor(withStatus('SUBMITTED'), 'APPLICANT', 1);
    for (const v of Object.values(flags)) expect(v).toBe(false);
  });

  it('cannot act on an application that does not belong to them', () => {
    const flags = actionsFor(withStatus('DRAFT', { applicantId: 2 }), 'APPLICANT', 1);
    expect(flags.canSubmitDraft).toBe(false);
    expect(flags.canUploadDocument).toBe(false);
  });
});

describe('REVIEWER', () => {
  it('can begin review when SUBMITTED', () => {
    const flags = actionsFor(withStatus('SUBMITTED'), 'REVIEWER', 9);
    expect(flags.canBeginReview).toBe(true);
    expect(flags.canReviewerFollowUp).toBe(false);
  });

  it('can send a follow-up or submit review while UNDER_REVIEW', () => {
    const flags = actionsFor(withStatus('UNDER_REVIEW'), 'REVIEWER', 9);
    expect(flags.canReviewerFollowUp).toBe(true);
    expect(flags.canSubmitReview).toBe(true);
  });

  it('cannot make a final decision -- ever', () => {
    for (const status of [
      'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_ADDITIONAL_INFO',
      'REVIEWED', 'APPROVED', 'REJECTED',
    ] as ApplicationStatus[]) {
      const flags = actionsFor(withStatus(status), 'REVIEWER', 9);
      expect(flags.canDecide, `status=${status}`).toBe(false);
    }
  });
});

describe('APPROVER', () => {
  it('can decide when REVIEWED and not the same user as the reviewer', () => {
    const flags = actionsFor(
      withStatus('REVIEWED', { lastReviewerId: 9 }),
      'APPROVER',
      42,
    );
    expect(flags.canDecide).toBe(true);
  });

  it('CANNOT decide if they are the same user who submitted the review (separation of duties)', () => {
    const flags = actionsFor(
      withStatus('REVIEWED', { lastReviewerId: 42 }),
      'APPROVER',
      42,
    );
    expect(flags.canDecide).toBe(false);
  });

  it('cannot decide before the application is REVIEWED', () => {
    for (const status of ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_ADDITIONAL_INFO'] as ApplicationStatus[]) {
      const flags = actionsFor(withStatus(status), 'APPROVER', 42);
      expect(flags.canDecide, `status=${status}`).toBe(false);
    }
  });

  it('cannot decide after a terminal state', () => {
    for (const status of ['APPROVED', 'REJECTED'] as ApplicationStatus[]) {
      const flags = actionsFor(withStatus(status), 'APPROVER', 42);
      expect(flags.canDecide, `status=${status}`).toBe(false);
    }
  });

  it('cannot pick up reviewer tooling as APPROVER on REVIEWED filings', () => {
    const flags = actionsFor(withStatus('REVIEWED'), 'APPROVER', 42);
    expect(flags.canBeginReview).toBe(false);
    expect(flags.canReviewerFollowUp).toBe(false);
    expect(flags.canSubmitReview).toBe(false);
    expect(flags.canUploadDocument).toBe(false);
  });
});

describe('ADMIN', () => {
  it('does not drive the workflow itself', () => {
    for (const status of [
      'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_ADDITIONAL_INFO',
      'REVIEWED', 'APPROVED', 'REJECTED',
    ] as ApplicationStatus[]) {
      const flags = actionsFor(withStatus(status), 'ADMIN', 99);
      for (const v of Object.values(flags)) expect(v).toBe(false);
    }
  });
});
