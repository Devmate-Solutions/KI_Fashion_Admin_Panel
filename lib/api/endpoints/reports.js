import apiClient from '@/lib/api/client';

export const reportsAPI = {
  // Get sales reports
  getSalesReport: async (params) => {
    console.log('reportsAPI.getSalesReport called with params:', params);
    const result = await apiClient.get('/reports/sales', { params });
    console.log('reportsAPI.getSalesReport response:', result);
    return result;
  },

  // Get purchase reports
  getPurchasesReport: async (params) => {
    console.log('reportsAPI.getPurchasesReport called with params:', params);
    const result = await apiClient.get('/reports/purchases', { params });
    console.log('reportsAPI.getPurchasesReport response:', result);
    return result;
  },

  // Get financial reports
  getFinancialReport: async (params) => {
    console.log('reportsAPI.getFinancialReport called with params:', params);
    const result = await apiClient.get('/reports/financial', { params });
    console.log('reportsAPI.getFinancialReport response:', result);
    return result;
  },

  // Get inventory reports
  getInventoryReport: async (params) => {
    console.log('reportsAPI.getInventoryReport called with params:', params);
    const result = await apiClient.get('/reports/inventory', { params });
    console.log('reportsAPI.getInventoryReport response:', result);
    return result;
  },

  // Get supplier performance reports
  getSuppliersReport: async (params) => {
    console.log('reportsAPI.getSuppliersReport called with params:', params);
    const result = await apiClient.get('/reports/suppliers', { params });
    console.log('reportsAPI.getSuppliersReport response:', result);
    return result;
  },

  // Get customer analysis reports
  getCustomersReport: async (params) => {
    console.log('reportsAPI.getCustomersReport called with params:', params);
    const result = await apiClient.get('/reports/customers', { params });
    console.log('reportsAPI.getCustomersReport response:', result);
    return result;
  },

  // Get dashboard summary
  getDashboardSummary: async (params) => {
    console.log('reportsAPI.getDashboardSummary called with params:', params);
    const result = await apiClient.get('/reports/dashboard', { params });
    console.log('reportsAPI.getDashboardSummary response:', result);
    return result;
  },
};
