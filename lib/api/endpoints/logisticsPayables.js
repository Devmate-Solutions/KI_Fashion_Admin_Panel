import apiClient from '../client';

/**
 * Logistics Payables API
 * Handles logistics company payment tracking and management
 * 
 * Backend Requirements:
 * - Add totalBoxes field to DispatchOrder schema
 * - Add boxRate field to LogisticsCompany schema
 * - Create logistics ledger support (similar to supplier ledger)
 * - Implement endpoints: /logistics-payables/*
 */

export const logisticsPayablesAPI = {
  /**
   * Get all logistics payables with optional filters
   * @param {Object} params - Filter parameters
   * @param {string} params.companyId - Filter by logistics company
   * @param {string} params.paymentStatus - Filter by payment status (paid/partial/pending)
   * @param {string} params.dateFrom - Start date for filtering
   * @param {string} params.dateTo - End date for filtering
   * @param {number} params.limit - Pagination limit
   * @returns {Promise} Payables data
   */
  getAll: async (params = {}) => {
     
    const result = await apiClient.get('/logistics-payables', { params });
     
    return result;
  },

  /**
   * Get detailed payable information for a specific logistics company
   * @param {string} companyId - Logistics company ID
   * @param {Object} params - Filter parameters for orders
   * @returns {Promise} Company payable details with orders breakdown
   */
  getByCompanyId: async (companyId, params = {}) => {
     
    const result = await apiClient.get(`/logistics-payables/company/${companyId}`, { params });
     
    return result;
  },

  /**
   * Get orders for a specific logistics company with box counts
   * @param {string} companyId - Logistics company ID
   * @param {Object} params - Filter parameters
   * @returns {Promise} List of orders with box details
   */
  getOrdersByCompany: async (companyId, params = {}) => {
     
    const result = await apiClient.get(`/logistics-payables/company/${companyId}/orders`, { params });
     
    return result;
  },

  /**
   * Get payment history for a logistics company
   * @param {string} companyId - Logistics company ID
   * @param {Object} params - Filter parameters
   * @returns {Promise} Payment history
   */
  getPaymentHistory: async (companyId, params = {}) => {
     
    const result = await apiClient.get(`/logistics-payables/company/${companyId}/payments`, { params });
     
    return result;
  },

  /**
   * Create a payment for a logistics company
   * @param {Object} paymentData - Payment information
   * @param {string} paymentData.logisticsCompanyId - Logistics company ID
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.date - Payment date
   * @param {string} paymentData.method - Payment method (cash/bank)
   * @param {string} paymentData.description - Payment description
   * @param {number} paymentData.boxRate - Rate per box used for this payment
   * @param {number} paymentData.numberOfBoxes - Number of boxes being paid for
   * @param {Array} paymentData.orderIds - Optional: specific order IDs to allocate payment to
   * @returns {Promise} Created payment data
   */
  createPayment: async (paymentData) => {
     
    const result = await apiClient.post('/logistics-payables/payment', paymentData);
     
    return result;
  },

  /**
   * Update box rate for a logistics company
   * @param {string} companyId - Logistics company ID
   * @param {number} boxRate - New rate per box
   * @returns {Promise} Updated company data
   */
  updateBoxRate: async (companyId, boxRate) => {
     
    const result = await apiClient.put(`/logistics-payables/company/${companyId}/rate`, { boxRate });
     
    return result;
  },

  /**
   * Get summary statistics for all logistics payables
   * @returns {Promise} Summary data
   */
  getSummary: async () => {
     
    const result = await apiClient.get('/logistics-payables/summary');
     
    return result;
  },
};

