import { Link } from 'react-router-dom';
import { describeError } from '@/api/http';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useApplicationsList } from '@/hooks/useApplicationsList';

export function ApplicationListPage() {
  const { role } = useAuth();
  const query = useApplicationsList();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gold break-words">Applications</h1>
          <p className="text-sm text-ink max-w-prose">
            {role === 'APPLICANT' &&
              'All your case files are listed here—including drafts. Open a row to upload documents, submit your application, or continue the workflow after a regulator requests more information.'}
            {role === 'REVIEWER' &&
              'Applications you can pick up for review appear in this table. Open one to begin review, request additional information from the applicant, or complete your recommendation.'}
            {role === 'APPROVER' &&
              'Applications that have completed review and are waiting for a final regulatory decision. Open a case to approve or reject; you cannot be the same person who last reviewed that application.'}
            {role === 'ADMIN' &&
              'Every application in the portal, in every state. Open a case to inspect it or assign a reviewer; workflow rules are enforced by the system, not bypassed here.'}
          </p>
        </div>
        {role === 'APPLICANT' ? (
          <Link to="/applications/new" className="shrink-0 w-full sm:w-auto">
            <Button className="w-full sm:w-auto">New application</Button>
          </Link>
        ) : null}
      </header>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={describeError(query.error)} onRetry={() => query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState title="Nothing to show yet" description="No applications match your filter." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-brown bg-white -mx-1 sm:mx-0 touch-pan-x">
          <table className="min-w-[640px] w-full text-ink">
            <thead className="bg-white text-xs uppercase tracking-wide text-brown border-b border-brown">
              <tr>
                <th className="px-4 py-2 text-left">Institution</th>
                <th className="px-4 py-2 text-left">License type</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Updated</th>
                <th className="px-4 py-2 text-right" />
              </tr>
            </thead>
            <tbody className="text-sm">
              {query.data.map((app) => (
                <tr key={app.id} className="border-t border-brown">
                  <td className="px-4 py-2 font-semibold text-ink">{app.institutionName}</td>
                  <td className="px-4 py-2 text-ink">{app.licenseType}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-2 text-ink">
                    {new Date(app.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      to={`/applications/${app.id}`}
                      className="text-brown hover:text-gold underline text-sm"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
