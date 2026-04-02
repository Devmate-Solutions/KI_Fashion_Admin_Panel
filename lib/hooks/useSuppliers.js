import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersAPI } from '../api/endpoints/suppliers';
import toast from 'react-hot-toast';

export const suppliersKeys = {
  all: ['suppliers'],
  lists: () => [...suppliersKeys.all, 'list'],
  list: (filters) => [...suppliersKeys.lists(), filters],
  details: () => [...suppliersKeys.all, 'detail'],
  detail: (id) => [...suppliersKeys.details(), id],
  deleteSummary: (id) => [...suppliersKeys.detail(id), 'delete-summary'],
};

export const useSuppliers = (params = {}) => {
  // Default to only fetch active suppliers with user accounts
  const queryParams = { isActive: true, hasUser: true, ...params };

  return useQuery({
    queryKey: suppliersKeys.list(queryParams),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // 60 seconds polling
    queryFn: () => {
       
      return suppliersAPI.getAll(queryParams);
    },
    select: (response) => {
       
      const suppliers = response.data?.data || response.data || [];
       

      // Filter for active suppliers with user accounts (client-side fallback)
      const activeSuppliers = suppliers.filter(supplier => {
        // Check common field names for active status
        const isActive = supplier.isActive !== false &&
          supplier.active !== false &&
          supplier.status !== 'deleted' &&
          supplier.status !== 'inactive' &&
          !supplier.deleted &&
          !supplier.deletedAt;

        // Check if supplier has user account (userInfo populated by backend)
        const hasUserAccount = supplier.userInfo && supplier.userInfo._id;

        return isActive && hasUserAccount;
      });

       

      return activeSuppliers.map(supplier => ({
        id: supplier._id || supplier.id,
        supplierId: supplier.supplierId,
        name: supplier.name,
        company: supplier.company || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        supplierType: supplier.supplierType,
        balance: supplier.balance || 0,
        userId: supplier.userInfo?._id,
        userInfo: supplier.userInfo,
        legacyId: supplier.metadata?.legacyId || supplier.legacyId || '',
        _original: supplier,
      }));
    },
  });
};

// Add new hook for all suppliers (including those without user accounts)
export const useAllSuppliers = (params = {}) => {
  const queryParams = { isActive: true, ...params };

  return useQuery({
    queryKey: ['suppliers', 'all', queryParams],
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 60 seconds polling
    queryFn: () => suppliersAPI.getAll(queryParams),
    select: (response) => {
      const suppliers = response.data?.data || response.data || [];

      const activeSuppliers = suppliers.filter(supplier => {
        return supplier.isActive !== false &&
          supplier.active !== false &&
          supplier.status !== 'deleted' &&
          supplier.status !== 'inactive' &&
          !supplier.deleted &&
          !supplier.deletedAt;
      });

      return activeSuppliers.map(supplier => ({
        id: supplier._id || supplier.id,
        supplierId: supplier.supplierId,
        name: supplier.name,
        company: supplier.company || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        supplierType: supplier.supplierType,
        balance: supplier.balance || 0,
        legacyId: supplier.metadata?.legacyId || supplier.legacyId || '',
        _original: supplier,
      }));
    },
  });
};

