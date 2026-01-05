import apiClient from '../client';

export const inventoryAPI = {
	getAll: (params = {}) => apiClient.get('/inventory', { params }),

	getByProduct: (productId, params = {}) =>
		apiClient.get(`/inventory/product/${productId}`, { params }),

	addStock: (payload) => apiClient.post('/inventory/add-stock', payload),

	reduceStock: (payload) => apiClient.post('/inventory/reduce-stock', payload),

	adjustStock: (payload) => apiClient.post('/inventory/adjust-stock', payload),

	transferStock: (payload) => apiClient.post('/inventory/transfer-stock', payload),

	getMovements: (productId, params = {}) =>
		apiClient.get(`/inventory/movements/${productId}`, { params }),

	getLowStockReport: (params = {}) =>
		apiClient.get('/inventory/reports/low-stock', { params }),

	getValuationReport: (params = {}) =>
		apiClient.get('/inventory/reports/valuation', { params }),

	updateSettings: (inventoryId, payload) =>
		apiClient.put(`/inventory/${inventoryId}/settings`, payload),
};