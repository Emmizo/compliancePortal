import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { applicationsApi } from '@/api/applications';
import { useRealtimeConnection } from '@/contexts/RealtimeConnectionContext';
import { APPLICATION_LIVE_FALLBACK_POLL_MS } from '@/lib/realtime-fallback';
import type { ApplicationSummary } from '@/types';

export function useApplicationsList(): UseQueryResult<ApplicationSummary[]> {
  const realtimeConnected = useRealtimeConnection();
  return useQuery({
    queryKey: ['applications', 'list'],
    queryFn: () => applicationsApi.list(),
    refetchInterval: realtimeConnected ? false : APPLICATION_LIVE_FALLBACK_POLL_MS,
  });
}