export const useSupplier = (id) => {
  return useQuery({
    queryKey: suppliersKeys.detail(id),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 60 seconds polling
    queryFn: () => suppliersAPI.getById(id),
    enabled: !!id,
    select: (response) => {
      const rawSupplier = response?.data?.data || response?.data || null;
      if (!rawSupplier) return null;

      const transactionSources = [
        rawSupplier.transactions,
        rawSupplier.ledger,
        rawSupplier.history,
        rawSupplier.entries,
      ];

      const transactions = transactionSources.find(Array.isArray) || [];

      const normalizeAmount = (value) => {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return 0;
        return Number(value);
      };

      const normalizedTransactions = transactions.map((txn) => {
        const amount = normalizeAmount(
          txn.amount ?? txn.total ?? txn.value ?? txn.debit ?? txn.credit ?? 0
        );

        const debit = normalizeAmount(
          txn.debit ?? txn.debitAmount ?? (txn.type === 'payment' ? amount : 0)
        );

        const credit = normalizeAmount(
          txn.credit ?? txn.creditAmount ?? (txn.type === 'purchase' ? amount : 0)
        );

        return {
          id: txn._id || txn.id,
          date: txn.date || txn.transactionDate || txn.createdAt || txn.updatedAt || null,
          type: txn.type || txn.transactionType || txn.kind || '',
          description: txn.description || txn.notes || txn.remark || '-',
          debit,
          credit,
          amount,
          balance: normalizeAmount(
            txn.balance ?? txn.runningBalance ?? txn.remainingBalance ?? txn.outstanding ?? 0
          ),
          reference: txn.reference || txn.referenceNumber || txn.ref || '',
          raw: txn,
        };
      });

      return {
        id: rawSupplier._id || rawSupplier.id,
        supplierId: rawSupplier.supplierId || rawSupplier.code,
        name: rawSupplier.name,
        company: rawSupplier.company || '',
        phone: rawSupplier.phone || '',
        email: rawSupplier.email || '',
        address: rawSupplier.address || {},
        balance: normalizeAmount(
          rawSupplier.balance ?? rawSupplier.outstanding ?? rawSupplier.payable
        ),
        totalPurchases: normalizeAmount(
          rawSupplier.totalPurchases ?? rawSupplier.purchasesTotal ?? rawSupplier.totalInvoices ?? rawSupplier.purchases
        ),
        totalPayments: normalizeAmount(
          rawSupplier.totalPayments ?? rawSupplier.paymentsTotal ?? rawSupplier.totalPaid ?? rawSupplier.payments
        ),
        transactions: normalizedTransactions,
        _original: rawSupplier,
      };
    },
  });
};

export const useSupplierDeleteSummary = (id, enabled = true) => {
  return useQuery({
    queryKey: suppliersKeys.deleteSummary(id),
    queryFn: () => suppliersAPI.getDeleteSummary(id),
    enabled: Boolean(id) && enabled,
    select: (response) => response?.data?.data || response?.data || null,
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (supplierData) => {
       
      return suppliersAPI.create(supplierData);
    },
    onSuccess: (response) => {
       
      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
      toast.success(response.message || 'Supplier created successfully!');
    },
    onError: (error) => {
      console.error('useCreateSupplier: Error:', error);
      console.error('useCreateSupplier: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to create supplier');
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => {
       
      return suppliersAPI.update(id, data);
    },
    onSuccess: (response, variables) => {
       
      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: suppliersKeys.detail(variables.id) });
      toast.success(response.message || 'Supplier updated successfully!');
    },
    onError: (error) => {
      console.error('useUpdateSupplier: Error:', error);
      console.error('useUpdateSupplier: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update supplier');
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => {
       
      return suppliersAPI.delete(id);
    },
    onSuccess: (response) => {
       
      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
      toast.success(response.message || 'Supplier deleted successfully!');
    },
    onError: (error) => {
      console.error('useDeleteSupplier: Error:', error);
      console.error('useDeleteSupplier: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to delete supplier');
    },
  });
};

export const useHardDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => suppliersAPI.hardDelete(id),
    onSuccess: (response, supplierId) => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.all });
      queryClient.removeQueries({ queryKey: suppliersKeys.detail(supplierId) });
      queryClient.removeQueries({ queryKey: suppliersKeys.deleteSummary(supplierId) });
      queryClient.invalidateQueries({ queryKey: ['users'] });

      const deletedSupplierName = response?.data?.data?.supplier?.name;
      toast.success(
        deletedSupplierName
          ? `Supplier ${deletedSupplierName} deleted successfully!`
          : response?.data?.message || 'Supplier deleted successfully!'
      );
    },
    onError: (error) => {
      console.error('useHardDeleteSupplier: Error:', error);
      console.error('useHardDeleteSupplier: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to permanently delete supplier');
    },
  });
};

export const useUpdateSupplierBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount, operation }) => suppliersAPI.updateBalance(id, { amount, operation }),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: suppliersKeys.detail(variables.id) });
      toast.success(response.message || 'Supplier balance updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update balance');
    },
  });
};