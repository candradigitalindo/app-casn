import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { installationsApi, UpdateProgressDto } from '@/lib/api/installations';
import { stageKeys } from './useStages';
import { locationKeys } from './useLocations';

export const installationKeys = {
  all: ['installations'] as const,
  all_progress: () => [...installationKeys.all, 'progress'] as const,
  progress: (locationId: string) => [...installationKeys.all, 'progress', locationId] as const,
  summary: () => [...installationKeys.all, 'summary'] as const,
  alerts: () => [...installationKeys.all, 'alerts'] as const,
};

export function useAllInstallationProgress() {
  return useQuery({
    queryKey: installationKeys.all_progress(),
    queryFn: () => installationsApi.getAllProgress(),
    refetchInterval: 60 * 1000,
  });
}

export function useInstallationProgress(locationId: string) {
  return useQuery({
    queryKey: installationKeys.progress(locationId),
    queryFn: () => installationsApi.getLocationProgress(locationId),
    enabled: !!locationId,
  });
}

export function useInstallationSummary() {
  return useQuery({
    queryKey: installationKeys.summary(),
    queryFn: () => installationsApi.getInstallationSummary(),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useDelayAlerts() {
  return useQuery({
    queryKey: installationKeys.alerts(),
    queryFn: () => installationsApi.getDelayAlerts(),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useUpdateInstallationProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProgressDto) => installationsApi.updateProgress(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: installationKeys.progress(variables.locationId) });
      queryClient.invalidateQueries({ queryKey: installationKeys.all_progress() });
      queryClient.invalidateQueries({ queryKey: installationKeys.summary() });
      queryClient.invalidateQueries({ queryKey: installationKeys.alerts() });
      // Milestone instalasi men-sinkronkan fase INSTALASI tahapan dan
      // status lokasi di backend — refresh keduanya juga.
      queryClient.invalidateQueries({ queryKey: stageKeys.all });
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
  });
}
