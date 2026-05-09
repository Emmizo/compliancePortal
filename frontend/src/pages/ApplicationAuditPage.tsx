import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { applicationsApi } from '@/api/applications';
import { describeError } from '@/api/http';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useAuth } from '@/contexts/AuthContext';

export function ApplicationAuditPage() {
  const params = useParams<{ id: string }>();
  const applicationId = params.id ? Number.parseInt(params.id, 10) : undefined;
  const { role } = useAuth();

  const query = useQuery({
    queryKey: ['audit', applicationId],
    queryFn: () => {
      if (applicationId === undefined) throw new Error('applicationId required');
      return applicationsApi.auditTrail(applicationId);
    },
    enabled: applicationId !== undefined,
  });

  if (!applicationId || Number.isNaN(applicationId)) {
    return <ErrorState message="Invalid application id" />;
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gold break-words">
            {role === 'ADMIN' ? 'Application audit trail' : 'Your activity on this application'}
          </h1>
          <p className="text-sm text-ink max-w-prose">
            {role === 'ADMIN' ? (
              <>
                Append-only history of every state change and significant action for this application. Entries
                cannot be edited or deleted through this portal. Use the global <strong>Audit log</strong> in
                the menu to search across users and applications.
              </>
            ) : (
              <>
                Steps <strong>you</strong> recorded on this case (other users&apos; actions are hidden from this
                list). Applicants follow status on the application page instead.
              </>
            )}
          </p>
        </div>
        <Link
          className="text-sm text-brown hover:text-gold underline shrink-0 py-2 min-h-[44px] inline-flex items-center"
          to={`/applications/${applicationId}`}
        >
          Back to application
        </Link>
      </header>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={describeError(query.error)} onRetry={() => query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState
          title={
            role === 'ADMIN' ? 'No audit entries yet' : 'No activity from you on this application yet'
          }
        />
      ) : (
        <ol className="border-l-2 border-brown pl-6 space-y-4">
          {query.data.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[34px] top-1.5 inline-block h-3 w-3 rounded-full bg-gold border-2 border-white" />
              <div className="rounded-md border border-brown bg-white p-3">
                <p className="text-sm">
                  <span className="font-bold text-gold">{entry.action}</span>
                  {entry.stateBefore && entry.stateAfter ? (
                    <span className="text-ink">
                      {' '}
                      &middot; {entry.stateBefore} &rarr; {entry.stateAfter}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-ink mt-1">
                  {new Date(entry.occurredAt).toLocaleString()} &middot;{' '}
                  <span className="font-medium text-ink">{entry.actingUserFullName}</span>
                  {entry.actingUserEmail ? (
                    <span className="text-ink/90"> ({entry.actingUserEmail})</span>
                  ) : null}
                </p>
                {entry.notes ? (
                  <p className="text-sm text-ink mt-2 whitespace-pre-line">{entry.notes}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
