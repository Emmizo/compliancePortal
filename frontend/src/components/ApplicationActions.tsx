import clsx from 'clsx';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi } from '@/api/applications';
import { describeError } from '@/api/http';
import { Button } from '@/components/Button';
import { TextAreaField } from '@/components/FormField';
import {
  finalDecisionSchema,
  resubmitSchema,
  reviewerFollowUpSchema,
  submitReviewSchema,
  type FinalDecisionInput,
  type ResubmitInput,
  type ReviewerFollowUpFormValues,
  type SubmitReviewInput,
} from '@/lib/schemas';
import type { ApplicationSummary } from '@/types';
import { actionsFor } from '@/lib/application-actions';
import { useAuth } from '@/contexts/AuthContext';
import { APPLICATION_QUERY_KEY } from '@/hooks/useApplicationDetail';

interface ApplicationActionsProps {
  application: ApplicationSummary;
}

export function ApplicationActions({ application }: ApplicationActionsProps) {
  const { user, role } = useAuth();
  if (!user || !role) return null;

  const flags = actionsFor(application, role, user.id);
  const anyAction = Object.values(flags).some(Boolean);
  if (!anyAction) {
    return null;
  }

  return (
    <section data-testid="application-actions" className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-gold">Actions available to you</h2>
        <p className="text-sm text-ink max-w-prose">
          Only steps that match your role and this application&apos;s current status are shown. If you expected
          an action that is missing, refresh the page or confirm with your coordinator—the server decides what is
          allowed.
        </p>
      </header>
      {flags.canSubmitDraft ? <SubmitDraftAction application={application} /> : null}
      {flags.canBeginReview ? <BeginReviewAction application={application} /> : null}
      {flags.canReviewerFollowUp ? <ReviewerFollowUpAction application={application} /> : null}
      {flags.canSubmitReview ? <SubmitReviewAction application={application} /> : null}
      {flags.canResubmit ? <ResubmitAction application={application} /> : null}
      {flags.canDecide ? <FinalDecisionAction application={application} /> : null}
    </section>
  );
}

function useApplicationMutation<TInput>(
  applicationId: number,
  fn: (input: TInput) => Promise<ApplicationSummary>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [APPLICATION_QUERY_KEY, applicationId] });
      queryClient.invalidateQueries({ queryKey: ['applications', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['audit', applicationId] });
    },
  });
}

function ActionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-brown bg-white p-3 sm:p-4">
      <h3 className="font-semibold text-gold">{title}</h3>
      {description ? <p className="text-sm text-ink mb-3">{description}</p> : null}
      {children}
    </div>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p role="alert" className="text-sm text-ink mb-2">
      <span className="font-bold text-brown">Error:</span> {message}
    </p>
  );
}

type SelectFieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, children, className, ...rest },
  ref,
) {
  return (
    <label className="block text-sm">
      <span className="text-ink font-semibold">{label}</span>
      <select
        ref={ref}
        {...rest}
        className={clsx(
          'mt-1 block w-full rounded-md border bg-white text-ink px-3 py-2 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold',
          error ? 'border-brown border-2' : 'border-brown',
          className,
        )}
      >
        {children}
      </select>
      {error ? (
        <p role="alert" className="mt-1 text-brown text-xs font-bold">
          Error: {error}
        </p>
      ) : null}
    </label>
  );
});

function SubmitDraftAction({ application }: { application: ApplicationSummary }) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useApplicationMutation(application.id, () =>
    applicationsApi.submitDraft(application.id),
  );
  return (
    <ActionPanel
      title="Submit this application"
      description="Once submitted you will not be able to change it until a reviewer asks for more information."
    >
      {error ? <ErrorLine message={error} /> : null}
      <Button
        data-testid="action-submit-draft"
        isLoading={mutation.isPending}
        onClick={() => {
          setError(null);
          mutation.mutate(undefined as never, {
            onError: (err) => setError(describeError(err)),
          });
        }}
      >
        Submit application
      </Button>
    </ActionPanel>
  );
}

function BeginReviewAction({ application }: { application: ApplicationSummary }) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useApplicationMutation(application.id, () =>
    applicationsApi.beginReview(application.id),
  );
  return (
    <ActionPanel
      title="Begin review"
      description="Claim this application and move it into UNDER_REVIEW."
    >
      {error ? <ErrorLine message={error} /> : null}
      <Button
        data-testid="action-begin-review"
        isLoading={mutation.isPending}
        onClick={() => {
          setError(null);
          mutation.mutate(undefined as never, {
            onError: (err) => setError(describeError(err)),
          });
        }}
      >
        Begin review
      </Button>
    </ActionPanel>
  );
}

function ReviewerFollowUpAction({ application }: { application: ApplicationSummary }) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ReviewerFollowUpFormValues>({
    resolver: zodResolver(reviewerFollowUpSchema),
    defaultValues: { reviewerNotes: '' },
  });
  const mutation = useApplicationMutation(application.id, (input: ReviewerFollowUpFormValues) =>
    applicationsApi.requestReviewerFollowUp(application.id, input),
  );

  return (
    <ActionPanel
      title="Follow up with the applicant"
      description="Explain what documents or clarification you still need so they can amend the filing."
    >
      <form
        onSubmit={handleSubmit(
          (values) => {
            setError(null);
            mutation.mutate(values, {
              onSuccess: () => reset(),
              onError: (err) => setError(describeError(err)),
            });
          },
          (fieldErrors) => {
            setError(fieldErrors.reviewerNotes?.message ?? 'Check the highlighted fields and try again.');
          },
        )}
        className="space-y-3"
        noValidate
      >
        <TextAreaField
          label="Reviewer notes"
          {...register('reviewerNotes')}
          error={errors.reviewerNotes?.message}
        />
        {error ? <ErrorLine message={error} /> : null}
        <Button data-testid="action-request-info" type="submit" isLoading={mutation.isPending}>
          Send follow-up
        </Button>
      </form>
    </ActionPanel>
  );
}

