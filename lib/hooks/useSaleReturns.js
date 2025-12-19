import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saleReturnsAPI } from '../api/endpoints/saleReturns';

export const saleReturnsKeys = {
  all: ['sale-returns'],
  lists: () => [...saleReturnsKeys.all, 'list'],
  list: (params) => [...saleReturnsKeys.lists(), params],
  details: () => [...saleReturnsKeys.all, 'detail'],
  detail: (id) => [...saleReturnsKeys.details(), id],
};

// Fetch all sale returns
export function useSaleReturns(params = {}) {
  return useQuery({
    queryKey: saleReturnsKeys.list(params),
    queryFn: async () => {
      const response = await saleReturnsAPI.getAll(params);
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

// Fetch single sale return
export function useSaleReturn(id) {
  return useQuery({
    queryKey: saleReturnsKeys.detail(id),
    queryFn: async () => {
      const response = await saleReturnsAPI.getById(id);
      return response?.data?.data || response?.data;
    },
    enabled: !!id,
  });
}

// Approve sale return
export function useApproveSaleReturn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await saleReturnsAPI.approve(id);
      return response?.data?.data || response?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleReturnsKeys.all });
    },
  });
}

// Reject sale return
export function useRejectSaleReturn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, rejectionNotes }) => {
      const response = await saleReturnsAPI.reject(id, rejectionNotes);
      return response?.data?.data || response?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleReturnsKeys.all });
    },
  });
}

// Create sale return
export function useCreateSaleReturn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await saleReturnsAPI.create(data);
      return response?.data?.data || response?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleReturnsKeys.all });
    },
  });
}

