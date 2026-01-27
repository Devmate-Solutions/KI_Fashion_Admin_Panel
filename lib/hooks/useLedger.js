import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ledgerAPI } from '../api/endpoints/ledger';

export const ledgerKeys = {
  all: ['ledger'],
  supplier: (id, params) => [...ledgerKeys.all, 'supplier', id, params],
  buyer: (id, params) => [...ledgerKeys.all, 'buyer', id, params],
  logistics: (id, params) => [...ledgerKeys.all, 'logistics', id, params],
};

export function useSupplierLedger(supplierId, params = {}) {
  return useQuery({
    queryKey: ledgerKeys.supplier(supplierId, params),
    queryFn: async () => {
      const response = await ledgerAPI.getSupplierLedger(supplierId, params);
      
      // Axios wraps the response in a data property
      // Backend returns: { success: true, data: { entries, currentBalance }, pagination: {...} }
      // So: response.data = { success: true, data: { entries, currentBalance }, ... }
      // And: response.data.data = { entries, currentBalance }
      const backendResponse = response?.data || response;
      const ledgerData = backendResponse?.data || backendResponse;
      
      // Ensure we return an object with entries array
      return {
        entries: ledgerData?.entries || [],
        currentBalance: ledgerData?.currentBalance || 0,
        pagination: backendResponse?.pagination || null
      };
    },
    enabled: !!supplierId,
  });
}

export function useBuyerLedger(buyerId, params = {}) {
  return useQuery({
    queryKey: ledgerKeys.buyer(buyerId, params),
    queryFn: async () => {
      const response = await ledgerAPI.getBuyerLedger(buyerId, params);
      return response?.data?.data || response?.data || null;
    },
    enabled: !!buyerId,
  });
}

export function useAllSupplierLedgers(params = {}) {
  return useQuery({
    queryKey: [...ledgerKeys.all, 'suppliers', params],
    queryFn: async () => {
      const response = await ledgerAPI.getAllSupplierLedgers(params);
      const backendResponse = response?.data || response;
      const ledgerData = backendResponse?.data || backendResponse;
      
      return {
        entries: ledgerData?.entries || [],
        totalBalance: ledgerData?.totalBalance || 0,
        supplierCount: ledgerData?.supplierCount || 0,
        pagination: backendResponse?.pagination || null
      };
    },
  });
}

export function useAllBuyerLedgers(params = {}) {
  return useQuery({
    queryKey: [...ledgerKeys.all, 'buyers', params],
    queryFn: async () => {
      const response = await ledgerAPI.getAllBuyerLedgers(params);
      const backendResponse = response?.data || response;
      const ledgerData = backendResponse?.data || backendResponse;
      
      return {
        entries: ledgerData?.entries || [],
        totalBalance: ledgerData?.totalBalance || 0,
        buyerCount: ledgerData?.buyerCount || 0,
        pagination: backendResponse?.pagination || null
      };
    },
  });
}

export function useLogisticsLedger(logisticsCompanyId, params = {}) {
  return useQuery({
    queryKey: ledgerKeys.logistics(logisticsCompanyId, params),
    queryFn: async () => {
      const response = await ledgerAPI.getLogisticsLedger(logisticsCompanyId, params);
      
      // Axios wraps the response in a data property
      const backendResponse = response?.data || response;
      const ledgerData = backendResponse?.data || backendResponse;
      
      // Ensure we return an object with entries array
      return {
        entries: ledgerData?.entries || [],
        currentBalance: ledgerData?.balance || ledgerData?.currentBalance || 0,
        pagination: backendResponse?.pagination || null
      };
    },
    enabled: !!logisticsCompanyId,
  });
}

export function useAllLogisticsLedgers(params = {}) {
  return useQuery({
    queryKey: [...ledgerKeys.all, 'logistics', params],
    queryFn: async () => {
      const response = await ledgerAPI.getAllLogisticsLedgers(params);
      const backendResponse = response?.data || response;
      const ledgerData = backendResponse?.data || backendResponse;
      
      return {
        entries: ledgerData?.entries || [],
        totalBalance: ledgerData?.totalBalance || 0,
        logisticsCount: ledgerData?.logisticsCount || 0,
        pagination: backendResponse?.pagination || null
      };
    },
  });
}

// =====================================================
// MUTATION HOOKS - Universal Payment Distribution (SSOT)
// =====================================================

/**
 * Hook for distributing a bulk payment across pending orders for a supplier
 */
export function useDistributeSupplierPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ supplierId, paymentData }) => {
      const response = await ledgerAPI.distributeSupplierPayment(supplierId, paymentData);
      return response?.data || response;
    },
    onSuccess: (data, variables) => {
      // Invalidate supplier ledger queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ledgerKeys.supplier(variables.supplierId) });
      queryClient.invalidateQueries({ queryKey: [...ledgerKeys.all, 'suppliers'] });
    },
  });
}

/**
 * Hook for creating a debit adjustment for a supplier
 */
export function useCreateSupplierDebitAdjustment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ supplierId, adjustmentData }) => {
      const response = await ledgerAPI.createSupplierDebitAdjustment(supplierId, adjustmentData);
      return response?.data || response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.supplier(variables.supplierId) });
      queryClient.invalidateQueries({ queryKey: [...ledgerKeys.all, 'suppliers'] });
    },
  });
}

/**
 * Hook for distributing a bulk payment across pending charges for a logistics company
 */
export function useDistributeLogisticsPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ logisticsCompanyId, paymentData }) => {
      const response = await ledgerAPI.distributeLogisticsPayment(logisticsCompanyId, paymentData);
      return response?.data || response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.logistics(variables.logisticsCompanyId) });
      queryClient.invalidateQueries({ queryKey: [...ledgerKeys.all, 'logistics'] });
    },
  });
}

/**
 * Hook for creating a debit adjustment for a logistics company
 */
export function useCreateLogisticsDebitAdjustment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ logisticsCompanyId, adjustmentData }) => {
      const response = await ledgerAPI.createLogisticsDebitAdjustment(logisticsCompanyId, adjustmentData);
      return response?.data || response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.logistics(variables.logisticsCompanyId) });
      queryClient.invalidateQueries({ queryKey: [...ledgerKeys.all, 'logistics'] });
    },
  });
}

// =====================================================
// BUYER PAYMENT MUTATION HOOKS
// =====================================================

/**
 * Hook for distributing a bulk payment across pending sales for a buyer (FIFO)
 */
export function useDistributeBuyerPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ buyerId, paymentData }) => {
      const response = await ledgerAPI.distributeBuyerPayment(buyerId, paymentData);
      return response?.data || response;
    },
    onSuccess: (data, variables) => {
      // Invalidate buyer ledger queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ledgerKeys.buyer(variables.buyerId) });
      queryClient.invalidateQueries({ queryKey: [...ledgerKeys.all, 'buyers'] });
      // Also invalidate sales queries since Sale models are updated
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

/**
 * Hook for creating a debit adjustment for a buyer
 */
export function useCreateBuyerDebitAdjustment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ buyerId, adjustmentData }) => {
      const response = await ledgerAPI.createBuyerDebitAdjustment(buyerId, adjustmentData);
      return response?.data || response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.buyer(variables.buyerId) });
      queryClient.invalidateQueries({ queryKey: [...ledgerKeys.all, 'buyers'] });
    },
  });
}

