import apiClient from "../client";

export const dispatchOrdersAPI = {
  getAll: async (params = {}) => {
    const result = await apiClient.get("/dispatch-orders", { params });
    return result;
  },

  getById: async (id) => {
    const result = await apiClient.get(`/dispatch-orders/${id}`);
    return result;
  },

  confirm: async (id, paymentData) => {
    console.log("dispatchOrdersAPI.confirm: Sending confirmation request", {
      id,
      paymentData,
    });
    try {
      const result = await apiClient.post(
        `/dispatch-orders/${id}/confirm`,
        paymentData
      );
      console.log("dispatchOrdersAPI.confirm: Success response", result);
      return result;
    } catch (error) {
      console.error("dispatchOrdersAPI.confirm: Error details", {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data,
        error: error.message,
      });
      throw error;
    }
  },

  submitApproval: async (id, paymentData) => {
    console.log("dispatchOrdersAPI.submitApproval: Sending approval submission request", {
      id,
      paymentData,
    });
    try {
      const result = await apiClient.post(
        `/dispatch-orders/${id}/submit-approval`,
        paymentData
      );
      console.log("dispatchOrdersAPI.submitApproval: Success response", result);
      return result;
    } catch (error) {
      console.error("dispatchOrdersAPI.submitApproval: Error details", {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data,
        error: error.message,
      });
      throw error;
    }
  },

  returnItems: async (id, payload) => {
    const result = await apiClient.post(
      `/dispatch-orders/${id}/return`,
      payload
    );
    return result;
  },

  getUnpaidBySupplier: async (supplierId) => {
    const result = await apiClient.get(`/dispatch-orders/unpaid/${supplierId}`);
    return result;
  },

  delete: async (id) => {
    const result = await apiClient.delete(`/dispatch-orders/${id}`);
    return result;
  },

  // Revert dispatch order status back to pending
  revertToPending: async (id) => {
    console.log("dispatchOrdersAPI.revertToPending called with id:", id);
    const result = await apiClient.patch(
      `/dispatch-orders/${id}/revert-pending`
    );
    console.log("dispatchOrdersAPI.revertToPending response:", result);
    return result;
  },

  // Get barcode data for printing
  getBarcodeData: async (id) => {
    const result = await apiClient.get(`/dispatch-orders/${id}/barcode-data`);
    return result;
  },

  // Upload an image for a specific dispatch order item (admin)
  uploadItemImage: async (id, itemIndex, imageFile) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    const result = await apiClient.post(
      `/dispatch-orders/${id}/items/${itemIndex}/image`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return result?.data?.data || result?.data || result;
  },

  // Delete a single image from a dispatch order item (admin — optimistic, no dedicated endpoint)
  // Deletion is handled client-side by removing the URL from editedItems.images;
  // the updated list is persisted when the order is confirmed / submitted for approval.
};
