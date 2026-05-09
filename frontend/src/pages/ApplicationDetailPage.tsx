import { Link, useParams } from 'react-router-dom';
import { describeError } from '@/api/http';
import { ApplicationActions } from '@/components/ApplicationActions';
import { DocumentTable } from '@/components/DocumentTable';
import { DocumentUpload } from '@/components/DocumentUpload';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RoleGate } from '@/components/RoleGate';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useApplicationDetail } from '@/hooks/useApplicationDetail';
import { useDocumentsList } from '@/hooks/useDocumentsList';
import { actionsFor } from '@/lib/application-actions';

export function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const applicationId = params.id ? Number.parseInt(params.id, 10) : undefined;
  const { user, role } = useAuth();
  const detail = useApplicationDetail(applicationId);
  const documents = useDocumentsList(applicationId);

  if (!applicationId || Number.isNaN(applicationId)) {
    return <ErrorState message="Invalid application id" />;
  }
  if (!user || !role) return null;

  if (detail.isLoading) return <LoadingState />;
  if (detail.isError)
    return <ErrorState message={describeError(detail.error)} onRetry={() => detail.refetch()} />;
  if (!detail.data)
    return <EmptyState title="Application not found" description="The requested application does not exist or has been removed." />;

  const app = detail.data;
  const flags = actionsFor(app, role, user.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gold break-words">{app.institutionName}</h1>
          <p className="text-sm text-ink mt-1 break-words">
            {app.licenseType} &middot; created {new Date(app.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <StatusBadge status={app.status} />
          {role !== 'APPLICANT' ? (
            <Link
              to={`/applications/${app.id}/audit`}
              className="text-sm text-brown hover:text-gold underline py-2 min-h-[44px] inline-flex items-center"
            >
              {role === 'ADMIN' ? 'View full audit trail' : 'Your activity on this case'}
            </Link>
          ) : null}
        </div>
      </header>

      <p className="text-sm text-ink max-w-prose border-l-2 border-gold pl-3 py-0.5">
        {role === 'APPLICANT' && (
          <>
            The badge shows where this application stands. Use <strong>Actions</strong> when buttons appear—that is
            what you can do from this status.
          </>
        )}
        {role === 'REVIEWER' && (
          <>
            Use <strong>Actions</strong> for steps you can take on this case. Check <strong>Documents</strong> before
            you submit your review. <strong>Your activity on this case</strong> lists only what you did yourself.
          </>
        )}
        {role === 'APPROVER' && (
          <>
            Decisions here are final. If nothing shows, the case must be in <strong>REVIEWED</strong> and you
            can&apos;t be the same person who completed the review step. Your own steps are under{' '}
            <strong>Your activity on this case</strong>.
          </>
        )}
        {role === 'ADMIN' && (
          <>
            Workflow rules here match reviewers and applicants. Use the header link for this file&apos;s full
            audit trail, or <strong>Audit log</strong> in the menu to search everyone.
          </>
        )}
      </p>

      {app.description ? (
        <section className="rounded-md border border-brown bg-white p-4">
          <h2 className="text-sm font-semibold text-gold">Description</h2>
          <p className="text-sm text-ink mt-1 whitespace-pre-line">{app.description}</p>
        </section>
      ) : null}

      <ApplicationActions application={app} />

      <section className="space-y-3">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-gold">Documents</h2>
          <p className="text-sm text-ink max-w-prose">
            <strong>View</strong> and <strong>Download</strong> are in the last column—scroll sideways if the table
            is clipped. For Word or Excel, use <strong>Download</strong>.
          </p>
        </header>

        <RoleGate allow={['APPLICANT']}>
          {flags.canUploadDocument ? <DocumentUpload applicationId={app.id} /> : null}
        </RoleGate>

        {documents.isLoading ? (
          <LoadingState label="Loading documents..." />
        ) : documents.isError ? (
          <ErrorState
            message={describeError(documents.error)}
            onRetry={() => documents.refetch()}
          />
        ) : (
          <DocumentTable
            applicationId={app.id}
            documents={documents.data ?? []}
            emptyDescription={
              flags.canUploadDocument
                ? 'Use the upload form above to attach supporting documentation.'
                : 'No files have been attached to this application yet.'
            }
          />
        )}
      </section>
    </div>
  );
}
