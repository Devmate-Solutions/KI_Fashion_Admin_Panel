import { useQuery } from '@tanstack/react-query';
import { auditLogsAPI } from '@/lib/api/endpoints/auditLogs';

export const auditLogKeys = {
  all: ['auditLogs'],
  lists: () => [...auditLogKeys.all, 'list'],
  list: (filters) => [...auditLogKeys.lists(), filters],
  details: () => [...auditLogKeys.all, 'detail'],
  detail: (id) => [...auditLogKeys.details(), id],
};

/**
 * Hook for fetching paginated audit logs
 */
export function useAuditLogs(params = {}) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await auditLogsAPI.list(params);
      const raw = response?.data || {};
      
      return {
        logs: raw.data || [],
        pagination: raw.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 20
        },
      };
    },
  });
}

/**
 * Hook for fetching a single audit log detail
 */
export function useAuditLog(id) {
  return useQuery({
    queryKey: auditLogKeys.detail(id),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const response = await auditLogsAPI.getById(id);
      return response?.data?.data || null;
    },
    enabled: !!id,
  });
}
