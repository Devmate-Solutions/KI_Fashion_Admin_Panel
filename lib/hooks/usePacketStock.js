import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packetStockAPI } from '../api/endpoints/packetStock';
import { toast } from 'react-hot-toast';

// Query keys
export const packetStockKeys = {
  all: ['packet-stock'],
  lists: () => [...packetStockKeys.all, 'list'],
  list: (filters) => [...packetStockKeys.lists(), filters],
  details: () => [...packetStockKeys.all, 'detail'],
  detail: (id) => [...packetStockKeys.details(), id],
  byProduct: (productId) => [...packetStockKeys.all, 'by-product', productId],
  loose: (productId) => [...packetStockKeys.all, 'loose', productId],
};

/**
 * Fetch all packet stocks with optional filters
 */
export function usePacketStockList(params = {}, options = {}) {
  return useQuery({
    queryKey: packetStockKeys.list(params),
    queryFn: async () => {
      const response = await packetStockAPI.getAll(params);
      return response.data;
    },
    staleTime: 120 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Fetch packet stocks for a specific product
 */
export function usePacketStockByProduct(productId, params = {}, options = {}) {
  return useQuery({
    queryKey: packetStockKeys.byProduct(productId),
    queryFn: async () => {
      const response = await packetStockAPI.getByProduct(productId, params);
      return response.data;
    },
    enabled: Boolean(productId) && options.enabled !== false,
    staleTime: 120 * 1000,
    ...options,
  });
}

/**
 * Fetch a single packet stock by ID
 */
export function usePacketStock(id, options = {}) {
  return useQuery({
    queryKey: packetStockKeys.detail(id),
    queryFn: async () => {
      const response = await packetStockAPI.getById(id);
      return response.data;
    },
    enabled: Boolean(id) && options.enabled !== false,
    ...options,
  });
}

/**
 * Scan/lookup barcode
 */
export function useScanBarcode() {
  return useMutation({
    mutationFn: (barcode) => packetStockAPI.scanBarcode(barcode),
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to scan barcode';
      toast.error(message);
    },
  });
}

/**
 * Add stock to packet
 */
export function useAddPacketStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => packetStockAPI.addStock(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packetStockKeys.all });
      toast.success('Stock added successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to add stock';
      toast.error(message);
    },
  });
}

/**
 * Reserve packets
 */
export function useReservePackets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => packetStockAPI.reserve(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packetStockKeys.all });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to reserve packets';
      toast.error(message);
    },
  });
}

/**
 * Release reserved packets
 */
export function useReleasePackets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => packetStockAPI.release(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packetStockKeys.all });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to release packets';
      toast.error(message);
    },
  });
}

/**
 * Sell packets
 */
export function useSellPackets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => packetStockAPI.sell(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packetStockKeys.all });
      toast.success('Packets sold successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to sell packets';
      toast.error(message);
    },
  });
}

/**
 * Break a packet - sell some items and create loose stock for remainder
 */
export function useBreakPacket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ packetStockId, itemsToSell, saleReference, notes, mode }) =>
      packetStockAPI.breakPacket(packetStockId, { itemsToSell, saleReference, notes, mode }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: packetStockKeys.all });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(response.data?.message || 'Packet broken successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to break packet';
      toast.error(message);
    },
  });
}

/**
 * Get loose stock for a product (for returns)
 */
export function useLooseStockByProduct(productId, options = {}) {
  return useQuery({
    queryKey: packetStockKeys.loose(productId),
    queryFn: async () => {
      const response = await packetStockAPI.getLooseByProduct(productId);
      return response.data;
    },
    enabled: Boolean(productId) && options.enabled !== false,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Add items back to loose stock (for returns)
 */
export function useAddToLooseStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ looseStockId, quantity, reason, notes }) =>
      packetStockAPI.addToLooseStock(looseStockId, { quantity, reason, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packetStockKeys.all });
      toast.success('Items added to loose stock');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to add items to loose stock';
      toast.error(message);
    },
  });
}

/**
 * Get barcode label data for printing
 */
export function useBarcodeLabelData(id, options = {}) {
  return useQuery({
    queryKey: ['barcode-label', id],
    queryFn: async () => {
      const response = await packetStockAPI.getBarcodeLabel(id);
      return response.data;
    },
    enabled: Boolean(id) && options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}
