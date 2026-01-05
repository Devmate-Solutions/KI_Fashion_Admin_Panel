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

  // =====================================================
  // NEW ENDPOINTS - Universal Payment Distribution (SSOT)
  // =====================================================

  /**
   * Distribute a bulk payment across pending orders for a supplier
   * @param {string} supplierId - The supplier ID
   * @param {Object} paymentData - { amount, paymentMethod, date, description }
   */
  distributeSupplierPayment: async (supplierId, paymentData) => {
    const result = await apiClient.post(`/ledger/supplier/${supplierId}/distribute-payment`, paymentData);
    return result;
  },

  /**
   * Create a manual debit adjustment for a supplier
   * @param {string} supplierId - The supplier ID
   * @param {Object} adjustmentData - { amount, date, description }
   */
  createSupplierDebitAdjustment: async (supplierId, adjustmentData) => {
    const result = await apiClient.post(`/ledger/supplier/${supplierId}/debit-adjustment`, adjustmentData);
    return result;
  },

  /**
   * Distribute a bulk payment across pending charges for a logistics company
   * @param {string} logisticsCompanyId - The logistics company ID
   * @param {Object} paymentData - { amount, paymentMethod, date, description }
   */
  distributeLogisticsPayment: async (logisticsCompanyId, paymentData) => {
    const result = await apiClient.post(`/ledger/logistics/${logisticsCompanyId}/distribute-payment`, paymentData);
    return result;
  },

  /**
   * Create a manual debit adjustment for a logistics company
   * @param {string} logisticsCompanyId - The logistics company ID
   * @param {Object} adjustmentData - { amount, date, description }
   */
  createLogisticsDebitAdjustment: async (logisticsCompanyId, adjustmentData) => {
    const result = await apiClient.post(`/ledger/logistics/${logisticsCompanyId}/debit-adjustment`, adjustmentData);
    return result;
  },
};

