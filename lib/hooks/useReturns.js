import { useQuery, useQueryClient } from '@tanstack/react-query';
import { returnsAPI } from '@/lib/api/endpoints/returns';

export const returnsKeys = {
  all: ['returns'],
  lists: () => [...returnsKeys.all, 'list'],
  list: (filters) => [...returnsKeys.lists(), filters],
  details: () => [...returnsKeys.all, 'detail'],
  detail: (id) => [...returnsKeys.details(), id],
};

// Fetch all returns
export function useReturns(params = {}) {
  return useQuery({
    queryKey: returnsKeys.list(params),
    queryFn: async () => {
      const response = await returnsAPI.getAll(params);
      // Handle different response structures
      if (response?.data?.data) {
        if (response.data.data.returns) {
          return response.data.data.returns;
        }
        if (response.data.data.rows) {
          return response.data.data.rows;
        }
        return Array.isArray(response.data.data) ? response.data.data : [];
      } else if (response?.data?.returns) {
        return Array.isArray(response.data.returns) ? response.data.returns : [];
      } else if (response?.data?.rows) {
        return Array.isArray(response.data.rows) ? response.data.rows : [];
      } else if (Array.isArray(response?.data)) {
        return response.data;
      }
      return [];
    },
  });
}

// Fetch single return
export function useReturn(id) {
  return useQuery({
    queryKey: returnsKeys.detail(id),
    queryFn: async () => {
      const response = await returnsAPI.getById(id);
      return response?.data?.data || response?.data || response;
    },
    enabled: !!id,
  });
}

