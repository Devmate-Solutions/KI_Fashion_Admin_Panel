import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockCountSessionAPI } from '../api/endpoints/stockCountSessions';
import { toast } from 'react-hot-toast';

export const stockCountSessionKeys = {
  all: ['stock-count-sessions'],
  lists: () => [...stockCountSessionKeys.all, 'list'],
  list: (filters) => [...stockCountSessionKeys.lists(), filters],
  details: () => [...stockCountSessionKeys.all, 'detail'],
  detail: (id) => [...stockCountSessionKeys.details(), id],
  active: () => [...stockCountSessionKeys.all, 'active'],
};

export function useStockCountSessions(params = {}, options = {}) {
  return useQuery({
    queryKey: stockCountSessionKeys.list(params),
    queryFn: async () => {
      const response = await stockCountSessionAPI.getAll(params);
      return response.data;
    },
    ...options,
  });
}

export function useActiveStockCountSession(options = {}) {
  return useQuery({
    queryKey: stockCountSessionKeys.active(),
    queryFn: async () => {
      const response = await stockCountSessionAPI.getActive();
      return response.data;
    },
    ...options,
  });
}

export function useStockCountSession(id, options = {}) {
  return useQuery({
    queryKey: stockCountSessionKeys.detail(id),
    queryFn: async () => {
      const response = await stockCountSessionAPI.getById(id);
      return response.data;
    },
    enabled: Boolean(id) && options.enabled !== false,
    ...options,
  });
}

export function useStartStockCountSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => stockCountSessionAPI.start(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockCountSessionKeys.all });
      toast.success('Stock count session started');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to start session';
      toast.error(message);
    },
  });
}

export function useAddStockCountItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => stockCountSessionAPI.addItem(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: stockCountSessionKeys.active() });
      queryClient.invalidateQueries({ queryKey: stockCountSessionKeys.detail(variables.id) });
      toast.success('Item added to count');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to add item';
      toast.error(message);
    },
  });
}

export function useRemoveStockCountItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId }) => stockCountSessionAPI.removeItem(id, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: stockCountSessionKeys.active() });
      queryClient.invalidateQueries({ queryKey: stockCountSessionKeys.detail(variables.id) });
      toast.success('Item removed from count');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to remove item';
      toast.error(message);
    },
  });
}

export function useCompleteStockCountSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => stockCountSessionAPI.complete(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockCountSessionKeys.all });
      toast.success('Session completed');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to complete session';
      toast.error(message);
    },
  });
}

export function useDeleteStockCountSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => stockCountSessionAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockCountSessionKeys.all });
      toast.success('Session deleted');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete session';
      toast.error(message);
    },
  });
}
