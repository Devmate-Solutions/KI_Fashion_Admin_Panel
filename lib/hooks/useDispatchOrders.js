import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dispatchOrdersAPI } from '@/lib/api/endpoints/dispatchOrders';
import { inventoryKeys } from './useInventory';
import { toast } from 'sonner';

export const dispatchOrdersKeys = {
  all: ['dispatchOrders'],
  lists: () => [...dispatchOrdersKeys.all, 'list'],
  list: (filters) => [...dispatchOrdersKeys.lists(), filters],
  details: () => [...dispatchOrdersKeys.all, 'detail'],
  detail: (id) => [...dispatchOrdersKeys.details(), id],
};

// Fetch all dispatch orders
export function useDispatchOrders(params = {}) {
  return useQuery({
    queryKey: dispatchOrdersKeys.list(params),
    staleTime: 30 * 1000, // 30 seconds - data won't refetch if younger than this
    gcTime: 5 * 60 * 1000, // 5 minutes - cache garbage collection time
    queryFn: async () => {
      const response = await dispatchOrdersAPI.getAll(params);
      // Handle different response structures
      if (response?.data?.data) {
        return Array.isArray(response.data.data) ? response.data.data : response.data.data.rows || [];
      } else if (response?.data?.rows) {
        return Array.isArray(response.data.rows) ? response.data.rows : [];
      } else if (Array.isArray(response?.data)) {
        return response.data;
      }
      return [];
    },
  });
}

// Fetch single dispatch order
export function useDispatchOrder(id) {
  return useQuery({
    queryKey: dispatchOrdersKeys.detail(id),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      const response = await dispatchOrdersAPI.getById(id);
      return response?.data?.data || response?.data || response;
    },
    enabled: !!id,
  });
}

// Submit dispatch order for approval mutation
export function useSubmitApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (approvalData) => {
      console.log('useSubmitApproval mutation called with:', approvalData);
      const { id, paymentData, ...otherFields } = approvalData;
      // Merge paymentData with other fields for the API call
      const requestData = {
        ...paymentData,
        ...otherFields
      };
      console.log('Sending to API:', { id, requestData });
      const response = await dispatchOrdersAPI.submitApproval(id, requestData);
      console.log('API response:', response);
      return response?.data?.data || response?.data || response;
    },
    onSuccess: (data, variables) => {
      // Invalidate dispatch orders list
      queryClient.invalidateQueries({ queryKey: dispatchOrdersKeys.lists() });
      // Invalidate specific dispatch order
      queryClient.invalidateQueries({ queryKey: dispatchOrdersKeys.detail(variables.id) });
      toast.success('Order submitted for approval successfully');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit order for approval';
      toast.error(errorMessage);
      console.error('Submit approval error:', error);
    },
  });
}

// Confirm dispatch order mutation
export function useConfirmDispatchOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (confirmData) => {
      console.log('useConfirmDispatchOrder mutation called with:', confirmData);
      const { id, paymentData, ...otherFields } = confirmData;
      // Merge paymentData with other fields for the API call
      const requestData = {
        ...paymentData,
        ...otherFields
      };
      console.log('Sending to API:', { id, requestData });
      const response = await dispatchOrdersAPI.confirm(id, requestData);
      console.log('API response:', response);
      return response?.data?.data || response?.data || response;
    },
    onSuccess: (data, variables) => {
      // Invalidate dispatch orders list
      queryClient.invalidateQueries({ queryKey: dispatchOrdersKeys.lists() });
      // Invalidate specific dispatch order
      queryClient.invalidateQueries({ queryKey: dispatchOrdersKeys.detail(variables.id) });
      // Invalidate purchases list (since confirmed dispatch orders appear there)
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      // Invalidate inventory list to refresh stock page
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      toast.success('Dispatch order confirmed successfully');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to confirm dispatch order';
      toast.error(errorMessage);
      console.error('Confirm dispatch order error:', error);
    },
  });
}

// Return items mutation
export function useReturnDispatchItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, returnedItems, notes }) => {
      const response = await dispatchOrdersAPI.returnItems(id, { returnedItems, notes });
      return response?.data?.data || response?.data || response;
    },
    onSuccess: (data, variables) => {
      // Invalidate dispatch orders list
      queryClient.invalidateQueries({ queryKey: dispatchOrdersKeys.lists() });
      // Invalidate specific dispatch order
      queryClient.invalidateQueries({ queryKey: dispatchOrdersKeys.detail(variables.id) });
      // Invalidate purchases list
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      // Invalidate returns list
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Items returned successfully');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to return items';
      toast.error(errorMessage);
    },
  });
}

// Delete dispatch order mutation
export function useDeleteDispatchOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await dispatchOrdersAPI.delete(id);
      return response?.data?.data || response?.data || response;
    },
    onSuccess: (data, id) => {
      // Invalidate dispatch orders list
      queryClient.invalidateQueries({ queryKey: dispatchOrdersKeys.lists() });
      // Invalidate purchases list
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Dispatch order deleted successfully');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete dispatch order';
      toast.error(errorMessage);
      console.error('Delete dispatch order error:', error);
    },
  });
}

// Revert dispatch order to pending status mutation
export function useRevertToPending() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await dispatchOrdersAPI.revertToPending(id);
      return response?.data?.data || response?.data || response;
    },
    onSuccess: (data, id) => {
      // Invalidate dispatch orders list
      queryClient.invalidateQueries({ queryKey: dispatchOrdersKeys.lists() });
      // Invalidate specific dispatch order
      queryClient.invalidateQueries({ queryKey: dispatchOrdersKeys.detail(id) });
      // Invalidate purchases list
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Dispatch order reverted to pending status successfully');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to revert dispatch order';
      toast.error(errorMessage);
      console.error('Revert dispatch order error:', error);
    },
  });
}

