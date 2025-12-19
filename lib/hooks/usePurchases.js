import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesAPI } from '../api/endpoints/purchases';
import toast from 'react-hot-toast';

// Query Keys
export const purchasesKeys = {
  all: ['purchases'],
  lists: () => [...purchasesKeys.all, 'list'],
  list: (filters) => [...purchasesKeys.lists(), filters],
  details: () => [...purchasesKeys.all, 'detail'],
  detail: (id) => [...purchasesKeys.details(), id],
};

// Get all purchases
export const usePurchases = (params = {}) => {
  return useQuery({
    queryKey: purchasesKeys.list(params),
    queryFn: () => purchasesAPI.getAll(params),
    select: (response) => {
      // Data is pre-formatted by backend now
      return {
        rows: response.data?.data || [],
        metrics: response.data?.metrics || {},
        pagination: response.data?.pagination || {}
      };
    },
  });
};

// Get single purchase
export const usePurchase = (id) => {
  return useQuery({
    queryKey: purchasesKeys.detail(id),
    queryFn: () => purchasesAPI.getById(id),
    enabled: !!id,
    select: (response) => response.data,
  });
};

// Create purchase mutation
export const useCreatePurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchasesAPI.create,
    onSuccess: (response) => {
      // Invalidate and refetch purchases list
      queryClient.invalidateQueries({ queryKey: purchasesKeys.lists() });
      toast.success(response.message || 'Purchase created successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create purchase';
      toast.error(message);
      console.error('Create purchase error:', error);
    },
  });
};

// Update purchase mutation
export const useUpdatePurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => purchasesAPI.update(id, data),
    onSuccess: (response, variables) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: purchasesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchasesKeys.detail(variables.id) });
      toast.success(response.message || 'Purchase updated successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update purchase';
      toast.error(message);
      console.error('Update purchase error:', error);
    },
  });
};

// Delete purchase mutation
export const useDeletePurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchasesAPI.delete,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: purchasesKeys.lists() });
      toast.success(response.message || 'Purchase deleted successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete purchase';
      toast.error(message);
      console.error('Delete purchase error:', error);
    },
  });
};

// Mark as delivered mutation
export const useMarkDelivered = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => purchasesAPI.markDelivered(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: purchasesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchasesKeys.detail(variables.id) });
      toast.success('Purchase marked as delivered!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to mark as delivered';
      toast.error(message);
    },
  });
};

// Update payment status mutation
export const useUpdatePaymentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => purchasesAPI.updatePaymentStatus(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: purchasesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchasesKeys.detail(variables.id) });
      toast.success('Payment status updated successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update payment status';
      toast.error(message);
    },
  });
};
