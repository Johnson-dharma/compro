import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Users as UsersIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Building,
  Shield,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  Database,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { usersAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn, formatDate } from '@/utils';
import Checkbox from '@/components/ui/Checkbox';
import { ALL_DEPARTMENTS, DEPARTMENT_OPTIONS, DEPARTMENT_FILTER_OPTIONS } from '@/constants/departments';

// Debounce hook
function useDebounce(callback: (...args: any[]) => void, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

type Filters = {
  search: string;
  role: string;
  departments: string[];
  status: string;
  page: number;
  departmentSearch: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

const defaultFilters: Filters = {
  search: '',
  role: '',
  departments: [],
  status: '',
  page: 1,
  departmentSearch: '',
  sortBy: 'name',
  sortOrder: 'asc',
};

// Available departments - now imported from constants

// Client-side export function
const exportUsers = (data: any[], filters: any, format: string) => {
  try {
    // Create CSV content
    const headers = [
      'Name',
      'Email',
      'Role',
      'Department',
      'Status',
      'Email Verified',
      'Last Login',
      'Created At'
    ];

    const csvRows = data.map((user) => {
      const row = [
        user.name || '-',
        user.email || '-',
        user.role === 'admin' ? 'Administrator' : 'Employee',
        user.department || 'Not assigned',
        user.isActive ? 'Active' : 'Inactive',
        user.emailVerified ? 'Yes' : 'No',
        user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never',
        formatDate(user.createdAt)
      ];
      
      // Escape fields that might contain commas
      return row.map(field => `"${field}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename based on filters and format
    let filename = 'users_export';
    if (filters.role) {
      filename += `_${filters.role}`;
    }
    if (filters.departments && filters.departments.length > 0) {
      filename += `_${filters.departments.join('_')}`;
    }
    if (filters.status) {
      filename += `_${filters.status === 'true' ? 'active' : 'inactive'}`;
    }
    filename += `_${new Date().toISOString().split('T')[0]}.${format === 'sql' ? 'sql' : 'csv'}`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
};

const Users: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isDepartmentFilterOpen, setIsDepartmentFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [exportFilters, setExportFilters] = useState({
    format: 'excel',
    role: '',
    department: '',
    startDate: '',
    endDate: ''
  });

  const [filters, setFilters] = useState<Filters>({ ...defaultFilters });
  const [localFilters, setLocalFilters] = useState<Filters>({ ...defaultFilters });

  // Debounced setFilters
  const debouncedSetFilters = useDebounce((newFilters: Filters) => {
    setFilters(newFilters);
  }, 500);

  // Filter departments based on search
  const filteredDepartments = useMemo(() => {
    if (!localFilters.departmentSearch) {
      return ALL_DEPARTMENTS;
    }
    
    const searchTerm = localFilters.departmentSearch.toLowerCase();
    return ALL_DEPARTMENTS.filter(dept => 
      dept.toLowerCase().includes(searchTerm)
    );
  }, [localFilters.departmentSearch]);

  // Build API params
  const buildApiParams = (overrides?: any) => {
    const params: any = {
      page: overrides?.page || filters.page,
      limit: overrides?.limit || 10,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    };

    if (filters.search) params.search = filters.search;
    if (filters.role) params.role = filters.role;
    if (filters.status) params.isActive = filters.status;
    if (filters.departments && filters.departments.length > 0) {
      params.department = filters.departments.join(',');
    }

    return params;
  };

  // Fetch users for table (with pagination)
  const { data: usersData, isLoading, isError, error } = useQuery(
    ['users', filters],
    () => usersAPI.getAll(buildApiParams()),
    {
      keepPreviousData: true,
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 429) return false;
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 30000,
    }
  );

  // Fetch all users for export (sequential pagination - most reliable)
  const fetchAllUsersForExport = async () => {
    try {
      let allUsers: any[] = [];
      let currentPage = 1;
      let totalPages = 1;
      
      console.log('🔄 Starting to fetch all users for export...');

      // Fetch first page to get pagination info
      const firstResponse = await usersAPI.getAll(buildApiParams({ page: 1, limit: 50 }));
      const firstPageData = firstResponse.data;
      
      if (!firstPageData) {
        console.error('❌ No data in first response');
        return [];
      }

      // Get users from first page
      const firstPageUsers = firstPageData.users || [];
      allUsers = [...firstPageUsers];
      
      // Get pagination info
      const pagination = firstPageData.pagination;
      if (pagination && pagination.totalPages) {
        totalPages = pagination.totalPages;
        console.log(`📄 Found ${totalPages} total pages, ${pagination.totalItems || firstPageUsers.length} total users`);
      } else {
        console.log('📄 No pagination info found, checking if there are more users...');
        // If no pagination info, check if we got a full page (might be more data)
        if (firstPageUsers.length === 50) {
          totalPages = 10; // Assume there might be more pages
        } else {
          totalPages = 1;
        }
      }

      // If there are more pages, fetch them sequentially
      if (totalPages > 1) {
        console.log(`🔄 Fetching remaining ${totalPages - 1} pages sequentially...`);
        
        for (let page = 2; page <= totalPages; page++) {
          try {
            setExportProgress({ current: page - 1, total: totalPages });
            
            const response = await usersAPI.getAll(buildApiParams({ page, limit: 50 }));
            const pageData = response.data;
            
            if (!pageData) {
              console.warn(`⚠️ No data in page ${page}, stopping`);
              break;
            }

            const pageUsers = pageData.users || [];
            console.log(`📥 Page ${page}: ${pageUsers.length} users`);
            
            allUsers = [...allUsers, ...pageUsers];
            
            // If we get an empty page or fewer users than limit, we've reached the end
            if (pageUsers.length === 0 || pageUsers.length < 50) {
              console.log(`🏁 Reached end of data at page ${page}`);
              break;
            }
            
          } catch (pageError) {
            console.error(`❌ Error fetching page ${page}:`, pageError);
            break;
          }
        }
      }
      
      console.log(`✅ Successfully fetched ${allUsers.length} total users for export`);
      setExportProgress({ current: 0, total: 0 });
      return allUsers;
    } catch (error) {
      console.error('❌ Failed to fetch all users for export:', error);
      setExportProgress({ current: 0, total: 0 });
      throw error;
    }
  };

  // Enhanced export with fallback - NOW FETCHES ALL PAGES
  const exportUsersAdvanced = async (filters: any, format: string) => {
    try {
      console.log('📤 Starting export with filters:', filters);

      // Try to use the backend export if available
      try {
        if (format === 'excel') {
          await usersAPI.exportToExcel(filters);
        } else if (format === 'csv') {
          await usersAPI.exportToCSV(filters);
        } else {
          // SQL export not implemented, fall back to CSV
          await usersAPI.exportToCSV(filters);
        }
        return true;
      } catch (backendError) {
        console.log('Backend export failed, falling back to client-side export:', backendError);
        
        // Fall back to client-side export - fetch ALL PAGES first
        try {
          const allUsers = await fetchAllUsersForExport();
          console.log(`📥 Fetched ${allUsers.length} users for export`);
          
          if (allUsers.length === 0) {
            window.alert('No users found matching your filters.');
            return false;
          }
          
          return exportUsers(allUsers, filters, format);
        } catch (fetchError) {
          console.error('Failed to fetch users for export:', fetchError);
          window.alert('Failed to fetch users for export. Please try again.');
          return false;
        }
      }
    } catch (error) {
      console.error('Advanced export error:', error);
      window.alert('Export failed. Please try again.');
      return false;
    }
  };

  // Current filtered data for table display only
  const currentUsers = usersData?.data?.users || [];

  // Export function - NOW EXPORTS ALL FILTERED DATA
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress({ current: 0, total: 0 });
    
    try {
      const success = await exportUsersAdvanced(filters, exportFilters.format);
      
      if (success) {
        window.alert(`Export completed successfully!`);
        setIsExportModalOpen(false);
      } else {
        window.alert('Export completed! Check your downloads folder.');
        setIsExportModalOpen(false);
      }
    } catch (error) {
      console.error('Export failed:', error);
      window.alert('Export failed. Please try again or contact support.');
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  // Quick export function (exports ALL filtered data, not just current page)
  const handleQuickExport = async () => {
    const totalFilteredRecords = exportSummary.totalFilteredRecords;
    
    if (!window.confirm(`Export ALL ${totalFilteredRecords} filtered users to CSV? This may take a moment.`)) {
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total: 0 });
    
    try {
      // Fetch all users matching current filters from ALL pages
      const allUsers = await fetchAllUsersForExport();
      
      if (allUsers.length === 0) {
        window.alert('No users found matching your current filters.');
        return;
      }

      console.log(`📊 Exporting ${allUsers.length} users with filters:`, filters);
      
      // Show count comparison
      if (allUsers.length !== totalFilteredRecords) {
        console.warn(`⚠️ Count mismatch: Expected ${totalFilteredRecords}, got ${allUsers.length}`);
      }
      
      const success = exportUsers(allUsers, filters, 'csv');
      
      if (success) {
        window.alert(`Successfully exported ${allUsers.length} users!`);
      } else {
        window.alert('Export completed! Check your downloads folder.');
      }
    } catch (error) {
      console.error('Quick export failed:', error);
      window.alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  // Mutations
  const createUserMutation = useMutation(usersAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setIsCreateModalOpen(false);
      alert('User created successfully!');
    },
    onError: (error: any) => {
      console.error('Create user failed:', error);
      alert('Failed to create user. Please try again.');
    },
  });

  const updateUserMutation = useMutation(
    (data: any) => usersAPI.update(selectedUser?.id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['users']);
        setIsEditModalOpen(false);
        setSelectedUser(null);
        alert('User updated successfully!');
      },
      onError: (error: any) => {
        console.error('Update user failed:', error);
        alert('Failed to update user. Please try again.');
      },
    }
  );

  const deleteUserMutation = useMutation(usersAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      alert('User deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Delete user failed:', error);
      alert('Failed to delete user. Please try again.');
    },
  });

  const updateStatusMutation = useMutation(
    ({ id, isActive }: { id: string; isActive: boolean }) => usersAPI.updateStatus(id, isActive),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['users']);
        alert('User status updated successfully!');
      },
      onError: (error: any) => {
        console.error('Update status failed:', error);
        alert('Failed to update user status. Please try again.');
      },
    }
  );

  // Handlers
  const handleCreate = () => setIsCreateModalOpen(true);

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleView = (user: any) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleStatusToggle = (id: string, currentStatus: boolean) => {
    updateStatusMutation.mutate({ id, isActive: !currentStatus });
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...localFilters, page };
    setLocalFilters(newFilters);
    setFilters(newFilters);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    const newFilters = { ...localFilters, [key]: value, page: 1 };
    setLocalFilters(newFilters);
    
    if (key === 'departmentSearch') {
      // Only update local state for search, don't trigger API call
      setLocalFilters(newFilters);
    } else {
      debouncedSetFilters(newFilters);
    }
  };

  const handleDepartmentFilterChange = (department: string, checked: boolean) => {
    setLocalFilters(prev => {
      const newDepartments = checked 
        ? [...prev.departments, department] 
        : prev.departments.filter(d => d !== department);
      const newFilters = { ...prev, departments: newDepartments, page: 1 };
      debouncedSetFilters(newFilters);
      return newFilters;
    });
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    const newFilters = { ...localFilters, sortBy: column, sortOrder: direction, page: 1 };
    setLocalFilters(newFilters);
    setFilters(newFilters);
  };

  const clearFilters = () => {
    const newFilters = { ...defaultFilters };
    setLocalFilters(newFilters);
    setFilters(newFilters);
  };

  const handleSelectAllDepartments = () => {
    const newFilters = { ...localFilters, departments: ALL_DEPARTMENTS, page: 1 };
    setLocalFilters(newFilters);
    debouncedSetFilters(newFilters);
  };

  const handleClearAllDepartments = () => {
    const newFilters = { ...localFilters, departments: [], page: 1 };
    setLocalFilters(newFilters);
    debouncedSetFilters(newFilters);
  };

  // Generate export summary - NOW SHOWS TOTAL FILTERED COUNT
  const exportSummary = useMemo(() => {
    const totalFilteredRecords = usersData?.data?.pagination?.totalItems || 0;
    const currentPageRecords = currentUsers.length;
    const roleInfo = filters.role ? ` (Role: ${filters.role})` : '';
    const deptInfo = filters.departments.length > 0 ? ` (Departments: ${filters.departments.join(', ')})` : '';
    const statusInfo = filters.status ? ` (Status: ${filters.status === 'true' ? 'Active' : 'Inactive'})` : '';
    
    // Warn if there might be more data than shown
    const hasMoreData = totalFilteredRecords > currentPageRecords;
    
    return {
      totalFilteredRecords,
      description: `Users${roleInfo}${deptInfo}${statusInfo}`,
      currentPageRecords,
      hasMoreData
    };
  }, [usersData?.data?.pagination?.totalItems, currentUsers.length, filters.role, filters.departments, filters.status]);

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            {row.profilePictureUrl ? (
              <img src={row.profilePictureUrl} alt={value} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                {value?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-secondary-900 dark:text-white">{value}</p>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      render: (value: string) => value || 'Not assigned',
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value: string) => (
        <span className={cn('badge', value === 'admin' ? 'badge-warning' : 'badge-success')}>
          {value === 'admin' ? 'Administrator' : 'Employee'}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <span className={cn('badge', value ? 'badge-success' : 'badge-danger')}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'lastLoginAt',
      label: 'Last Login',
      sortable: true,
      render: (value: string) => value ? formatDate(value) : 'Never',
    },
    {
      key: 'createdAt',
      label: 'Joined',
      sortable: true,
      render: (value: string) => formatDate(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '150px',
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleView(row)} className="p-1 text-secondary-500 hover:text-primary-600 transition-colors" title="View Details">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => handleEdit(row)} className="p-1 text-secondary-500 hover:text-warning-600 transition-colors" title="Edit User">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleStatusToggle(row.id, row.isActive)} className={cn('p-1 transition-colors', row.isActive ? 'text-secondary-500 hover:text-danger-600' : 'text-secondary-500 hover:text-success-600')} title={row.isActive ? 'Deactivate User' : 'Activate User'}>
            {row.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </button>
          <button onClick={() => handleDelete(row.id)} className="p-1 text-secondary-500 hover:text-danger-600 transition-colors" title="Delete User">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Users</h1>
          <p className="text-secondary-600 dark:text-secondary-400">Manage system users and employees</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {isError && (
        <div className="card bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <XCircle className="w-5 h-5" />
            <span>{(error as any)?.response?.status === 429 ? 'Too many requests. Please wait a moment.' : 'Error loading users data'}</span>
          </div>
        </div>
      )}

      {/* Export Progress */}
      {isExporting && exportProgress.total > 0 && (
        <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-800 dark:text-blue-200">Exporting Users</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Fetching page {exportProgress.current} of {exportProgress.total}...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { key: 'total', label: 'Total Users', value: usersData?.data?.pagination?.totalItems || 0, icon: UsersIcon, color: 'primary' },
          { key: 'active', label: 'Active Users', value: usersData?.data?.users?.filter((u: any) => u.isActive).length || 0, icon: CheckCircle, color: 'success' },
          { key: 'admins', label: 'Administrators', value: usersData?.data?.users?.filter((u: any) => u.role === 'admin').length || 0, icon: Shield, color: 'warning' },
          { key: 'employees', label: 'Employees', value: usersData?.data?.users?.filter((u: any) => u.role === 'employee').length || 0, icon: Building, color: 'secondary' },
        ].map((stat) => (
          <div key={stat.key} className="stat-card cursor-pointer hover:shadow-lg transition-shadow duration-200" onClick={() => { setSelectedStat(stat.key); setIsStatsModalOpen(true); }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">{stat.label}</p>
                <p className="stat-value">{stat.value}</p>
              </div>
              <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', `bg-${stat.color}-500`)}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Filters</h3>
        
        {/* Main Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input
            label="Search Users"
            name="search"
            placeholder="Search by name or email..."
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <Select
            label="Role"
            name="role"
            options={[
              { value: '', label: 'All Roles' },
              { value: 'admin', label: 'Administrator' },
              { value: 'employee', label: 'Employee' },
            ]}
            value={localFilters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
          />
          <Select
            label="Status"
            name="status"
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
            value={localFilters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          />
        </div>

        {/* Department Filter */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
              Departments
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary-500 dark:text-secondary-400">
                {localFilters.departments.length} of {ALL_DEPARTMENTS.length} selected
              </span>
              <button
                onClick={() => setIsDepartmentFilterOpen(!isDepartmentFilterOpen)}
                className="p-1 text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors"
              >
                {isDepartmentFilterOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isDepartmentFilterOpen && (
            <div className="space-y-3 p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700">
              {/* Department Search */}
              <Input
                label="Search Departments"
                name="departmentSearch"
                placeholder="Type to filter departments..."
                value={localFilters.departmentSearch}
                onChange={(e) => handleFilterChange('departmentSearch', e.target.value)}
                className="mb-2"
              />

              {/* Department Checkboxes */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-48 overflow-y-auto">
                {filteredDepartments.map((dept) => (
                  <Checkbox
                    key={dept}
                    name={`dept-${dept}`}
                    label={dept}
                    checked={localFilters.departments.includes(dept)}
                    onChange={(e) => handleDepartmentFilterChange(dept, e.target.checked)}
                  />
                ))}
                {filteredDepartments.length === 0 && (
                  <div className="col-span-full text-center py-4 text-secondary-500 text-sm">
                    No departments found matching "{localFilters.departmentSearch}"
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2 border-t border-secondary-200 dark:border-secondary-700">
                <Button variant="outline" size="sm" onClick={handleSelectAllDepartments} disabled={localFilters.departments.length === ALL_DEPARTMENTS.length}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearAllDepartments} disabled={localFilters.departments.length === 0}>
                  Clear All
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Filter Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-secondary-200 dark:border-secondary-700">
          <div className="text-sm text-secondary-600 dark:text-secondary-400">
            Showing {currentUsers.length} of {usersData?.data?.pagination?.totalItems || 0} users
            {filters.departments.length > 0 && ` • ${filters.departments.length} departments selected`}
          </div>
          <Button variant="outline" onClick={clearFilters}>
            <Filter className="w-4 h-4 mr-2" />
            Clear All Filters
          </Button>
        </div>
      </div>

      {/* Export Summary */}
      {(filters.role || filters.departments.length > 0 || filters.status) && (
        <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-green-800 dark:text-green-300">Export Ready</h4>
              <p className="text-sm text-green-700 dark:text-green-400">
                {exportSummary.description} - {exportSummary.totalFilteredRecords} total users matching filters
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                {exportSummary.hasMoreData 
                  ? `Export will include ALL ${exportSummary.totalFilteredRecords} users across all pages, not just the ${exportSummary.currentPageRecords} shown.`
                  : `All ${exportSummary.totalFilteredRecords} users are shown on this page.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">User List</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              Page {usersData?.data?.pagination?.currentPage || 1} of {usersData?.data?.pagination?.totalPages || 1}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleQuickExport}
              loading={isExporting}
              disabled={exportSummary.totalFilteredRecords === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export All ({exportSummary.totalFilteredRecords})
            </Button>
          </div>
        </div>

        <Table
          columns={columns}
          data={currentUsers}
          loading={isLoading}
          pagination={usersData?.data?.pagination}
          onPageChange={handlePageChange}
          onSort={handleSort}
          sortColumn={filters.sortBy}
          sortDirection={filters.sortOrder}
        />
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onSubmit={handleExport}
        filters={exportFilters}
        onFiltersChange={setExportFilters}
        isLoading={isExporting}
        totalRecords={exportSummary.totalFilteredRecords}
      />

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => createUserMutation.mutate(data)}
        isLoading={createUserMutation.isLoading}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); }}
        user={selectedUser}
        onSubmit={(data) => updateUserMutation.mutate(data)}
        isLoading={updateUserMutation.isLoading}
      />

      <ViewUserModal
        isOpen={isViewModalOpen}
        onClose={() => { setIsViewModalOpen(false); setSelectedUser(null); }}
        user={selectedUser}
      />

      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => { setIsStatsModalOpen(false); setSelectedStat(null); }}
        statKey={selectedStat}
        usersData={currentUsers}
      />
    </div>
  );
};

// Single ExportModal component (removed duplicate)
const ExportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  filters: any;
  onFiltersChange: (filters: any) => void;
  isLoading: boolean;
  totalRecords: number;
}> = ({ isOpen, onClose, onSubmit, filters, onFiltersChange, isLoading, totalRecords }) => {
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Users" size="md">
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Download className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Export All Filtered Data
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                This will export <strong>{totalRecords} users</strong> matching your current filters. The export includes all pages, not just the current view.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Export Format *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleFilterChange('format', 'excel')}
                className={cn(
                  'flex items-center gap-3 p-3 border rounded-lg transition-all duration-200',
                  filters.format === 'excel'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-400'
                    : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-300 dark:hover:border-primary-600'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  filters.format === 'excel' 
                    ? 'bg-primary-500' 
                    : 'bg-secondary-100 dark:bg-secondary-700'
                )}>
                  <FileText className={cn(
                    'w-5 h-5',
                    filters.format === 'excel' ? 'text-white' : 'text-secondary-600 dark:text-secondary-400'
                  )} />
                </div>
                <div className="text-left">
                  <p className={cn(
                    'font-medium text-sm',
                    filters.format === 'excel' 
                      ? 'text-primary-900 dark:text-primary-100' 
                      : 'text-secondary-900 dark:text-white'
                  )}>
                    Excel File
                  </p>
                  <p className={cn(
                    'text-xs',
                    filters.format === 'excel'
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-secondary-500 dark:text-secondary-400'
                  )}>
                    .xlsx format
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleFilterChange('format', 'csv')}
                className={cn(
                  'flex items-center gap-3 p-3 border rounded-lg transition-all duration-200',
                  filters.format === 'csv'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-400'
                    : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-300 dark:hover:border-primary-600'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  filters.format === 'csv' 
                    ? 'bg-primary-500' 
                    : 'bg-secondary-100 dark:bg-secondary-700'
                )}>
                  <FileText className={cn(
                    'w-5 h-5',
                    filters.format === 'csv' ? 'text-white' : 'text-secondary-600 dark:text-secondary-400'
                  )} />
                </div>
                <div className="text-left">
                  <p className={cn(
                    'font-medium text-sm',
                    filters.format === 'csv' 
                      ? 'text-primary-900 dark:text-primary-100' 
                      : 'text-secondary-900 dark:text-white'
                  )}>
                    CSV File
                  </p>
                  <p className={cn(
                    'text-xs',
                    filters.format === 'csv'
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-secondary-500 dark:text-secondary-400'
                  )}>
                    .csv format
                  </p>
                </div>
              </button>
            </div>
          </div>

          <Select
            label="Filter by Role"
            name="role"
            options={[
              { value: '', label: 'All Roles' },
              { value: 'admin', label: 'Administrator' },
              { value: 'employee', label: 'Employee' },
            ]}
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
          />

          <Select
            label="Filter by Department"
            name="department"
            options={DEPARTMENT_FILTER_OPTIONS}
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              name="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
            <Input
              label="End Date"
              name="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onSubmit}
            loading={isLoading}
            className="flex-1"
            disabled={totalRecords === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export {totalRecords} Users
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Stats Modal Component
const StatsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  statKey: string | null;
  usersData: any[];
}> = ({ isOpen, onClose, statKey, usersData }) => {
  const getFilteredData = () => {
    if (!statKey) return [];
    switch (statKey) {
      case 'total': return usersData;
      case 'active': return usersData.filter((u: any) => u.isActive);
      case 'admins': return usersData.filter((u: any) => u.role === 'admin');
      case 'employees': return usersData.filter((u: any) => u.role === 'employee');
      default: return [];
    }
  };

  const getTitle = () => {
    switch (statKey) {
      case 'total': return 'All Users';
      case 'active': return 'Active Users';
      case 'admins': return 'Administrators';
      case 'employees': return 'Employees';
      default: return 'User Details';
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (value: string) => value },
    { key: 'email', label: 'Email', render: (value: string) => value },
    { key: 'department', label: 'Department', render: (value: string) => value || 'Not assigned' },
    { key: 'role', label: 'Role', render: (value: string) => <span className={cn('badge', value === 'admin' ? 'badge-warning' : 'badge-success')}>{value === 'admin' ? 'Administrator' : 'Employee'}</span> },
    { key: 'isActive', label: 'Status', render: (value: boolean) => <span className={cn('badge', value ? 'badge-success' : 'badge-danger')}>{value ? 'Active' : 'Inactive'}</span> },
  ];

  const filteredData = getFilteredData();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="xl">
      <div className="space-y-4">
        <p className="text-secondary-600 dark:text-secondary-400">Showing {filteredData.length} {statKey === 'total' ? 'users' : statKey}</p>
        <Table columns={columns} data={filteredData} loading={false} />
      </div>
    </Modal>
  );
};

