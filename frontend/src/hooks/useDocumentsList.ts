import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { documentsApi } from '@/api/documents';
import { useRealtimeConnection } from '@/contexts/RealtimeConnectionContext';
import { APPLICATION_LIVE_FALLBACK_POLL_MS } from '@/lib/realtime-fallback';
import type { DocumentMeta } from '@/types';

export function useDocumentsList(applicationId: number | undefined): UseQueryResult<DocumentMeta[]> {
  const realtimeConnected = useRealtimeConnection();
  return useQuery({
    queryKey: ['documents', applicationId],
    queryFn: () => {
      if (applicationId === undefined) throw new Error('applicationId required');
      return documentsApi.list(applicationId);
    },
    enabled: applicationId !== undefined,
    refetchInterval: realtimeConnected ? false : APPLICATION_LIVE_FALLBACK_POLL_MS,
  });
}
