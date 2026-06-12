import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, AttendanceQuery, ScanDto } from '@/lib/api/attendance';

export const attendanceKeys = {
  all: ['attendance'] as const,
  lists: () => [...attendanceKeys.all, 'list'] as const,
  list: (query: AttendanceQuery) => [...attendanceKeys.lists(), query] as const,
};

export function useAttendanceLogs(query: AttendanceQuery = {}) {
  return useQuery({
    queryKey: attendanceKeys.list(query),
    queryFn: () => attendanceApi.getLogs(query),
    refetchInterval: 30 * 1000,
  });
}

export function useScanAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ScanDto) => attendanceApi.scan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
    },
  });
}
