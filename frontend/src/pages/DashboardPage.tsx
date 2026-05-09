import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApplicationsList } from '@/hooks/useApplicationsList';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { describeError } from '@/api/http';
import type { Role } from '@/types';

const ROLE_HEADLINES: Record<Role, { title: string; subtitle: string }> = {
  APPLICANT: {
    title: 'Your applications',
    subtitle: 'Track the status of your licensing applications and respond to information requests.',
  },
  REVIEWER: {
    title: 'Applications waiting on you',
    subtitle: 'Begin a review or continue your in-progress assessments.',
  },
  APPROVER: {
    title: 'Applications awaiting decision',
    subtitle: 'Review reviewer recommendations and record your final decision.',
  },
  ADMIN: {
    title: 'All applications in the portal',
    subtitle: 'System-wide view across every state and every applicant.',
  },
};

export function DashboardPage() {
  const { user, role } = useAuth();
  const query = useApplicationsList();

  if (!user || !role) return null;
  const headline = ROLE_HEADLINES[role];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-gold leading-snug break-words">
          {headline.title}
        </h1>
        <p className="text-sm text-ink max-w-prose">{headline.subtitle}</p>
      </header>

      {query.isLoading ? (
        <LoadingState label="Loading your applications..." />
      ) : query.isError ? (
        <ErrorState message={describeError(query.error)} onRetry={() => query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState
          title="No applications to show"
          description={
            role === 'APPLICANT'
              ? "You haven't submitted any applications yet."
              : 'There is nothing in your queue at the moment.'
          }
          action={
            role === 'APPLICANT' ? (
              <Link to="/applications/new">
                <Button>Start a new application</Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.map((app) => (
            <li key={app.id}>
              <Link
                to={`/applications/${app.id}`}
                className="block rounded-lg border border-brown bg-white p-4 hover:border-gold hover:border-2 transition-colors min-h-[44px]"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <h2 className="font-semibold text-gold text-base break-words min-w-0 flex-1">
                    {app.institutionName}
                  </h2>
                  <div className="shrink-0">
                    <StatusBadge status={app.status} />
                  </div>
                </div>
                <p className="text-xs text-ink mt-1 break-all">{app.licenseType}</p>
                <p className="text-xs text-ink mt-2">
                  Updated {new Date(app.updatedAt).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
