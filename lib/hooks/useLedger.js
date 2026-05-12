import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ledgerAPI } from '../api/endpoints/ledger';

export const ledgerKeys = {
  all: ['ledger'],
  supplier: (id, params) => [...ledgerKeys.all, 'supplier', id, params],
  buyer: (id, params) => [...ledgerKeys.all, 'buyer', id, params],
  logistics: (id, params) => [...ledgerKeys.all, 'logistics', id, params],
};

export function useSupplierLedger(supplierId, params = {}, options = {}) {
  return useQuery({
    queryKey: ledgerKeys.supplier(supplierId, params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 60 seconds polling
    ...options,
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
    enabled: options.enabled !== undefined ? options.enabled : !!supplierId,
  });
}

export function useBuyerLedger(buyerId, params = {}, options = {}) {
  return useQuery({
    queryKey: ledgerKeys.buyer(buyerId, params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 60 seconds
    ...options,
    enabled: options.enabled !== undefined ? options.enabled : !!buyerId,
    queryFn: async () => {
      const response = await ledgerAPI.getBuyerLedger(buyerId, params);
      const backendResponse = response?.data || response;
      const ledgerData = backendResponse?.data || backendResponse;
      
      return {
        entries: ledgerData?.entries || [],
        currentBalance: ledgerData?.currentBalance || 0,
        pagination: backendResponse?.pagination || null
      };
    },
  });
}

export function useAllSupplierLedgers(params = {}, options = {}) {
  return useQuery({
    queryKey: [...ledgerKeys.all, 'suppliers', params],
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 60 seconds
    ...options,
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

export function useAllBuyerLedgers(params = {}, options = {}) {
  return useQuery({
    queryKey: [...ledgerKeys.all, 'buyers', params],
    ...options,
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

export function useLogisticsLedger(logisticsCompanyId, params = {}, options = {}) {
  return useQuery({
    queryKey: ledgerKeys.logistics(logisticsCompanyId, params),
    ...options,
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
    enabled: options.enabled !== undefined ? options.enabled : !!logisticsCompanyId,
  });
}

export function useAllLogisticsLedgers(params = {}, options = {}) {
  return useQuery({
    queryKey: [...ledgerKeys.all, 'logistics', params],
    ...options,
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

export const logisticsReceiptKeys = {
  all: ['logistics-receipts'],
  company: (companyId, params) => [...logisticsReceiptKeys.all, 'company', companyId, params],
  detail: (receiptId) => [...logisticsReceiptKeys.all, 'detail', receiptId],
};

export function useLogisticsPaymentReceipts(companyId, params = {}, options = {}) {
  return useQuery({
    queryKey: logisticsReceiptKeys.company(companyId, params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 60 seconds polling
    ...options,
    queryFn: async () => {
      const response = await ledgerAPI.getLogisticsPaymentReceipts(companyId, params);
      const backendResponse = response?.data || response;
      const receiptsData = backendResponse?.data || backendResponse;
      
      return {
        receipts: receiptsData?.receipts || [],
        pagination: receiptsData?.pagination || backendResponse?.pagination || null
      };
    },
    enabled: options.enabled !== undefined ? options.enabled : !!companyId,
  });
}

export function useLogisticsPaymentReceiptDetails(receiptId, options = {}) {
  return useQuery({
    queryKey: logisticsReceiptKeys.detail(receiptId),
    staleTime: 30 * 1000,
    ...options,
    queryFn: async () => {
      const response = await ledgerAPI.getLogisticsPaymentReceiptDetails(receiptId);
      const backendResponse = response?.data || response;
      const receiptData = backendResponse?.data || backendResponse;
      
      return receiptData?.receipt || receiptData;
    },
    enabled: options.enabled !== undefined ? options.enabled : !!receiptId,
  });
}
