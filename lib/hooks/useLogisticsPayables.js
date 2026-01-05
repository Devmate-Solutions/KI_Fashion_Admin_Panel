import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logisticsPayablesAPI } from '@/lib/api/endpoints/logisticsPayables';
import { toast } from 'sonner';

/**
 * Query keys for logistics payables
 */
export const logisticsPayablesKeys = {
  all: ['logistics-payables'],
  lists: () => [...logisticsPayablesKeys.all, 'list'],
  list: (filters) => [...logisticsPayablesKeys.lists(), filters],
  details: () => [...logisticsPayablesKeys.all, 'detail'],
  detail: (companyId) => [...logisticsPayablesKeys.details(), companyId],
  orders: (companyId, filters) => [...logisticsPayablesKeys.all, 'orders', companyId, filters],
  payments: (companyId, filters) => [...logisticsPayablesKeys.all, 'payments', companyId, filters],
  summary: () => [...logisticsPayablesKeys.all, 'summary'],
};

/**
 * Fetch all logistics payables with optional filters
 * @param {Object} params - Filter parameters
 * @returns {QueryResult} React Query result
 */
export function useLogisticsPayables(params = {}) {
  return useQuery({
    queryKey: logisticsPayablesKeys.list(params),
    queryFn: async () => {
      const response = await logisticsPayablesAPI.getAll(params);
      
      // Handle different response structures
      let payables = [];
      if (response?.data?.data) {
        payables = Array.isArray(response.data.data) ? response.data.data : response.data.data.payables || [];
      } else if (response?.data?.payables) {
        payables = Array.isArray(response.data.payables) ? response.data.payables : [];
      } else if (Array.isArray(response?.data)) {
        payables = response.data;
      }
      
      return payables;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

/**
 * Fetch detailed payable information for a specific logistics company
 * @param {string} companyId - Logistics company ID
 * @param {Object} params - Filter parameters
 * @returns {QueryResult} React Query result
 */
export function useLogisticsPayableDetail(companyId, params = {}) {
  return useQuery({
    queryKey: logisticsPayablesKeys.detail(companyId),
    queryFn: async () => {
      const response = await logisticsPayablesAPI.getByCompanyId(companyId, params);
      return response?.data?.data || response?.data || null;
    },
    enabled: !!companyId && companyId !== 'all',
    staleTime: 1000 * 60 * 2, // 2 minutes (shorter for more frequent updates)
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

/**
 * Fetch orders for a specific logistics company
 * @param {string} companyId - Logistics company ID
 * @param {Object} params - Filter parameters
 * @returns {QueryResult} React Query result
 */
export function useLogisticsCompanyOrders(companyId, params = {}) {
  return useQuery({
    queryKey: logisticsPayablesKeys.orders(companyId, params),
    queryFn: async () => {
      console.log('useLogisticsCompanyOrders: Fetching orders for company:', companyId, 'with params:', params);
      const response = await logisticsPayablesAPI.getOrdersByCompany(companyId, params);
      console.log('useLogisticsCompanyOrders: Full API response:', response);
      
      // Handle different response structures
      let orders = [];
      if (response?.data?.data?.orders) {
        orders = Array.isArray(response.data.data.orders) ? response.data.data.orders : [];
      } else if (response?.data?.orders) {
        orders = Array.isArray(response.data.orders) ? response.data.orders : [];
      } else if (Array.isArray(response?.data?.data)) {
        orders = response.data.data;
      } else if (Array.isArray(response?.data)) {
        orders = response.data;
      }
      
      console.log('useLogisticsCompanyOrders: Parsed orders count:', orders.length);
      console.log('useLogisticsCompanyOrders: Orders data:', orders);
      return orders;
    },
    enabled: !!companyId && companyId !== 'all',
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch payment history for a logistics company
 * @param {string} companyId - Logistics company ID
 * @param {Object} params - Filter parameters
 * @returns {QueryResult} React Query result
 */
export function useLogisticsPaymentHistory(companyId, params = {}) {
  return useQuery({
    queryKey: logisticsPayablesKeys.payments(companyId, params),
    queryFn: async () => {
      const response = await logisticsPayablesAPI.getPaymentHistory(companyId, params);
      
      // Handle different response structures
      let payments = [];
      if (response?.data?.data?.payments) {
        payments = Array.isArray(response.data.data.payments) ? response.data.data.payments : [];
      } else if (response?.data?.payments) {
        payments = Array.isArray(response.data.payments) ? response.data.payments : [];
      } else if (Array.isArray(response?.data?.data)) {
        payments = response.data.data;
      } else if (Array.isArray(response?.data)) {
        payments = response.data;
      }
      
      return payments;
    },
    enabled: !!companyId && companyId !== 'all',
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch summary statistics for logistics payables
 * @returns {QueryResult} React Query result
 */
export function useLogisticsPayablesSummary() {
  return useQuery({
    queryKey: logisticsPayablesKeys.summary(),
    queryFn: async () => {
      const response = await logisticsPayablesAPI.getSummary();
      
      const defaultSummary = {
        totalCompanies: 0,
        totalBoxes: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalOutstanding: 0,
      };
      
      return response?.data?.data || response?.data?.summary || response?.data || defaultSummary;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes (shorter for more frequent updates)
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

/**
 * Create a payment for a logistics company
 * @returns {MutationResult} React Query mutation result
 */
export function useCreateLogisticsPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData) => {
      const response = await logisticsPayablesAPI.createPayment(paymentData);
      return response?.data?.data || response?.data || response;
    },
    onSuccess: async (data, variables) => {
      // Refetch all relevant queries to immediately update UI
      await Promise.all([
        queryClient.refetchQueries({ queryKey: logisticsPayablesKeys.lists() }),
        queryClient.refetchQueries({ queryKey: logisticsPayablesKeys.detail(variables.logisticsCompanyId) }),
        queryClient.refetchQueries({ queryKey: logisticsPayablesKeys.orders(variables.logisticsCompanyId) }),
        queryClient.refetchQueries({ queryKey: logisticsPayablesKeys.payments(variables.logisticsCompanyId) }),
        queryClient.refetchQueries({ queryKey: logisticsPayablesKeys.summary() }),
        queryClient.refetchQueries({ queryKey: ['logisticsCompanies'] })
      ]);
      
      toast.success('Payment recorded successfully');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to record payment';
      toast.error(errorMessage);
      console.error('Error creating logistics payment:', error);
    },
  });
}

/**
 * Update box rate for a logistics company
 * @returns {MutationResult} React Query mutation result
 */
export function useUpdateBoxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, boxRate }) => {
      const response = await logisticsPayablesAPI.updateBoxRate(companyId, boxRate);
      return response?.data?.data || response?.data || response;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: logisticsPayablesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: logisticsPayablesKeys.detail(variables.companyId) });
      queryClient.invalidateQueries({ queryKey: ['logisticsCompanies'] });
      
      toast.success('Box rate updated successfully');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update box rate';
      toast.error(errorMessage);
      console.error('Error updating box rate:', error);
    },
  });
}

