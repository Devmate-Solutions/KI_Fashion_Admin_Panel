import apiClient from '../client';

export const purchasesAPI = {
  // Get all purchases with optional filters
  getAll: async (params) => {
    console.log('purchasesAPI.getAll called with params:', params);
    const result = await apiClient.get('/purchases', { params });
    console.log('purchasesAPI.getAll response:', result);
    return result;
  },

  // Get single purchase by ID
  getById: async (id) => {
    console.log('purchasesAPI.getById called with id:', id);
    const result = await apiClient.get(`/purchases/${id}`);
    console.log('purchasesAPI.getById response:', result);
    return result;
  },

  // Create new purchase (uses DispatchOrder manual entry endpoint)
  create: async (purchaseData) => {
    console.log('purchasesAPI.create called with data:', purchaseData);
    // Use the new manual entry endpoint
    const result = await apiClient.post('/dispatch-orders/manual', purchaseData);
    console.log('purchasesAPI.create response:', result);
    return result;
  },

  // Update existing purchase
  update: async (id, purchaseData) => {
    console.log('purchasesAPI.update called with id:', id, 'data:', purchaseData);
    const result = await apiClient.put(`/purchases/${id}`, purchaseData);
    console.log('purchasesAPI.update response:', result);
    return result;
  },

  // Delete purchase
  delete: async (id) => {
    console.log('purchasesAPI.delete called with id:', id);
    const result = await apiClient.delete(`/purchases/${id}`);
    console.log('purchasesAPI.delete response:', result);
    return result;
  },

  // Mark purchase as delivered
  markDelivered: async (id, deliveryData) => {
    console.log('purchasesAPI.markDelivered called with id:', id, 'data:', deliveryData);
    const result = await apiClient.patch(`/purchases/${id}/delivered`, deliveryData);
    console.log('purchasesAPI.markDelivered response:', result);
    return result;
  },

  // Update payment status
  updatePaymentStatus: async (id, paymentData) => {
    console.log('purchasesAPI.updatePaymentStatus called with id:', id, 'data:', paymentData);
    const result = await apiClient.patch(`/purchases/${id}/payment`, paymentData);
    console.log('purchasesAPI.updatePaymentStatus response:', result);
    return result;
  },
};
