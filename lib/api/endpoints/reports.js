import apiClient from '@/lib/api/client';

export const reportsAPI = {
  // Get sales reports
  getSalesReport: async (params) => {
     
    const result = await apiClient.get('/reports/sales', { params });
     
    return result;
  },

  // Get purchase reports
  getPurchasesReport: async (params) => {
     
    const result = await apiClient.get('/reports/purchases', { params });
     
    return result;
  },

  // Get financial reports
  getFinancialReport: async (params) => {
     
    const result = await apiClient.get('/reports/financial', { params });
     
    return result;
  },

  // Get inventory reports
  getInventoryReport: async (params) => {
     
    const result = await apiClient.get('/reports/inventory', { params });
     
    return result;
  },

  // Get supplier performance reports
  getSuppliersReport: async (params) => {
     
    const result = await apiClient.get('/reports/suppliers', { params });
     
    return result;
  },

  // Get customer analysis reports
  getCustomersReport: async (params) => {
     
    const result = await apiClient.get('/reports/customers', { params });
     
    return result;
  },

  // Get dashboard summary
  getDashboardSummary: async (params) => {
     
    const result = await apiClient.get('/reports/dashboard', { params });
     
    return result;
  },

  // NEW REPORT ENDPOINTS

  // Profit & Loss Report
  getProfitLossReport: async (params) => {
    const result = await apiClient.get('/reports/profit-loss', { params });
    return result;
  },

  // Daily Sales Report
  getDailySalesReport: async (params) => {
    const result = await apiClient.get('/reports/daily-sales', { params });
    return result;
  },

  // Daily Buying Report
  getDailyBuyingReport: async (params) => {
    const result = await apiClient.get('/reports/daily-buying', { params });
    return result;
  },

  // Sales Product-wise Report
  getSalesProductWiseReport: async (params) => {
    const result = await apiClient.get('/reports/sales-product-wise', { params });
    return result;
  },

  // Buying Product-wise Report
  getBuyingProductWiseReport: async (params) => {
    const result = await apiClient.get('/reports/buying-product-wise', { params });
    return result;
  },

  // Stock in Hand Report
  getStockInHandReport: async (params) => {
    const result = await apiClient.get('/reports/stock-in-hand', { params });
    return result;
  },

  // Receivables Report
  getReceivablesReport: async (params) => {
    const result = await apiClient.get('/reports/receivables', { params });
    return result;
  },

  // Payables Report
  getPayablesReport: async (params) => {
    const result = await apiClient.get('/reports/payables', { params });
    return result;
  },

  // Activity Log Report
  getActivityLogReport: async (params) => {
    const result = await apiClient.get('/reports/activity-log', { params });
    return result;
  },

  // Sales Returns Report
  getSalesReturnsReport: async (params) => {
    const result = await apiClient.get('/reports/sales-returns', { params });
    return result;
  },

  // Buying Returns Report
  getBuyingReturnsReport: async (params) => {
    const result = await apiClient.get('/reports/buying-returns', { params });
    return result;
  },
};
