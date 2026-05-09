import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { documentsApi } from '@/api/documents';
import type { DocumentMeta } from '@/types';

export function useDocumentsList(applicationId: number | undefined): UseQueryResult<DocumentMeta[]> {
  return useQuery({
    queryKey: ['documents', applicationId],
    queryFn: () => {
      if (applicationId === undefined) throw new Error('applicationId required');
      return documentsApi.list(applicationId);
    },
    enabled: applicationId !== undefined,
  });
}
