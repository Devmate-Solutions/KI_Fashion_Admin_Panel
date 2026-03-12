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
   * Get supplier payment receipts for a supplier.
   * @param {string} supplierId - The supplier ID
   * @param {Object} params - { limit?, offset? }
   */
  getSupplierPaymentReceipts: async (supplierId, params = {}) => {
    const result = await apiClient.get(`/ledger/supplier/${supplierId}/payment-receipts`, { params });
    return result;
  },

  /**
   * Get a specific supplier payment receipt.
   * @param {string} supplierId - The supplier ID
   * @param {string} receiptNumber - The supplier receipt number
   */
  getSupplierPaymentReceipt: async (supplierId, receiptNumber) => {
    const result = await apiClient.get(`/ledger/supplier/${supplierId}/payment-receipts/${receiptNumber}`);
    return result;
  },

  /**
   * Reverse a supplier payment receipt (super-admin only)
   * @param {string} supplierId - The supplier ID
   * @param {string} receiptNumber - The receipt number to reverse
   * @param {string} reason - Reason for reversal
   */
  reverseSupplierReceipt: async (supplierId, receiptNumber, reason) => {
    const result = await apiClient.post(`/ledger/supplier/${supplierId}/payment-receipts/${receiptNumber}/reverse`, { reason });
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

  // =====================================================
  // BUYER PAYMENT MANAGEMENT ENDPOINTS
  // =====================================================

  /**
   * Distribute a bulk payment across pending sales for a buyer (FIFO - oldest first)
   * @param {string} buyerId - The buyer ID
   * @param {Object} paymentData - { amount, paymentMethod, date, description }
   */
  distributeBuyerPayment: async (buyerId, paymentData) => {
    const result = await apiClient.post(`/ledger/buyer/${buyerId}/distribute-payment`, paymentData);
    return result;
  },

  /**
   * Create a manual debit adjustment for a buyer (e.g., correction, fee)
   * @param {string} buyerId - The buyer ID
   * @param {Object} adjustmentData - { amount, date, description }
   */
  createBuyerDebitAdjustment: async (buyerId, adjustmentData) => {
    const result = await apiClient.post(`/ledger/buyer/${buyerId}/debit-adjustment`, adjustmentData);
    return result;
  },
};

