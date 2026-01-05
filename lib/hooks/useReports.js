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
};

export const useSalesReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.sales(params),
    queryFn: () => {
      console.log('useSalesReport: Fetching sales report with params:', params);
      return reportsAPI.getSalesReport(params);
    },
    select: (response) => {
      console.log('useSalesReport: Raw API response:', response);
      return response.data?.data || response.data || {};
    },
  });
};

export const usePurchasesReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.purchases(params),
    queryFn: () => {
      console.log('usePurchasesReport: Fetching purchases report with params:', params);
      return reportsAPI.getPurchasesReport(params);
    },
    select: (response) => {
      console.log('usePurchasesReport: Raw API response:', response);
      return response.data?.data || response.data || {};
    },
  });
};

export const useFinancialReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.financial(params),
    queryFn: () => {
      console.log('useFinancialReport: Fetching financial report with params:', params);
      return reportsAPI.getFinancialReport(params);
    },
    select: (response) => {
      console.log('useFinancialReport: Raw API response:', response);
      return response.data?.data || response.data || {};
    },
  });
};

export const useInventoryReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.inventory(params),
    queryFn: () => {
      console.log('useInventoryReport: Fetching inventory report with params:', params);
      return reportsAPI.getInventoryReport(params);
    },
    select: (response) => {
      console.log('useInventoryReport: Raw API response:', response);
      return response.data?.data || response.data || {};
    },
  });
};

export const useSuppliersReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.suppliers(params),
    queryFn: () => {
      console.log('useSuppliersReport: Fetching suppliers report with params:', params);
      return reportsAPI.getSuppliersReport(params);
    },
    select: (response) => {
      console.log('useSuppliersReport: Raw API response:', response);
      return response.data?.data || response.data || {};
    },
  });
};

export const useCustomersReport = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.customers(params),
    queryFn: () => {
      console.log('useCustomersReport: Fetching customers report with params:', params);
      return reportsAPI.getCustomersReport(params);
    },
    select: (response) => {
      console.log('useCustomersReport: Raw API response:', response);
      return response.data?.data || response.data || {};
    },
  });
};

export const useDashboardSummary = (params = {}) => {
  return useQuery({
    queryKey: reportsKeys.dashboard(params),
    queryFn: () => {
      console.log('useDashboardSummary: Fetching dashboard summary with params:', params);
      return reportsAPI.getDashboardSummary(params);
    },
    select: (response) => {
      console.log('useDashboardSummary: Raw API response:', response);
      return response.data?.data || response.data || {};
    },
  });
};
