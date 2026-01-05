import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buyersAPI } from '../api/endpoints/buyers';
import toast from 'react-hot-toast';

export const buyersKeys = {
  all: ['buyers'],
  lists: () => [...buyersKeys.all, 'list'],
  list: (filters) => [...buyersKeys.lists(), filters],
  details: () => [...buyersKeys.all, 'detail'],
  detail: (id) => [...buyersKeys.details(), id],
};

export const useBuyers = (params = {}) => {
  // Default to only fetch active buyers
  const queryParams = { isActive: true, ...params };

  return useQuery({
    queryKey: buyersKeys.list(queryParams),
    queryFn: () => {
      console.log('useBuyers: Fetching buyers with params:', queryParams);
      return buyersAPI.getAll(queryParams);
    },
    select: (response) => {
      console.log('useBuyers: Raw API response:', response);
      const buyers = response.data?.data || response.data || [];
      console.log("useBuyers: Processed buyers data:", buyers);
      
      // Filter for active buyers only (client-side fallback)
      const activeBuyers = buyers.filter(buyer => {
        // Check common field names for active status
        return buyer.isActive !== false && 
               buyer.active !== false && 
               buyer.status !== 'deleted' && 
               buyer.status !== 'inactive' &&
               !buyer.deleted &&
               !buyer.deletedAt;
      });
      
      console.log("useBuyers: Filtered active buyers:", activeBuyers);
      
      return activeBuyers.map(buyer => ({
        id: buyer._id || buyer.id,
        buyerId: buyer.buyerId,
        name: buyer.name,
        phone: buyer.phone || '',
        email: buyer.email || '',
        address: buyer.address || '',
        customerType: buyer.customerType,
        balance: buyer.balance || buyer.currentBalance || 0, // Use balance from ledger (now synced)
        _original: buyer,
      }));
    },
    refetchOnWindowFocus: true, // Refetch when window regains focus if data is stale
    refetchInterval: false, // Disabled - buyers data doesn't need real-time updates every 15 seconds
    staleTime: 30 * 1000, // Consider data stale after 30 seconds (increased from 5s to reduce unnecessary refetches)
  });
};

export const useBuyer = (id) => {
  return useQuery({
    queryKey: buyersKeys.detail(id),
    queryFn: () => buyersAPI.getById(id),
    enabled: !!id,
    select: (response) => {
      const rawBuyer = response?.data?.data || response?.data || null;
      if (!rawBuyer) return null;

      const transactionSources = [
        rawBuyer.transactions,
        rawBuyer.ledger,
        rawBuyer.history,
        rawBuyer.entries,
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
          txn.debit ?? txn.debitAmount ?? (txn.type === 'sale' ? amount : 0)
        );

        const credit = normalizeAmount(
          txn.credit ?? txn.creditAmount ?? (txn.type === 'payment' ? amount : 0)
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
        id: rawBuyer._id || rawBuyer.id,
        buyerId: rawBuyer.buyerId || rawBuyer.code,
        name: rawBuyer.name,
        company: rawBuyer.company || '',
        phone: rawBuyer.phone || '',
        email: rawBuyer.email || '',
        address: rawBuyer.address || {},
        balance: normalizeAmount(rawBuyer.balance ?? rawBuyer.currentBalance ?? rawBuyer.outstanding ?? rawBuyer.due), // Use balance from ledger (now synced)
        totalSales: normalizeAmount(
          rawBuyer.totalSales ?? rawBuyer.salesTotal ?? rawBuyer.totalInvoices ?? rawBuyer.sales
        ),
        totalPayments: normalizeAmount(
          rawBuyer.totalPayments ?? rawBuyer.paymentsTotal ?? rawBuyer.totalReceived ?? rawBuyer.receipts
        ),
        transactions: normalizedTransactions,
        _original: rawBuyer,
      };
    },
    refetchOnWindowFocus: true, // Refetch when window regains focus if data is stale
    refetchInterval: false, // Disabled - buyer detail data doesn't need real-time updates every 15 seconds
    staleTime: 30 * 1000, // Consider data stale after 30 seconds (increased from 5s to reduce unnecessary refetches)
  });
};

export const useCreateBuyer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (buyerData) => {
      console.log('useCreateBuyer: Creating buyer with data:', buyerData);
      return buyersAPI.create(buyerData);
    },
    onSuccess: (response) => {
      console.log('useCreateBuyer: Success response:', response);
      queryClient.invalidateQueries({ queryKey: buyersKeys.lists() });
      toast.success(response.message || 'Buyer created successfully!');
    },
    onError: (error) => {
      console.error('useCreateBuyer: Error:', error);
      console.error('useCreateBuyer: Error response:', error.response?.data);
    },
  });
};

export const useUpdateBuyer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => buyersAPI.update(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: buyersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: buyersKeys.detail(variables.id) });
      toast.success(response.message || 'Buyer updated successfully!');
    },
  });
};

export const useDeleteBuyer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => {
      console.log('useDeleteBuyer: Deleting buyer with id:', id);
      return buyersAPI.delete(id);
    },
    onSuccess: (response) => {
      console.log('useDeleteBuyer: Success response:', response);
      queryClient.invalidateQueries({ queryKey: buyersKeys.lists() });
      toast.success(response.message || 'Buyer deleted successfully!');
    },
    onError: (error) => {
      console.error('useDeleteBuyer: Error:', error);
      console.error('useDeleteBuyer: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to delete buyer');
    },
  });
};

export const useUpdateBuyerBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount, operation }) => buyersAPI.updateBalance(id, { amount, operation }),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: buyersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: buyersKeys.detail(variables.id) });
      toast.success(response.message || 'Buyer balance updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update balance');
    },
  });
};