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
  search: async (query) => {
     
    const result = await apiClient.get('/products', { params: { search: query } });
     
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
  lookupByCode: async (productCode) => {
     
    const result = await apiClient.get(`/products/lookup/${encodeURIComponent(productCode)}`);
     
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
