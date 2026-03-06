import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '../api/endpoints/reports';

export const reportsKeys = {
  all: ['reports'],
  sales: (filters) => [...reportsKeys.all, 'sales', filters],
  purchases: (filters) => [...reportsKeys.all, 'purchases', filters],
  financial: (filters) => [...reportsKeys.all, 'financial', filters],
  inventory: (filters) => [...reportsKeys.all, 'inventory', filters],
  suppliers: (filters) => [...reportsKeys.all, 'suppliers', filters],
  customers: (filters) => [...reportsKeys.all, 'customers', filters],
  dashboard: (filters) => [...reportsKeys.all, 'dashboard', filters],
  // New report keys
  profitLoss: (filters) => [...reportsKeys.all, 'profit-loss', filters],
  dailySales: (filters) => [...reportsKeys.all, 'daily-sales', filters],
  dailyBuying: (filters) => [...reportsKeys.all, 'daily-buying', filters],
  salesProductWise: (filters) => [...reportsKeys.all, 'sales-product-wise', filters],
  buyingProductWise: (filters) => [...reportsKeys.all, 'buying-product-wise', filters],
  stockInHand: (filters) => [...reportsKeys.all, 'stock-in-hand', filters],
  receivables: (filters) => [...reportsKeys.all, 'receivables', filters],
  payables: (filters) => [...reportsKeys.all, 'payables', filters],
  activityLog: (filters) => [...reportsKeys.all, 'activity-log', filters],
  salesReturns: (filters) => [...reportsKeys.all, 'sales-returns', filters],
  buyingReturns: (filters) => [...reportsKeys.all, 'buying-returns', filters],
  cashInHand: (filters) => [...reportsKeys.all, 'cash-in-hand', filters],
  salesReturnsProductWise: (filters) => [...reportsKeys.all, 'sales-returns-product-wise', filters],
  buyingReturnsProductWise: (filters) => [...reportsKeys.all, 'buying-returns-product-wise', filters],
  productSummary: (filters) => [...reportsKeys.all, 'product-summary', filters],
  productHistory: (filters) => [...reportsKeys.all, 'product-history', filters],
};

export const useSalesReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.sales(params),
    queryFn: () => {
       
      return reportsAPI.getSalesReport(params);
    },
    select: (response) => {
       
      return response.data?.data || response.data || {};
    },
  });
};

export const usePurchasesReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.purchases(params),
    queryFn: () => {
       
      return reportsAPI.getPurchasesReport(params);
    },
    select: (response) => {
       
      return response.data?.data || response.data || {};
    },
  });
};

export const useFinancialReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.financial(params),
    queryFn: () => {
       
      return reportsAPI.getFinancialReport(params);
    },
    select: (response) => {
       
      return response.data?.data || response.data || {};
    },
  });
};

export const useInventoryReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.inventory(params),
    queryFn: () => {
       
      return reportsAPI.getInventoryReport(params);
    },
    select: (response) => {
       
      return response.data?.data || response.data || {};
    },
  });
};

export const useSuppliersReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.suppliers(params),
    queryFn: () => {
       
      return reportsAPI.getSuppliersReport(params);
    },
    select: (response) => {
       
      return response.data?.data || response.data || {};
    },
  });
};

export const useCustomersReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.customers(params),
    queryFn: () => {
       
      return reportsAPI.getCustomersReport(params);
    },
    select: (response) => {
       
      return response.data?.data || response.data || {};
    },
  });
};

export const useDashboardSummary = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.dashboard(params),
    queryFn: () => {
       
      return reportsAPI.getDashboardSummary(params);
    },
    select: (response) => {
       
      return response.data?.data || response.data || {};
    },
  });
};

// NEW REPORT HOOKS

export const useProfitLossReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.profitLoss(params),
    queryFn: () => reportsAPI.getProfitLossReport(params),
    select: (response) => response.data?.data || response.data || {},
    enabled: !!(params.startDate && params.endDate),
  });
};

export const useDailySalesReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.dailySales(params),
    queryFn: () => reportsAPI.getDailySalesReport(params),
    select: (response) => response.data?.data || response.data || {},
    enabled: !!(params.startDate && params.endDate),
  });
};

export const useDailyBuyingReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.dailyBuying(params),
    queryFn: () => reportsAPI.getDailyBuyingReport(params),
    select: (response) => response.data?.data || response.data || {},
    enabled: !!(params.startDate && params.endDate),
  });
};

export const useSalesProductWiseReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.salesProductWise(params),
    queryFn: () => reportsAPI.getSalesProductWiseReport(params),
    select: (response) => response.data?.data || response.data || {},
    enabled: !!(params.startDate && params.endDate),
  });
};

export const useBuyingProductWiseReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.buyingProductWise(params),
    queryFn: () => reportsAPI.getBuyingProductWiseReport(params),
    select: (response) => response.data?.data || response.data || {},
    enabled: !!(params.startDate && params.endDate),
  });
};

export const useStockInHandReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.stockInHand(params),
    queryFn: () => reportsAPI.getStockInHandReport(params),
    select: (response) => response.data?.data || response.data || {},
  });
};

export const useReceivablesReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.receivables(params),
    queryFn: () => reportsAPI.getReceivablesReport(params),
    select: (response) => response.data?.data || response.data || {},
  });
};

export const usePayablesReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.payables(params),
    queryFn: () => reportsAPI.getPayablesReport(params),
    select: (response) => response.data?.data || response.data || {},
  });
};

export const useActivityLogReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.activityLog(params),
    queryFn: () => reportsAPI.getActivityLogReport(params),
    select: (response) => response.data?.data || response.data || {},
    enabled: !!(params.startDate && params.endDate),
  });
};

export const useSalesReturnsReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.salesReturns(params),
    queryFn: () => reportsAPI.getSalesReturnsReport(params),
    select: (response) => response.data?.data || response.data || {},
    enabled: !!(params.startDate && params.endDate),
  });
};

export const useBuyingReturnsReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.buyingReturns(params),
    queryFn: () => reportsAPI.getBuyingReturnsReport(params),
    select: (response) => response.data?.data || response.data || {},
    enabled: !!(params.startDate && params.endDate),
  });
};

export const useCashInHandReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.cashInHand(params),
    queryFn: () => reportsAPI.getCashInHandReport(params),
    select: (response) => response.data?.data || response.data || {},
    enabled: !!(params.startDate && params.endDate),
  });
};

export const useSalesReturnsProductWiseReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.salesReturnsProductWise(params),
    queryFn: () => reportsAPI.getSalesReturnsProductWiseReport(params),
    select: (response) => response.data?.data || response.data || {},
    enabled: !!(params.startDate && params.endDate),
  });
};

export const useBuyingReturnsProductWiseReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.buyingReturnsProductWise(params),
    queryFn: () => reportsAPI.getBuyingReturnsProductWiseReport(params),
    select: (response) => response.data?.data || response.data || {},
    enabled: !!(params.startDate && params.endDate),
  });
};

export const useProductSummaryReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.productSummary(params),
    queryFn: () => reportsAPI.getProductSummaryReport(params),
    select: (response) => response.data?.data || response.data || {},
  });
};

export const useProductHistoryReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.productHistory(params),
    queryFn: () => reportsAPI.getProductHistoryReport(params),
    select: (response) => response.data?.data || response.data || {},
    enabled: !!params.productId,
  });
};
