import apiClient from '../client';

export const productsAPI = {
  // Get all products with optional filters
  getAll: async (params) => {
     
    const result = await apiClient.get('/products', { params });
     
    return result;
  },

  // Get single product by ID
  getById: async (id) => {
     
    const result = await apiClient.get(`/products/${id}`);
     
    return result;
  },

  // Search products by code or name
  search: async (query, params = {}) => {
     
    const result = await apiClient.get('/products', { params: { search: query, ...params } });
     
    return result;
  },

  // Create new product
  create: async (productData) => {
     
    const result = await apiClient.post('/products', productData);
     
    return result;
  },

  // Update existing product
  update: async (id, productData) => {
     
    const result = await apiClient.put(`/products/${id}`, productData);
     
    return result;
  },

  // Update only minimum selling price
  updateMinSellingPrice: async (id, minSellingPrice) => {
    const result = await apiClient.patch(`/products/${id}/min-selling-price`, {
      minSellingPrice,
    });
    return result;
  },

  // Delete product
  delete: async (id) => {
     
    const result = await apiClient.delete(`/products/${id}`);
     
    return result;
  },

  // Get low stock products report
  getLowStockReport: async (params) => {
     
    const result = await apiClient.get('/products/reports/low-stock', { params });
     
    return result;
  },

  // Lookup product by product code
  lookupByCode: async (productCode, params = {}) => {
     
    const result = await apiClient.get(`/products/lookup/${encodeURIComponent(productCode)}`, { params });
     
    return result;
  },

  // Upload product image
  uploadImage: async (productId, imageFile) => {
     
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const result = await apiClient.post(`/products/${productId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
     
    return result;
  },
};
