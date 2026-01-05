import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logisticsCompaniesAPI } from '../api/endpoints/logisticsCompanies';
import toast from 'react-hot-toast';

export const logisticsCompaniesKeys = {
  all: ['logisticsCompanies'],
  lists: () => [...logisticsCompaniesKeys.all, 'list'],
  list: (filters) => [...logisticsCompaniesKeys.lists(), filters],
  details: () => [...logisticsCompaniesKeys.all, 'detail'],
  detail: (id) => [...logisticsCompaniesKeys.details(), id],
};

export const useLogisticsCompanies = (params = {}) => {
  return useQuery({
    queryKey: logisticsCompaniesKeys.list(params),
    queryFn: () => {
      console.log('useLogisticsCompanies: Fetching logistics companies with params:', params);
      return logisticsCompaniesAPI.getAll(params);
    },
    select: (response) => {
      console.log('useLogisticsCompanies: Raw API response:', response);
      const companies = response.data?.data || response.data || [];
      console.log("useLogisticsCompanies: Processed companies data:", companies);

      return companies.map(company => ({
        id: company._id || company.id,
        name: company.name,
        contactPerson: company.contactPerson || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
        status: company.status || 'active',
        _original: company,
      }));
    },
  });
};

export const useLogisticsCompany = (id) => {
  return useQuery({
    queryKey: logisticsCompaniesKeys.detail(id),
    queryFn: () => logisticsCompaniesAPI.getById(id),
    enabled: !!id,
    select: (response) => {
      const company = response?.data?.data || response?.data || null;
      if (!company) return null;

      return {
        id: company._id || company.id,
        name: company.name,
        contactPerson: company.contactPerson || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
        status: company.status || 'active',
        _original: company,
      };
    },
  });
};

export const useCreateLogisticsCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyData) => logisticsCompaniesAPI.create(companyData),
    onSuccess: (response) => {
      queryClient.invalidateQueries(logisticsCompaniesKeys.lists());
      toast.success('Logistics company created successfully');
      return response;
    },
    onError: (error) => {
      console.error('Error creating logistics company:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create logistics company');
    },
  });
};

export const useUpdateLogisticsCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...companyData }) => logisticsCompaniesAPI.update(id, companyData),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries(logisticsCompaniesKeys.lists());
      queryClient.invalidateQueries(logisticsCompaniesKeys.detail(variables.id));
      toast.success('Logistics company updated successfully');
      return response;
    },
    onError: (error) => {
      console.error('Error updating logistics company:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update logistics company');
    },
  });
};

export const useDeleteLogisticsCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => logisticsCompaniesAPI.delete(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries(logisticsCompaniesKeys.lists());
      toast.success('Logistics company deleted successfully');
      return response;
    },
    onError: (error) => {
      console.error('Error deleting logistics company:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to delete logistics company');
    },
  });
};

