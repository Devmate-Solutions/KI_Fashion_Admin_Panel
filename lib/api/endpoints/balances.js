import apiClient from '../client';

export const balancesAPI = {
  getPendingBalances: async (supplierId) => {
    const params = {};
    if (supplierId && supplierId !== 'all') {
      params.supplierId = supplierId;
    }
    const result = await apiClient.get('/balances/pending', { params });
    return result;
  },

  getLogisticsPendingBalances: async (logisticsCompanyId) => {
    const params = {};
    if (logisticsCompanyId && logisticsCompanyId !== 'all') {
      params.logisticsCompanyId = logisticsCompanyId;
    }
    const result = await apiClient.get('/balances/pending-logistics', { params });
    return result;
  },
};

