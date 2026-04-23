import apiClient from '../client';

export const packetStockAPI = {
  // Get all packet stocks with filters
  getAll: (params = {}) => apiClient.get('/packet-stock', { params }),

  // Get packet stock by ID
  getById: (id) => apiClient.get(`/packet-stock/${id}`),

  // Get packet stocks by product ID
  getByProduct: (productId, params = {}) => 
    apiClient.get('/packet-stock', { params: { product: productId, ...params } }),

  // Scan/lookup barcode
  scanBarcode: (barcode, params = {}) => apiClient.get(`/packet-stock/scan/${barcode}`, { params }),

  // Add stock to packet
  addStock: (payload) => apiClient.post('/packet-stock/add-stock', payload),

  // Reserve packets for sale
  reserve: (payload) => apiClient.post('/packet-stock/reserve', payload),

  // Release reserved packets
  release: (payload) => apiClient.post('/packet-stock/release', payload),

  // Mark packets as sold
  sell: (payload) => apiClient.post('/packet-stock/sell', payload),

  // Get barcode label data for printing
  getBarcodeLabel: (id) => apiClient.get(`/packet-stock/barcode-label/${id}`),

  // Generate/preview barcode for composition
  generateBarcode: (payload) => apiClient.post('/packet-stock/generate-barcode', payload),

  // Break a packet and optionally sell items
  breakPacket: (id, payload) => apiClient.post(`/packet-stock/${id}/break`, payload),

  // Get loose stock for a product
  getLooseByProduct: (productId) => apiClient.get(`/packet-stock/loose/${productId}`),

  // Add items back to loose stock (for returns)
  addToLooseStock: (id, payload) => apiClient.post(`/packet-stock/loose/${id}/add-items`, payload),
};
