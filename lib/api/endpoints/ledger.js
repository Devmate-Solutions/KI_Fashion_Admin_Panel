import apiClient from '../client';

export const ledgerAPI = {
  getSupplierLedger: async (supplierId, params = {}) => {
    const result = await apiClient.get(`/ledger/supplier/${supplierId}`, { params });
    return result;
  },

  getBuyerLedger: async (buyerId, params = {}) => {
    const result = await apiClient.get(`/ledger/buyer/${buyerId}`, { params });
    return result;
  },

  getLogisticsLedger: async (logisticsCompanyId, params = {}) => {
    const result = await apiClient.get(`/ledger/logistics/${logisticsCompanyId}`, { params });
    return result;
  },

  createEntry: async (entryData) => {
    const result = await apiClient.post('/ledger/entry', entryData);
    return result;
  },

  getBalance: async (type, id) => {
    const result = await apiClient.get(`/ledger/balance/${type}/${id}`);
    return result;
  },

  getAllSupplierLedgers: async (params = {}) => {
    const result = await apiClient.get('/ledger/suppliers', { params });
    return result;
  },

  getAllBuyerLedgers: async (params = {}) => {
    const result = await apiClient.get('/ledger/buyers', { params });
    return result;
  },

  getAllLogisticsLedgers: async (params = {}) => {
    const result = await apiClient.get('/ledger/logistics', { params });
    return result;
  },
};

