import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { applicationsApi } from '@/api/applications';
import { useRealtimeConnection } from '@/contexts/RealtimeConnectionContext';
import { APPLICATION_LIVE_FALLBACK_POLL_MS } from '@/lib/realtime-fallback';
import type { ApplicationSummary } from '@/types';

export const APPLICATION_QUERY_KEY = 'applications' as const;

export function useApplicationDetail(applicationId: number | undefined): UseQueryResult<ApplicationSummary> {
  const realtimeConnected = useRealtimeConnection();
  return useQuery({
    queryKey: [APPLICATION_QUERY_KEY, applicationId],
    queryFn: () => {
      if (applicationId === undefined) {
        throw new Error('applicationId is required');
      }
      return applicationsApi.get(applicationId);
    },
    enabled: applicationId !== undefined,
    refetchInterval: realtimeConnected ? false : APPLICATION_LIVE_FALLBACK_POLL_MS,
  });
}
