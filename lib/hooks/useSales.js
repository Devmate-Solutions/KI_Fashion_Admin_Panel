import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesAPI } from '../api/endpoints/sales';
import toast from 'react-hot-toast';

// Query Keys
export const salesKeys = {
  all: ['sales'],
  lists: () => [...salesKeys.all, 'list'],
  list: (filters) => [...salesKeys.lists(), filters],
  details: () => [...salesKeys.all, 'detail'],
  detail: (id) => [...salesKeys.details(), id],
};

// Get all sales
export const useSales = (params = {}) => {
  return useQuery({
    queryKey: salesKeys.list(params),
    queryFn: () => salesAPI.getAll(params),
    staleTime: 30 * 1000, // 30 seconds - data won't refetch if younger than this
    gcTime: 5 * 60 * 1000, // 5 minutes - cache garbage collection time
    select: (response) => {
      // Transform backend data to match frontend format
      const sales = response.data || [];
      return sales.data.map(sale => ({
        id: sale._id,
        date: sale.saleDate,
        customerName: sale.buyer?.name || sale.manualCustomer?.name || 'N/A',
        customerId: sale.buyer?._id,
        total: sale.grandTotal || 0,
        cash: sale.cashPayment || sale.paidAmount || 0,
        bankCash: sale.bankPayment || 0,
        discount: sale.totalDiscount || 0,
        balance: (sale.grandTotal || 0) - (sale.cashPayment || sale.paidAmount || 0) - (sale.bankPayment || 0) - (sale.totalDiscount || 0),
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus,
        saleType: sale.saleType,
        deliveryStatus: sale.deliveryStatus,
        // Keep original data for reference
        _original: sale,
      }));
    },
  });
};

// Get single sale
export const useSale = (id) => {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => salesAPI.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    select: (response) => response.data,
  });
};

// Create sale mutation
export const useCreateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: salesAPI.create,
    onSuccess: (response) => {
      // Invalidate and refetch sales list
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      toast.success(response.message || 'Sale created successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create sale';
      toast.error(message);
      console.error('Create sale error:', error);
    },
  });
};

// Update sale mutation
export const useUpdateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => salesAPI.update(id, data),
    onSuccess: (response, variables) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(variables.id) });
      toast.success(response.message || 'Sale updated successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update sale';
      toast.error(message);
      console.error('Update sale error:', error);
    },
  });
};

// Delete sale mutation
export const useDeleteSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: salesAPI.delete,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      toast.success(response.message || 'Sale deleted successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete sale';
      toast.error(message);
      console.error('Delete sale error:', error);
    },
  });
};

// Mark as delivered mutation
export const useMarkDelivered = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => salesAPI.markDelivered(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(variables.id) });
      toast.success('Sale marked as delivered!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to mark as delivered';
      toast.error(message);
    },
  });
};

// Update payment mutation
export const useUpdatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => salesAPI.updatePayment(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(variables.id) });
      toast.success('Payment updated successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update payment';
      toast.error(message);
    },
  });
};