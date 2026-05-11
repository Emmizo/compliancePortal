import { useEffect, useRef, type MutableRefObject } from 'react';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeConnectionDispatch } from '@/contexts/RealtimeConnectionContext';
import type { Role } from '@/types';
import { getAuthToken } from '@/api/http';
import { connectApplicationRealtime } from '@/realtime/applicationRealtime';

/** Batches bursty licensee workflow commits (multi-table tx) into one TanStack sweep; timer cleared on teardown so logout does not leak a pending invalidation. */
const LICENSING_REALTIME_DEBOUNCE_MS = 320;

function scheduleLicensingCachesRefreshForRoles(
  role: Role,
  licensingPortalTanStackClient: QueryClient,
  debouncerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
): void {
  const priorDebounceTimer = debouncerRef.current;
  if (priorDebounceTimer !== null) {
    clearTimeout(priorDebounceTimer);
  }

  debouncerRef.current = setTimeout(() => {
    debouncerRef.current = null;
    void licensingPortalTanStackClient.invalidateQueries({ queryKey: ['applications', 'list'] });
    void licensingPortalTanStackClient.invalidateQueries({ queryKey: ['applications'] });
    void licensingPortalTanStackClient.invalidateQueries({ queryKey: ['documents'] });
    const internalStaffNeedsWorkflowHistory =
      role === 'ADMIN' || role === 'REVIEWER' || role === 'APPROVER';
    if (internalStaffNeedsWorkflowHistory) {
      void licensingPortalTanStackClient.invalidateQueries({ queryKey: ['audit'] });
    }
    // Admin screens keep separate query roots (`admin/users`, …) that do not nest under shared application keys.
    if (role === 'ADMIN') {
      void licensingPortalTanStackClient.invalidateQueries({ queryKey: ['admin'] });
    }
  }, LICENSING_REALTIME_DEBOUNCE_MS);
}

export function RealtimeSync() {
  const { status, role } = useAuth();
  const licensingPortalTanStackClient = useQueryClient();
  const realtimeInvalidationDebounceSlot = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setRealtimeConnected = useRealtimeConnectionDispatch();

  useEffect(() => {
    if (status !== 'authenticated' || role === null) {
      setRealtimeConnected(false);
      return undefined;
    }
    const jwtMaterializedForSockJs = getAuthToken();
    if (!jwtMaterializedForSockJs) {
      setRealtimeConnected(false);
      // status can lag http memory after storage failure path; CONNECT would throw anyway.
      return undefined;
    }

    setRealtimeConnected(false);

    const client = connectApplicationRealtime(
      role,
      () => {
        scheduleLicensingCachesRefreshForRoles(
          role,
          licensingPortalTanStackClient,
          realtimeInvalidationDebounceSlot,
        );
      },
      setRealtimeConnected,
    );

    return () => {
      setRealtimeConnected(false);
      const danglingDebounceTimer = realtimeInvalidationDebounceSlot.current;
      if (danglingDebounceTimer !== null) {
        clearTimeout(danglingDebounceTimer);
        realtimeInvalidationDebounceSlot.current = null;
      }
      void client.deactivate();
    };
  }, [status, role, licensingPortalTanStackClient, setRealtimeConnected]);

  return null;
}
