import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { inventoryAPI } from '../api/endpoints/inventory';

const parseMaybeString = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('useInventory: Failed to parse JSON string payload:', value, error);
      return fallback;
    }
  }
  return value;
};

const mapMovement = (movement = {}) => ({
  id: movement._id || movement.id || `${movement.reference || 'ref'}-${movement.date || movement.createdAt || Math.random()}`,
  type: movement.type || movement.movementType || 'unknown',
  quantity: Number(movement.quantity ?? movement.amount ?? 0),
  date: movement.date || movement.movementDate || movement.createdAt || movement.updatedAt || null,
  reference: movement.reference || movement.ref || '-',
  user: movement.user || null,
  userName: movement.user?.name || movement.user?.fullName || '-',
  notes: movement.notes || movement.description || '',
  raw: movement,
});

const mapInventoryRecord = (record = {}) => {
  const product = record.product || {};
  const currentStock = Number(record.currentStock ?? 0);
  const availableStock = Number(record.availableStock ?? currentStock);
  const reservedStock = Number(record.reservedStock ?? 0);
  const reorderLevel = Number(record.reorderLevel ?? 0);
  const averageCostPrice = Number(record.averageCostPrice ?? record.costPrice ?? 0);
  const totalValue = Number(record.totalValue ?? currentStock * averageCostPrice);
  const minStockLevel = Number(record.minStockLevel ?? 0);
  const maxStockLevel = Number(record.maxStockLevel ?? 0);
  const needsReorder = record.needsReorder ?? (reorderLevel > 0 && currentStock <= reorderLevel);
  const lowStock = record.lowStock ?? (reorderLevel > 0 && currentStock <= reorderLevel);

  // Extract supplier name from product.suppliers array
  let supplierName = '—';
  if (Array.isArray(product.suppliers) && product.suppliers.length > 0) {
    const primarySupplier = product.suppliers[0]?.supplier;
    if (primarySupplier) {
      supplierName = primarySupplier.companyName || primarySupplier.name || '—';
    }
  }

  return {
    id: record._id || record.id,
    inventoryId: record._id || record.id,
    productId: product._id || product.id,
    productName: product.name || 'Unknown Product',
    sku: product.sku || '—',
    category: product.category || '—',
    brand: product.brand || '—',
    unit: product.unit || 'unit',
    pricing: product.pricing || {},
    supplierName,
    currentStock,
    availableStock,
    reservedStock,
    reorderLevel,
    minStockLevel,
    maxStockLevel,
    needsReorder: Boolean(needsReorder),
    lowStock: Boolean(lowStock),
    averageCostPrice,
    totalValue,
    reorderQuantity: Number(record.reorderQuantity ?? 0),
    location: record.location || null,
    lastStockUpdate: record.lastStockUpdate || record.updatedAt || record.createdAt || null,
    product,
    raw: record,
  };
};

const mapInventoryDetail = (record = {}) => {
  const normalized = mapInventoryRecord(record);
  const stockMovements = parseMaybeString(record.stockMovements, record.stockMovements) || [];

  return {
    ...normalized,
    stockMovements: stockMovements.map(mapMovement),
  };
};

export const inventoryKeys = {
  all: ['inventory'],
  lists: () => [...inventoryKeys.all, 'list'],
  list: (params) => [...inventoryKeys.lists(), params],
  details: () => [...inventoryKeys.all, 'detail'],
  detail: (productId) => [...inventoryKeys.details(), productId],
  movements: () => [...inventoryKeys.all, 'movements'],
  movementList: (productId, params) => [...inventoryKeys.movements(), productId, params],
  lowStock: () => [...inventoryKeys.all, 'lowStock'],
  valuation: () => [...inventoryKeys.all, 'valuation'],
};