function SubmitReviewAction({ application }: { application: ApplicationSummary }) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubmitReviewInput>({
    resolver: zodResolver(submitReviewSchema),
    defaultValues: { recommendation: 'RECOMMEND_APPROVAL', reviewerNotes: '' },
  });
  const mutation = useApplicationMutation(application.id, (input: SubmitReviewInput) =>
    applicationsApi.submitReview(application.id, {
      recommendation: input.recommendation,
      reviewerNotes: input.reviewerNotes ? input.reviewerNotes : undefined,
    }),
  );

  return (
    <ActionPanel title="Submit review" description="Record your recommendation and hand off to an approver.">
      <form
        onSubmit={handleSubmit(
          (values) => {
            setError(null);
            mutation.mutate(values, {
              onSuccess: () => reset(),
              onError: (err) => setError(describeError(err)),
            });
          },
          (fieldErrors) => {
            const msg =
              fieldErrors.recommendation?.message ??
              fieldErrors.reviewerNotes?.message ??
              'Check the highlighted fields and try again.';
            setError(msg);
          },
        )}
        className="space-y-3"
        noValidate
      >
        <SelectField
          label="Recommendation"
          {...register('recommendation')}
          error={errors.recommendation?.message}
        >
          <option value="RECOMMEND_APPROVAL">Recommend approval</option>
          <option value="RECOMMEND_REJECTION">Recommend rejection</option>
        </SelectField>
        <TextAreaField
          label="Reviewer notes (optional)"
          {...register('reviewerNotes')}
          error={errors.reviewerNotes?.message}
        />
        {error ? <ErrorLine message={error} /> : null}
        <Button data-testid="action-submit-review" type="submit" isLoading={mutation.isPending}>
          Submit review
        </Button>
      </form>
    </ActionPanel>
  );
}

function ResubmitAction({ application }: { application: ApplicationSummary }) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ResubmitInput>({
    resolver: zodResolver(resubmitSchema),
    defaultValues: { applicantNotes: '' },
  });
  const mutation = useApplicationMutation(application.id, (input: ResubmitInput) =>
    applicationsApi.resubmit(application.id, {
      applicantNotes: input.applicantNotes ? input.applicantNotes : undefined,
    }),
  );

  return (
    <ActionPanel
      title="Resubmit with additional information"
      description="Confirm that you have uploaded the requested documents, then resubmit the application for review."
    >
      <form
        onSubmit={handleSubmit(
          (values) => {
            setError(null);
            mutation.mutate(values, {
              onSuccess: () => reset(),
              onError: (err) => setError(describeError(err)),
            });
          },
          (fieldErrors) => {
            setError(fieldErrors.applicantNotes?.message ?? 'Check the highlighted fields and try again.');
          },
        )}
        className="space-y-3"
        noValidate
      >
        <TextAreaField
          label="Notes to the reviewer (optional)"
          {...register('applicantNotes')}
          error={errors.applicantNotes?.message}
        />
        {error ? <ErrorLine message={error} /> : null}
        <Button data-testid="action-resubmit" type="submit" isLoading={mutation.isPending}>
          Resubmit
        </Button>
      </form>
    </ActionPanel>
  );
}

function FinalDecisionAction({ application }: { application: ApplicationSummary }) {
  const [error, setError] = useState<string | null>(null);
  const errorAnchorRef = useRef<HTMLDivElement>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FinalDecisionInput>({
    resolver: zodResolver(finalDecisionSchema),
    defaultValues: { decision: 'APPROVED', decisionNotes: '' },
  });
  const mutation = useApplicationMutation(application.id, (input: FinalDecisionInput) =>
    applicationsApi.decide(application.id, {
      decision: input.decision,
      decisionNotes: input.decisionNotes,
    }),
  );

  useEffect(() => {
    if (error && errorAnchorRef.current) {
      errorAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

  return (
    <ActionPanel title="Make the final decision" description="A written reason is required and will be stored on the audit log.">
      <form
        onSubmit={handleSubmit(
          (values) => {
            setError(null);
            mutation.mutate(values, {
              onSuccess: () => reset(),
              onError: (err) => setError(describeError(err)),
            });
          },
          (fieldErrors) => {
            const msg =
              fieldErrors.decisionNotes?.message ??
              fieldErrors.decision?.message ??
              'Check the highlighted fields and try again.';
            setError(msg);
          },
        )}
        className="space-y-3"
        noValidate
      >
        <SelectField label="Decision" {...register('decision')} error={errors.decision?.message}>
          <option value="APPROVED">Approve</option>
          <option value="REJECTED">Reject</option>
        </SelectField>
        <TextAreaField
          label="Reason for the decision"
          {...register('decisionNotes')}
          error={errors.decisionNotes?.message}
        />
        {error ? (
          <div ref={errorAnchorRef}>
            <ErrorLine message={error} />
          </div>
        ) : null}
        <Button data-testid="action-decide" type="submit" isLoading={mutation.isPending}>
          Record decision
        </Button>
      </form>
    </ActionPanel>
  );
}
