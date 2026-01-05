import apiClient from '../client';

export const productsAPI = {
  // Get all products with optional filters
  getAll: async (params) => {
    console.log('productsAPI.getAll called with params:', params);
    const result = await apiClient.get('/products', { params });
    console.log('productsAPI.getAll response:', result);
    return result;
  },

  // Get single product by ID
  getById: async (id) => {
    console.log('productsAPI.getById called with id:', id);
    const result = await apiClient.get(`/products/${id}`);
    console.log('productsAPI.getById response:', result);
    return result;
  },

  // Search products by code or name
  search: async (query) => {
    console.log('productsAPI.search called with query:', query);
    const result = await apiClient.get('/products', { params: { search: query } });
    console.log('productsAPI.search response:', result);
    return result;
  },

  // Create new product
  create: async (productData) => {
    console.log('productsAPI.create called with data:', productData);
    const result = await apiClient.post('/products', productData);
    console.log('productsAPI.create response:', result);
    return result;
  },

  // Update existing product
  update: async (id, productData) => {
    console.log('productsAPI.update called with id:', id, 'data:', productData);
    const result = await apiClient.put(`/products/${id}`, productData);
    console.log('productsAPI.update response:', result);
    return result;
  },

  // Delete product
  delete: async (id) => {
    console.log('productsAPI.delete called with id:', id);
    const result = await apiClient.delete(`/products/${id}`);
    console.log('productsAPI.delete response:', result);
    return result;
  },

  // Get low stock products report
  getLowStockReport: async (params) => {
    console.log('productsAPI.getLowStockReport called with params:', params);
    const result = await apiClient.get('/products/reports/low-stock', { params });
    console.log('productsAPI.getLowStockReport response:', result);
    return result;
  },

  // Lookup product by product code
  lookupByCode: async (productCode) => {
    console.log('productsAPI.lookupByCode called with productCode:', productCode);
    const result = await apiClient.get(`/products/lookup/${encodeURIComponent(productCode)}`);
    console.log('productsAPI.lookupByCode response:', result);
    return result;
  },

  // Upload product image
  uploadImage: async (productId, imageFile) => {
    console.log('productsAPI.uploadImage called with productId:', productId);
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const result = await apiClient.post(`/products/${productId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('productsAPI.uploadImage response:', result);
    return result;
  },
};
