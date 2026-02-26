import apiClient from '../client';

export const expensesAPI = {
  // Get all expenses with optional filters and pagination
  getAll: async (params) => {
     
    const result = await apiClient.get('/expenses', { params });
     
    return result;
  },

  // Get single expense by ID
  getById: async (id) => {
     
    const result = await apiClient.get(`/expenses/${id}`);
     
    return result;
  },

  // Create new expense
  create: async (expenseData) => {
     
    const result = await apiClient.post('/expenses', expenseData);
     
    return result;
  },

  // Update existing expense
  update: async (id, expenseData) => {
     
    const result = await apiClient.put(`/expenses/${id}`, expenseData);
     
    return result;
  },

  // Approve expense
  approve: async (id) => {
     
    const result = await apiClient.patch(`/expenses/${id}/approve`);
     
    return result;
  },

  // Reject expense
  reject: async (id) => {
     
    const result = await apiClient.patch(`/expenses/${id}/reject`);
     
    return result;
  },

  // Delete expense
  delete: async (id) => {
     
    const result = await apiClient.delete(`/expenses/${id}`);
     
    return result;
  },

  // Get summary report by cost type
  getSummary: async (params) => {
     
    const result = await apiClient.get('/expenses/reports/summary', { params });
     
    return result;
  },
};