export const useInventoryList = (params = {}) => {
  const queryParams = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    search: params.search || undefined,
    lowStock: params.lowStock !== undefined ? String(params.lowStock) : undefined,
    needsReorder: params.needsReorder !== undefined ? String(params.needsReorder) : undefined,
    category: params.category || undefined,
    startDate: params.startDate || undefined,
    endDate: params.endDate || undefined,
  };

  return useQuery({
    queryKey: inventoryKeys.list(queryParams),
    queryFn: () => inventoryAPI.getAll(queryParams),
    keepPreviousData: true,
    staleTime: 30 * 1000, // 30 seconds - data won't refetch if younger than this
    gcTime: 5 * 60 * 1000, // 5 minutes - cache garbage collection time
    select: (response) => {
      const rawData = parseMaybeString(response.data?.data, response.data?.data) || [];
      const itemsArray = Array.isArray(rawData) ? rawData : [];

      return {
        items: itemsArray.map(mapInventoryRecord),
        pagination: response.data?.pagination || null,
        raw: response.data,
      };
    },
  });
};

export const useInventoryItem = (productId, options = {}) => {
  return useQuery({
    queryKey: inventoryKeys.detail(productId),
    queryFn: () => inventoryAPI.getByProduct(productId),
    enabled: Boolean(productId) && (options.enabled ?? true),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    select: (response) => {
      const rawRecord = parseMaybeString(response.data?.data, response.data?.data) || null;
      if (!rawRecord) return null;
      return mapInventoryDetail(rawRecord);
    },
  });
};

export const useInventoryMovements = (productId, params = {}, options = {}) => {
  const queryParams = {
    page: params.page ?? 1,
    limit: params.limit ?? 50,
    type: params.type || undefined,
    startDate: params.startDate || undefined,
    endDate: params.endDate || undefined,
  };

  return useQuery({
    queryKey: inventoryKeys.movementList(productId, queryParams),
    queryFn: () => inventoryAPI.getMovements(productId, queryParams),
    enabled: Boolean(productId) && (options.enabled ?? true),
    keepPreviousData: true,
    select: (response) => {
      const rawData = parseMaybeString(response.data?.data, response.data?.data) || [];
      const itemsArray = Array.isArray(rawData) ? rawData : [];

      return {
        items: itemsArray.map(mapMovement),
        pagination: response.data?.pagination || null,
        raw: response.data,
      };
    },
  });
};

export const useLowStockReport = (options = {}) => {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: () => inventoryAPI.getLowStockReport(),
    enabled: options.enabled ?? true,
    select: (response) => {
      const raw = parseMaybeString(response.data?.data, response.data?.data) || [];
      return Array.isArray(raw) ? raw : [];
    },
  });
};

export const useInventoryValuationReport = (options = {}) => {
  return useQuery({
    queryKey: inventoryKeys.valuation(),
    queryFn: () => inventoryAPI.getValuationReport(),
    enabled: options.enabled ?? true,
    select: (response) => {
      const raw = parseMaybeString(response.data?.data, response.data?.data) || {};
      return raw && typeof raw === 'object' ? raw : {};
    },
  });
};

export const useAddStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => inventoryAPI.addStock(payload),
    onSuccess: (response, variables) => {
      toast.success(response.data?.message || 'Stock added successfully');
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      if (variables?.product) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.product) });
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add stock');
    },
  });
};

export const useReduceStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => inventoryAPI.reduceStock(payload),
    onSuccess: (response, variables) => {
      toast.success(response.data?.message || 'Stock reduced successfully');
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      if (variables?.product) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.product) });
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reduce stock');
    },
  });
};

export const useAdjustStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => inventoryAPI.adjustStock(payload),
    onSuccess: (response, variables) => {
      toast.success(response.data?.message || 'Stock adjusted successfully');
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      if (variables?.product) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.product) });
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to adjust stock');
    },
  });
};

export const useTransferStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => inventoryAPI.transferStock(payload),
    onSuccess: (response, variables) => {
      toast.success(response.data?.message || 'Stock transferred successfully');
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      if (variables?.fromProduct) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.fromProduct) });
      }
      if (variables?.toProduct) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.toProduct) });
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to transfer stock');
    },
  });
};

export const useUpdateInventorySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inventoryId, data }) => inventoryAPI.updateSettings(inventoryId, data),
    onSuccess: (response, variables) => {
      toast.success(response.data?.message || 'Inventory settings updated');
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      if (variables?.productId) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.productId) });
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update inventory settings');
    },
  });
};
