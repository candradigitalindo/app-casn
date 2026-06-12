import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, CreateUserDto } from '@/lib/api/users';
import type { User } from '@/types/models';
import { handleQueryError } from '@/lib/api-client';

const userKeys = {
  all: ['users'] as const,
  list: (params?: object) => [...userKeys.all, params] as const,
};

export function useUsers(params?: { role?: string; search?: string }) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersApi.getAll(params),
    staleTime: 30 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserDto) => usersApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
    onError: handleQueryError,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<CreateUserDto, 'password'>> & { password?: string } }) =>
      usersApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
    onError: handleQueryError,
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
    onError: handleQueryError,
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
    onError: handleQueryError,
  });
}

export function useUserRoleSummary() {
  const { data } = useUsers();
  const users: User[] = data?.data ?? [];
  const summary: Record<string, number> = {};
  users.forEach((u) => { summary[u.role] = (summary[u.role] ?? 0) + 1; });
  return summary;
}
