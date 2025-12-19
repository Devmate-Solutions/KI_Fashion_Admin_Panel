import apiClient from '../client';

export const expensesAPI = {
  // Get all expenses with optional filters and pagination
  getAll: async (params) => {
    console.log('expensesAPI.getAll called with params:', params);
    const result = await apiClient.get('/expenses', { params });
    console.log('expensesAPI.getAll response:', result);
    return result;
  },

  // Get single expense by ID
  getById: async (id) => {
    console.log('expensesAPI.getById called with id:', id);
    const result = await apiClient.get(`/expenses/${id}`);
    console.log('expensesAPI.getById response:', result);
    return result;
  },

  // Create new expense
  create: async (expenseData) => {
    console.log('expensesAPI.create called with data:', expenseData);
    const result = await apiClient.post('/expenses', expenseData);
    console.log('expensesAPI.create response:', result);
    return result;
  },

  // Update existing expense
  update: async (id, expenseData) => {
    console.log('expensesAPI.update called with id:', id, 'data:', expenseData);
    const result = await apiClient.put(`/expenses/${id}`, expenseData);
    console.log('expensesAPI.update response:', result);
    return result;
  },

  // Approve expense
  approve: async (id) => {
    console.log('expensesAPI.approve called with id:', id);
    const result = await apiClient.patch(`/expenses/${id}/approve`);
    console.log('expensesAPI.approve response:', result);
    return result;
  },

  // Reject expense
  reject: async (id) => {
    console.log('expensesAPI.reject called with id:', id);
    const result = await apiClient.patch(`/expenses/${id}/reject`);
    console.log('expensesAPI.reject response:', result);
    return result;
  },

  // Delete expense
  delete: async (id) => {
    console.log('expensesAPI.delete called with id:', id);
    const result = await apiClient.delete(`/expenses/${id}`);
    console.log('expensesAPI.delete response:', result);
    return result;
  },

  // Get summary report by cost type
  getSummary: async (params) => {
    console.log('expensesAPI.getSummary called with params:', params);
    const result = await apiClient.get('/expenses/reports/summary', { params });
    console.log('expensesAPI.getSummary response:', result);
    return result;
  },
};