// Create User Modal Component
const CreateUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New User" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Email Address" name="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          <Input label="Password" name="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required placeholder="Enter password (min. 6 characters)" />
          <Select label="Role" name="role" options={[{ value: 'employee', label: 'Employee' }, { value: 'admin', label: 'Administrator' }]} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} required />
        </div>
        <Select label="Department" name="department" options={DEPARTMENT_OPTIONS} value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" variant="primary" loading={isLoading} className="flex-1"><Plus className="w-4 h-4 mr-2" />Create User</Button>
        </div>
      </form>
    </Modal>
  );
};

// Edit User Modal Component
const EditUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, user, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    role: 'employee',
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        department: user.department || '',
        role: user.role || 'employee',
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Select
            label="Role"
            name="role"
            options={[
              { value: 'employee', label: 'Employee' },
              { value: 'admin', label: 'Administrator' },
            ]}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            required
          />
        </div>
        <Select
          label="Department"
          name="department"
          options={DEPARTMENT_OPTIONS}
          value={formData.department}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
        />
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Update User
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// View User Modal Component
const ViewUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: any;
}> = ({ isOpen, onClose, user }) => {
  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Details" size="lg">
      <div className="space-y-6">
        {/* Profile picture and basic info */}
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-2xl font-bold text-primary-700 dark:text-primary-300 mx-auto mb-4">
            {user.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              user.name?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
            {user.name}
          </h3>
          <p className="text-secondary-600 dark:text-secondary-400">
            {user.role === 'admin' ? 'Administrator' : 'Employee'}
          </p>
        </div>

        {/* User details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Email Address
            </label>
            <p className="text-secondary-900 dark:text-white">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Department
            </label>
            <p className="text-secondary-900 dark:text-white">
              {user.department || 'Not assigned'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Account Status
            </label>
            <span className={cn(
              'badge',
              user.isActive ? 'badge-success' : 'badge-danger'
            )}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Email Verification
            </label>
            <span className={cn(
              'badge',
              user.emailVerified ? 'badge-success' : 'badge-warning'
            )}>
              {user.emailVerified ? 'Verified' : 'Unverified'}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Last Login
            </label>
            <p className="text-secondary-900 dark:text-white">
              {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Member Since
            </label>
            <p className="text-secondary-900 dark:text-white">
              {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Users;