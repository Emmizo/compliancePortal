import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { applicationsApi } from '@/api/applications';
import type { ApplicationSummary } from '@/types';

export function useApplicationsList(): UseQueryResult<ApplicationSummary[]> {
  return useQuery({
    queryKey: ['applications', 'list'],
    queryFn: () => applicationsApi.list(),
  });
}
