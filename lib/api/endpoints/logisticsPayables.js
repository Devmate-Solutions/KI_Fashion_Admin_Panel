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
    console.log('logisticsPayablesAPI.getAll called with params:', params);
    const result = await apiClient.get('/logistics-payables', { params });
    console.log('logisticsPayablesAPI.getAll response:', result);
    return result;
  },

  /**
   * Get detailed payable information for a specific logistics company
   * @param {string} companyId - Logistics company ID
   * @param {Object} params - Filter parameters for orders
   * @returns {Promise} Company payable details with orders breakdown
   */
  getByCompanyId: async (companyId, params = {}) => {
    console.log('logisticsPayablesAPI.getByCompanyId called with id:', companyId, 'params:', params);
    const result = await apiClient.get(`/logistics-payables/company/${companyId}`, { params });
    console.log('logisticsPayablesAPI.getByCompanyId response:', result);
    return result;
  },

  /**
   * Get orders for a specific logistics company with box counts
   * @param {string} companyId - Logistics company ID
   * @param {Object} params - Filter parameters
   * @returns {Promise} List of orders with box details
   */
  getOrdersByCompany: async (companyId, params = {}) => {
    console.log('logisticsPayablesAPI.getOrdersByCompany called with id:', companyId, 'params:', params);
    const result = await apiClient.get(`/logistics-payables/company/${companyId}/orders`, { params });
    console.log('logisticsPayablesAPI.getOrdersByCompany response:', result);
    return result;
  },

  /**
   * Get payment history for a logistics company
   * @param {string} companyId - Logistics company ID
   * @param {Object} params - Filter parameters
   * @returns {Promise} Payment history
   */
  getPaymentHistory: async (companyId, params = {}) => {
    console.log('logisticsPayablesAPI.getPaymentHistory called with id:', companyId, 'params:', params);
    const result = await apiClient.get(`/logistics-payables/company/${companyId}/payments`, { params });
    console.log('logisticsPayablesAPI.getPaymentHistory response:', result);
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
    console.log('logisticsPayablesAPI.createPayment called with data:', paymentData);
    const result = await apiClient.post('/logistics-payables/payment', paymentData);
    console.log('logisticsPayablesAPI.createPayment response:', result);
    return result;
  },

  /**
   * Update box rate for a logistics company
   * @param {string} companyId - Logistics company ID
   * @param {number} boxRate - New rate per box
   * @returns {Promise} Updated company data
   */
  updateBoxRate: async (companyId, boxRate) => {
    console.log('logisticsPayablesAPI.updateBoxRate called with id:', companyId, 'rate:', boxRate);
    const result = await apiClient.put(`/logistics-payables/company/${companyId}/rate`, { boxRate });
    console.log('logisticsPayablesAPI.updateBoxRate response:', result);
    return result;
  },

  /**
   * Get summary statistics for all logistics payables
   * @returns {Promise} Summary data
   */
  getSummary: async () => {
    console.log('logisticsPayablesAPI.getSummary called');
    const result = await apiClient.get('/logistics-payables/summary');
    console.log('logisticsPayablesAPI.getSummary response:', result);
    return result;
  },
};

