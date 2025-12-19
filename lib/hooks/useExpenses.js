import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesAPI } from '../api/endpoints/expenses';
import toast from 'react-hot-toast';

// Query Keys
export const expensesKeys = {
  all: ['expenses'],
  lists: () => [...expensesKeys.all, 'list'],
  list: (filters) => [...expensesKeys.lists(), filters],
  details: () => [...expensesKeys.all, 'detail'],
  detail: (id) => [...expensesKeys.details(), id],
  summary: (filters) => [...expensesKeys.all, 'summary', filters],
};

// Helper to parse stringified JSON data from API
function parseData(data) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse expense data:', e);
      return data;
    }
  }
  return data;
}

// Get all expenses
export const useExpenses = (params = {}) => {
  return useQuery({
    queryKey: expensesKeys.list(params),
    queryFn: () => expensesAPI.getAll(params),
    select: (response) => {
      // If response is undefined or null, return empty structure
      if (!response) {
        return {
          data: [],
          summary: {},
          pagination: {},
        };
      }
      try {
        // Handle different response structures
        if (!response) {
          console.warn('useExpenses: No response received');
          return {
            data: [],
            summary: {},
            pagination: {},
          };
        }

        let rawData;
        // Axios wraps the response in response.data
        if (response.data) {
          rawData = typeof response.data === 'string' ? parseData(response.data) : response.data;
        } else {
          rawData = typeof response === 'string' ? parseData(response) : response;
        }
        
        if (!rawData) {
          console.warn('useExpenses: No data in response');
          return {
            data: [],
            summary: {},
            pagination: {},
          };
        }
        
        // Extract expenses array - handle different response structures
        let expenses = [];
        if (rawData?.data && Array.isArray(rawData.data)) {
          expenses = rawData.data;
        } else if (Array.isArray(rawData)) {
          expenses = rawData;
        } else if (rawData?.success && Array.isArray(rawData.data)) {
          expenses = rawData.data;
        }
        
        // Ensure expenses is always an array
        if (!Array.isArray(expenses)) {
          expenses = [];
        }
        
        console.log('Parsed expense data:', expenses);
        
        // Transform backend data to match frontend format
        return {
          data: expenses.map(expense => ({
            id: expense._id || expense.id,
            expenseNumber: expense.expenseNumber,
            date: expense.expenseDate || expense.date,
            description: expense.description,
            costType: expense.costType?.name || 'N/A',
            costTypeId: expense.costType?._id || expense.costType,
            costTypeCategory: expense.costType?.category,
            amount: expense.amount || 0,
            taxAmount: expense.taxAmount || 0,
            totalCost: (expense.amount || 0) + (expense.taxAmount || 0),
            paymentMethod: expense.paymentMethod,
            vendor: expense.vendor || 'N/A',
            invoiceNumber: expense.invoiceNumber || '-',
            receiptNumber: expense.receiptNumber || '-',
            status: expense.status,
            createdBy: expense.createdBy?.name || 'N/A',
            approvedBy: expense.approvedBy?.name || null,
            notes: expense.notes,
            // Keep original data for reference
            _original: expense,
          })),
          summary: rawData?.summary || response?.summary || {},
          pagination: rawData?.pagination || response?.pagination || {},
        };
      } catch (error) {
        console.error('Error parsing expenses data:', error);
        // Return empty structure on error
        return {
          data: [],
          summary: {},
          pagination: {},
        };
      }
    },
  });
};

// Get single expense
export const useExpense = (id) => {
  return useQuery({
    queryKey: expensesKeys.detail(id),
    queryFn: () => expensesAPI.getById(id),
    enabled: !!id,
    select: (response) => parseData(response.data),
  });
};

// Create expense mutation
export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: expensesAPI.create,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      toast.success(response.message || 'Expense created successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create expense';
      toast.error(message);
      console.error('Create expense error:', error);
    },
  });
};

// Update expense mutation
export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => expensesAPI.update(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expensesKeys.detail(variables.id) });
      toast.success(response.message || 'Expense updated successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update expense';
      toast.error(message);
      console.error('Update expense error:', error);
    },
  });
};

// Delete expense mutation
export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: expensesAPI.delete,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      toast.success(response.message || 'Expense deleted successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete expense';
      toast.error(message);
      console.error('Delete expense error:', error);
    },
  });
};

// Approve expense mutation
export const useApproveExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: expensesAPI.approve,
    onSuccess: (response, id) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expensesKeys.detail(id) });
      toast.success('Expense approved successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to approve expense';
      toast.error(message);
    },
  });
};

// Reject expense mutation
export const useRejectExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: expensesAPI.reject,
    onSuccess: (response, id) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expensesKeys.detail(id) });
      toast.success('Expense rejected successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to reject expense';
      toast.error(message);
    },
  });
};

// Get summary report
export const useExpensesSummary = (params = {}) => {
  return useQuery({
    queryKey: expensesKeys.summary(params),
    queryFn: () => expensesAPI.getSummary(params),
    select: (response) => parseData(response.data),
  });
};
