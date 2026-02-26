import { useQuery } from '@tanstack/react-query';
import { usersAPI } from '../api/endpoints/users';

export const supplierUsersKeys = {
  all: ['supplier-users'],
  lists: () => [...supplierUsersKeys.all, 'list'],
  list: (filters) => [...supplierUsersKeys.lists(), filters],
  details: () => [...supplierUsersKeys.all, 'detail'],
  detail: (id) => [...supplierUsersKeys.details(), id],
};

export const useSupplierUsers = (params = {}) => {
  return useQuery({
    queryKey: supplierUsersKeys.list(params),
    queryFn: () => {
       
      return usersAPI.getSuppliers(params);
    },
    select: (response) => {
       
      const users = response.data?.data || response.data || [];
       

      // Filter for active supplier users
      const activeSupplierUsers = users.filter(user => {
        return user.role === 'supplier' && 
               user.isActive !== false &&
               user.supplier; // Must have supplier profile linked
      });

       

      return activeSupplierUsers.map(user => ({
        id: user._id || user.id,
        userId: user._id || user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        supplierId: user.supplier?._id || user.supplier,
        supplierProfile: user.supplier,
        company: user.supplier?.company || user.supplier?.name || '',
        // For compatibility with existing buying form
        _original: user,
      }));
    },
  });
};
