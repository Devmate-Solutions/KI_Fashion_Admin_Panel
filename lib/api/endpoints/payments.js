import apiClient from '../client';

/**
 * Payment API endpoints for customer payment management
 * Handles payment creation, listing, reversal, and receipt generation
 */
export const paymentAPI = {
  /**
   * Create a new customer payment with FIFO distribution
   * @param {Object} paymentData - { customerId, amount, paymentMethod, date?, description? }
   */
  createCustomerPayment: async (paymentData) => {
    const result = await apiClient.post('/payments/customer', paymentData);
    return result;
  },

  /**
   * Get all payments for a specific customer
   * @param {string} customerId - The customer/buyer ID
   * @param {Object} params - { limit?, offset?, status? }
   */
  getCustomerPayments: async (customerId, params = {}) => {
    const result = await apiClient.get(`/payments/customer/${customerId}`, { params });
    return result;
  },

  /**
   * Get all payments with optional filters
   * @param {Object} params - { page?, limit?, status?, customerId?, startDate?, endDate? }
   */
  getAllPayments: async (params = {}) => {
    const result = await apiClient.get('/payments/all', { params });
    return result;
  },

  /**
   * Get a specific payment by payment number
   * @param {string} paymentNumber - The payment number (e.g., PAY-000001)
   */
  getPayment: async (paymentNumber) => {
    const result = await apiClient.get(`/payments/${paymentNumber}`);
    return result;
  },

  /**
   * Reverse (void) a payment
   * @param {string} paymentNumber - The payment number to reverse
   * @param {string} reason - The reason for reversal
   */
  reversePayment: async (paymentNumber, reason) => {
    const result = await apiClient.post(`/payments/${paymentNumber}/reverse`, { reason });
    return result;
  },

  /**
   * Get payment receipt data for PDF generation
   * @param {string} paymentNumber - The payment number
   */
  getPaymentReceipt: async (paymentNumber) => {
    const result = await apiClient.get(`/payments/${paymentNumber}/receipt`);
    return result;
  },
};
