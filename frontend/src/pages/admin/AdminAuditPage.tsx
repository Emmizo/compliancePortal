import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { auditApi } from '@/api/audit';
import { applicationsApi } from '@/api/applications';
import { usersApi } from '@/api/users';
import { describeError } from '@/api/http';
import { useRealtimeConnection } from '@/contexts/RealtimeConnectionContext';
import { APPLICATION_LIVE_FALLBACK_POLL_MS } from '@/lib/realtime-fallback';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import type { AdminUser, ApplicationSummary, AuditLogEntry } from '@/types';

type Mode = 'application' | 'user';

const SELECT_CLASSES =
  'mt-1 block w-full min-w-0 sm:min-w-[16rem] max-w-full rounded-md border border-brown bg-white text-ink px-3 py-2 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold';

function sortedUsers(users: AdminUser[]): AdminUser[] {
  return [...users].sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));
}

function sortedApplications(applications: ApplicationSummary[]): ApplicationSummary[] {
  return [...applications].sort((a, b) =>
    a.institutionName.localeCompare(b.institutionName, undefined, { sensitivity: 'base' }),
  );
}

export function AdminAuditPage() {
  const realtimeConnected = useRealtimeConnection();
  const [mode, setMode] = useState<Mode>('application');
  const [selectedId, setSelectedId] = useState('');
  const [results, setResults] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => usersApi.list(),
  });

  const applicationsQuery = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.list(),
    refetchInterval: realtimeConnected ? false : APPLICATION_LIVE_FALLBACK_POLL_MS,
  });

  const userById = useMemo(() => {
    const m = new Map<number, AdminUser>();
    for (const u of usersQuery.data ?? []) {
      m.set(u.id, u);
    }
    return m;
  }, [usersQuery.data]);

  const appById = useMemo(() => {
    const m = new Map<number, ApplicationSummary>();
    for (const a of applicationsQuery.data ?? []) {
      m.set(a.id, a);
    }
    return m;
  }, [applicationsQuery.data]);

  const userOptions = useMemo(() => sortedUsers(usersQuery.data ?? []), [usersQuery.data]);
  const appOptions = useMemo(() => sortedApplications(applicationsQuery.data ?? []), [applicationsQuery.data]);

  const applicationSelectLabel = (app: ApplicationSummary): string => {
    const sameName = appOptions.filter((x) => x.institutionName === app.institutionName);
    if (sameName.length > 1) {
      return `${app.institutionName} (${app.licenseType})`;
    }
    return app.institutionName;
  };

  useEffect(() => {
    setSelectedId('');
    setResults(null);
    setError(null);
  }, [mode]);

  const lookupsLoading = usersQuery.isPending || applicationsQuery.isPending;
  const lookupsError = usersQuery.error ?? applicationsQuery.error;

  const search = useMutation({
    mutationFn: async () => {
      const numeric = Number.parseInt(selectedId, 10);
      if (!selectedId || Number.isNaN(numeric)) {
        throw new Error('Choose someone or an application from the list');
      }
      return mode === 'application'
        ? auditApi.byApplication(numeric)
        : auditApi.byUser(numeric);
    },
    onSuccess: (data) => {
      setResults(data);
      setError(null);
    },
    onError: (err) => {
      setResults(null);
      setError(describeError(err));
    },
  });

  const selectedUserLabel = (): string | null => {
    const id = Number.parseInt(selectedId, 10);
    if (Number.isNaN(id)) return null;
    const u = userById.get(id);
    return u ? `${u.fullName} (${u.email})` : null;
  };

  const selectedApplicationLabel = (): string | null => {
    const id = Number.parseInt(selectedId, 10);
    if (Number.isNaN(id)) return null;
    const a = appById.get(id);
    return a ? applicationSelectLabel(a) : null;
  };

  const resolveActor = (entry: AuditLogEntry) => {
    const primary = entry.actingUserFullName?.trim() || `User #${entry.actingUserId}`;
    if (entry.actingUserEmail) {
      return `${primary} (${entry.actingUserEmail})`;
    }
    return primary;
  };

  const resolveApplication = (applicationId: number | null) => {
    if (applicationId == null) return null;
    const a = appById.get(applicationId);
    return a ? applicationSelectLabel(a) : `Application #${applicationId}`;
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-gold break-words">System audit log</h1>
        <p className="text-sm text-ink max-w-prose">
          Read-only legal-evidence record of every state change and significant action.
        </p>
      </header>

      {lookupsError ? (
        <ErrorState message={describeError(lookupsError)} onRetry={() => { void usersQuery.refetch(); void applicationsQuery.refetch(); }} />
      ) : null}

      <section className="bg-white border border-brown rounded-lg p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="text-sm w-full sm:w-auto sm:min-w-[9rem]">
          <span className="text-ink font-semibold">Search by</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className={SELECT_CLASSES}
          >
            <option value="application">Application (institution)</option>
            <option value="user">Acting user</option>
          </select>
        </label>

        <label className="text-sm flex-1 min-w-0 w-full sm:min-w-[12rem]">
          <span className="text-ink font-semibold">
            {mode === 'application' ? 'Institution' : 'User'}
          </span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={lookupsLoading}
            className={SELECT_CLASSES}
          >
            <option value="">
              {lookupsLoading ? 'Loading…' : mode === 'application' ? 'Select an institution…' : 'Select a user…'}
            </option>
            {mode === 'application'
              ? appOptions.map((app) => (
                  <option key={app.id} value={String(app.id)}>
                    {applicationSelectLabel(app)}
                  </option>
                ))
              : userOptions.map((user) => (
                  <option key={user.id} value={String(user.id)}>
                    {user.fullName} ({user.email}) — {user.role}
                  </option>
                ))}
          </select>
        </label>

        <Button
          className="w-full sm:w-auto shrink-0"
          onClick={() => search.mutate()}
          isLoading={search.isPending}
          disabled={lookupsLoading}
        >
          Search
        </Button>
      </section>

      {error ? <ErrorState message={error} /> : null}

      {results !== null && results.length > 0 ? (
        <p className="text-sm text-ink">
          Showing entries for{' '}
          <span className="font-semibold text-brown">
            {mode === 'application' ? selectedApplicationLabel() : selectedUserLabel()}
          </span>
        </p>
      ) : null}

      {results !== null ? (
        results.length === 0 ? (
          <EmptyState title="No audit entries match that query" />
        ) : (
          <ol className="space-y-2">
            {results.map((entry) => {
              const appName = resolveApplication(entry.applicationId);
              return (
                <li
                  key={entry.id}
                  className="rounded-md border border-brown bg-white p-3 text-sm text-ink"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <span className="font-bold text-gold">{entry.action}</span>
                    <span className="text-xs text-ink">
                      {new Date(entry.occurredAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-ink mt-1 break-words">
                    {resolveActor(entry)}
                    {appName ? (
                      <>
                        {' '}
                        &middot; {appName}
                      </>
                    ) : null}
                    {entry.stateBefore && entry.stateAfter ? (
                      <>
                        {' '}
                        &middot; {entry.stateBefore} &rarr; {entry.stateAfter}
                      </>
                    ) : null}
                  </p>
                  {entry.notes ? (
                    <p className="mt-1 text-ink whitespace-pre-line">{entry.notes}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )
      ) : null}
    </div>
  );
}
