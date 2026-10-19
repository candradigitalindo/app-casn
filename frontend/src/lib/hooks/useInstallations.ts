import { useQuery } from '@tanstack/react-query';
import { installationsApi } from '@/lib/api/installations';

export const installationKeys = {
  all: ['installations'] as const,
  summary: () => [...installationKeys.all, 'summary'] as const,
};

export function useInstallationSummary() {
  return useQuery({
    queryKey: installationKeys.summary(),
    queryFn: () => installationsApi.getInstallationSummary(),
    refetchInterval: 5 * 60 * 1000,
  });
}
