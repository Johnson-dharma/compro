import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Clock,
  Camera,
  MapPin,
  Calendar,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceAPI, reportsAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn, formatTime, formatDate, getStatusColor, formatWorkingHours } from '@/utils';
import Checkbox from '@/components/ui/Checkbox';
import CameraCapture from '@/components/ui/CameraCapture';
import { ALL_DEPARTMENTS } from '@/constants/departments';

type SortDirection = 'asc' | 'desc';

type Filters = {
  startDate: string;
  endDate: string;
  departments: string[];
  status: string;
  reportType: string;
  page: number;
  sortColumn: string;
  sortDirection: SortDirection;
  limit?: number;
  departmentSearch: string;
};

const defaultFilters: Filters = {
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
  endDate: new Date().toISOString().split('T')[0],
  departments: [],
  status: '',
  reportType: 'attendance',
  page: 1,
  sortColumn: 'date',
  sortDirection: 'desc',
  limit: 10,
  departmentSearch: ''
};

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

// Available departments - now imported from constants

// Client-side export function
const exportAttendance = (data: any[], filters: Filters, format: string) => {
  try {
    if (!data || data.length === 0) {
      window.alert('No data to export');
      return false;
    }

    console.log(`📊 Exporting ${data.length} filtered records`);

    // Create CSV content
    const headers = [
      'Date',
      'Employee Name',
      'Employee Email',
      'Employee Department',
      'Clock In Time',
      'Clock Out Time',
      'Status',
      'Working Hours',
      'Location Status',
      'Approval Status',
      'Notes'
    ];

    const csvRows = data.map((attendance) => {
      const row = [
        formatDate(attendance.date),
        attendance.user?.name || '-',
        attendance.user?.email || '-',
        attendance.user?.department || '-',
        attendance.clockInTime ? formatTime(attendance.clockInTime) : '-',
        attendance.clockOutTime ? formatTime(attendance.clockOutTime) : '-',
        attendance.status || '-',
        attendance.workingHours ? formatWorkingHours(attendance.workingHours) : '-',
        attendance.locationStatus || '-',
        attendance.approvalStatus || '-',
        attendance.notes || '-'
      ];
      
      return row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename based on filters
    let filename = 'attendance_export';
    if (filters.startDate) {
      filename += `_${filters.startDate}`;
    }
    if (filters.status) {
      filename += `_${filters.status}`;
    }
    if (filters.departments.length > 0) {
      filename += `_${filters.departments.join('_')}`;
    }
    filename += `_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`✅ Successfully exported ${csvRows.length} filtered records`);
    return true;
  } catch (error) {
    console.error('Export error:', error);
    window.alert('Export failed: ' + error);
    return false;
  }
};

const Attendance: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraAction, setCameraAction] = useState<'clockin' | 'clockout'>('clockin');
  const [isAdminReviewOpen, setIsAdminReviewOpen] = useState(false);
  const [isDepartmentFilterOpen, setIsDepartmentFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({ ...defaultFilters });
  const [localFilters, setLocalFilters] = useState<Filters>({ ...defaultFilters });

  // Debounced setFilters
  const debouncedSetFilters = useDebounce((newFilters: Filters) => {
    setFilters(newFilters);
  }, 500);

  const isAdmin = user?.role === 'admin';

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

  // Build API params - SAME for both table and export
  const buildApiParams = (overrides?: Partial<Filters>) => {
    const f = { ...filters, ...(overrides || {}) };
    const params: any = {
      page: f.page,
      limit: f.limit ?? 10
    };

    if (f.startDate) params.startDate = f.startDate;
    if (f.endDate) params.endDate = f.endDate;
    if (f.status) params.status = f.status;
    if (f.departments && f.departments.length > 0) {
      params.departments = f.departments.join(',');
    }
    if (f.sortColumn) {
      const sortFieldMap: Record<string, string> = {
        date: 'date',
        user: 'user.name',
        clockInTime: 'clockInTime',
        clockOutTime: 'clockOutTime',
        status: 'status',
        workingHours: 'workingHours',
        locationStatus: 'locationStatus',
        approvalStatus: 'approvalStatus'
      };
      const backendSortField = sortFieldMap[f.sortColumn] || f.sortColumn;
      params.sortBy = backendSortField;
      params.sortOrder = f.sortDirection;
    }

    return params;
  };

  // Queries
  const {
    data: attendanceStatus,
    isLoading: isStatusLoading,
    isError: isStatusError
  } = useQuery(['attendance-status', user?.id], () => attendanceAPI.getStatus(), {
    refetchInterval: 60_000,
    retry: 1
  });

  const {
    data: attendanceHistory,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    error: historyError
  } = useQuery(['attendance-history', filters], () => attendanceAPI.getHistory(buildApiParams()), {
    keepPreviousData: true,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 429) return false;
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000,
  });

  const {
    data: allAttendances,
    isLoading: isAllLoading,
    isError: isAllError,
    error: allError
  } = useQuery(['all-attendances', filters], () => attendanceAPI.getAll(buildApiParams()), {
    enabled: isAdmin,
    keepPreviousData: true,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 429) return false;
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000,
  });

  // New query for filtered attendance data using reports API
  const {
    data: filteredAttendanceReport,
    isLoading: isFilteredLoading,
    isError: isFilteredError,
    error: filteredError
  } = useQuery(['filtered-attendance-report', filters], () => {
    const apiParams = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      departments: filters.departments.length > 0 ? filters.departments.join(',') : undefined,
      status: filters.status || undefined,
      reportType: filters.reportType
    };
    return reportsAPI.getAttendance(apiParams);
  }, {
    enabled: isAdmin && !!(filters.startDate || filters.endDate || filters.status || filters.departments.length > 0),
    keepPreviousData: true,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 429) return false;
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000,
  });

  const {
    data: pendingAttendances,
    isLoading: isPendingLoading,
    isError: isPendingError
  } = useQuery(['pending-attendances'], () => attendanceAPI.getPending(), {
    enabled: isAdmin,
    refetchInterval: 30_000,
    retry: 1
  });

  // SIMPLE export function - exports ONLY the filtered data from current view
  const handleQuickExport = async () => {
    const currentTableData = getCurrentTableData();
    const totalFilteredRecords = currentTableData.length;
    
    if (totalFilteredRecords === 0) {
      window.alert('No attendance records found matching your filters.');
      return;
    }

    if (!window.confirm(`Export ${totalFilteredRecords} attendance records matching your current filters?`)) {
      return;
    }

    setIsExporting(true);
    
    try {
      console.log(`📊 Exporting ${totalFilteredRecords} filtered records`);
      
      const success = exportAttendance(currentTableData, filters, 'csv');
      
      if (success) {
        window.alert(`Successfully exported ${totalFilteredRecords} attendance records!`);
      } else {
        window.alert('Export completed! Check your downloads folder.');
      }
    } catch (error) {
      console.error('Quick export failed:', error);
      window.alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper function untuk mendapatkan data tabel saat ini
  const getCurrentTableData = () => {
    // Use filtered data if filters are active and we have filtered results
    const hasActiveFilters = filters.startDate || filters.endDate || filters.status || filters.departments.length > 0;
    const currentData = isAdmin 
      ? (hasActiveFilters && filteredAttendanceReport?.data ? filteredAttendanceReport.data : allAttendances?.data)
      : attendanceHistory?.data;
    
    if (!currentData) return [];
    
    let items = currentData.attendances || [];
    
    // Return the exact data shown in table
    return items.map((attendance: any) => ({
      ...attendance,
      workingHours: (typeof attendance.workingHours === 'number' && !isNaN(attendance.workingHours)) 
        ? attendance.workingHours 
        : null
    }));
  };

  // Current data untuk table display
  const hasActiveFilters = filters.startDate || filters.endDate || filters.status || filters.departments.length > 0;
  const currentData = isAdmin 
    ? (hasActiveFilters && filteredAttendanceReport?.data ? filteredAttendanceReport.data : allAttendances?.data)
    : attendanceHistory?.data;
  
  const rows = useMemo(() => {
    return getCurrentTableData();
  }, [currentData, filters.startDate, filters.endDate, filters.status, filters.departments]);

  const isLoading = isAdmin 
    ? (hasActiveFilters ? isFilteredLoading : isAllLoading) 
    : isHistoryLoading;

  // Generate export summary - NOW SHOWS EXACT TABLE COUNT
  const exportSummary = useMemo(() => {
    const currentPageRecords = rows.length;
    const dateRange = filters.startDate && filters.endDate ? ` from ${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}` : '';
    const statusInfo = filters.status ? ` (Status: ${filters.status})` : '';
    const deptInfo = filters.departments.length > 0 ? ` (Departments: ${filters.departments.join(', ')})` : '';
    
    return {
      totalFilteredRecords: currentPageRecords, // Only count what's shown in table
      currentPageRecords,
      description: `Attendance Records${dateRange}${statusInfo}${deptInfo}`
    };
  }, [rows.length, filters.startDate, filters.endDate, filters.status, filters.departments]);

  // Handlers lainnya tetap sama...
  const handleClockIn = () => {
    setCameraAction('clockin');
    setIsCameraOpen(true);
  };

  const handleClockOut = () => {
    setCameraAction('clockout');
    setIsCameraOpen(true);
  };

  const handlePhotoCapture = (photoData: string) => {
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        const payload = {
          photoData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          notes: ''
        };
        if (cameraAction === 'clockin') {
          clockInMutation.mutate(payload);
        } else {
          clockOutMutation.mutate(payload);
        }
      },
      () => {
        const payload = { photoData, notes: '' };
        if (cameraAction === 'clockin') {
          clockInMutation.mutate(payload);
        } else {
          clockOutMutation.mutate(payload);
        }
      },
      { timeout: 5000 }
    );
    setIsCameraOpen(false);
  };

  const handleEdit = (attendance: any) => {
    setSelectedAttendance(attendance);
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) return;
    deleteAttendanceMutation.mutate(id);
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...localFilters, page };
    setLocalFilters(newFilters);
    setFilters(newFilters);
  };

  const handleSort = (column: string) => {
    setLocalFilters(prev => {
      const newFilters = prev.sortColumn === column 
        ? { ...prev, sortDirection: (prev.sortDirection === 'asc' ? 'desc' : 'asc') as SortDirection, page: 1 }
        : { ...prev, sortColumn: column, sortDirection: 'asc' as SortDirection, page: 1 };
      
      debouncedSetFilters(newFilters);
      return newFilters;
    });
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    const newFilters = { ...localFilters, [key]: value, page: 1 };
    setLocalFilters(newFilters);
    
    if (key === 'departmentSearch') {
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

  // Mutations
  const clockInMutation = useMutation(attendanceAPI.clockIn, {
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-status']);
      queryClient.invalidateQueries(['attendance-history']);
      queryClient.invalidateQueries(['pending-attendances']);
      if (isAdmin) queryClient.invalidateQueries(['all-attendances']);
      window.alert('Clock in successful');
    },
    onError: (err: any) => {
      console.error('Clock in failed', err);
      window.alert('Clock in failed. See console for details.');
    }
  });

  const clockOutMutation = useMutation(attendanceAPI.clockOut, {
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-status']);
      queryClient.invalidateQueries(['attendance-history']);
      queryClient.invalidateQueries(['pending-attendances']);
      if (isAdmin) queryClient.invalidateQueries(['all-attendances']);
      window.alert('Clock out successful');
    },
    onError: (err: any) => {
      console.error('Clock out failed', err);
      window.alert('Clock out failed. See console for details.');
    }
  });

  const updateAttendanceMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => attendanceAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['attendance-history']);
        queryClient.invalidateQueries(['all-attendances']);
        setIsEditModalOpen(false);
        setSelectedAttendance(null);
        window.alert('Attendance updated');
      },
      onError: (err: any) => {
        console.error('Update failed', err);
        window.alert('Update failed. See console for details.');
      }
    }
  );

  const deleteAttendanceMutation = useMutation(attendanceAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-history']);
      queryClient.invalidateQueries(['all-attendances']);
      queryClient.invalidateQueries(['pending-attendances']);
      window.alert('Attendance deleted');
    },
    onError: (err: any) => {
      console.error('Delete failed', err);
      window.alert('Delete failed. See console for details.');
    }
  });

  // Table columns (tetap sama)
  const columns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (value: string) => formatDate(value)
    },
    {
      key: 'user',
      label: 'Employee',
      sortable: true,
      render: (value: any) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {value?.name?.charAt(0)?.toUpperCase() ?? '-'}
            </span>
          </div>
          <div>
            <span className="font-medium">{value?.name ?? '-'}</span>
            {value?.department && (
              <span className="text-xs text-secondary-500 dark:text-secondary-400 block">
                {value.department}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'clockInTime',
      label: 'Clock In',
      sortable: true,
      render: (value: string) => (value ? formatTime(value) : '-')
    },
    {
      key: 'clockOutTime',
      label: 'Clock Out',
      sortable: true,
      render: (value: string) => (value ? formatTime(value) : '-')
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => <span className={cn('badge', `badge-${getStatusColor(value)}`)}>{value ?? '-'}</span>
    },
    {
      key: 'workingHours',
      label: 'Hours',
      sortable: true,
      render: (value: any) => (value ? formatWorkingHours(value) : '-')
    },
    {
      key: 'locationStatus',
      label: 'Location',
      sortable: true,
      render: (value: string) => (
        <span className={cn('badge', value === 'valid' ? 'badge-success' : value === 'remote' ? 'badge-warning' : 'badge-danger')}>
          {value === 'valid' ? 'Office' : value === 'remote' ? 'Remote' : 'Invalid'}
        </span>
      )
    },
    {
      key: 'approvalStatus',
      label: 'Approval',
      sortable: true,
      render: (value: string) => (
        <span className={cn('badge', value === 'approved' ? 'badge-success' : value === 'rejected' ? 'badge-danger' : 'badge-warning')}>
          {value === 'approved' ? 'Approved' : value === 'rejected' ? 'Rejected' : 'Pending'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '140px',
      sortable: false,
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
          {!isAdmin && row.user?.id === user?.id && (
            <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
          )}
          {isAdmin && (
            <button
              onClick={() => handleDelete(row.id)}
              className="p-1 text-secondary-500 hover:text-danger-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Attendance</h1>
          <p className="text-secondary-600 dark:text-secondary-400">Manage your attendance records</p>
        </div>

        <div className="flex items-center gap-3">
          {!isAdmin && (
            <>
              {(attendanceStatus?.data?.status === 'not_started' || attendanceStatus?.data?.status === 'clocked_out') ? (
                <Button variant="primary" onClick={handleClockIn} loading={clockInMutation.isLoading}>
                  <Camera className="w-4 h-4 mr-2" /> Clock In
                </Button>
              ) : (
                <Button variant="secondary" onClick={handleClockOut} loading={clockOutMutation.isLoading}>
                  <Clock className="w-4 h-4 mr-2" /> Clock Out
                </Button>
              )}
            </>
          )}

          {isAdmin && (
            <Button variant="primary" onClick={() => setIsAdminReviewOpen(true)} className="relative">
              <CheckCircle className="w-4 h-4 mr-2" /> Review Pending
              {((pendingAttendances?.data?.pagination?.totalItems ?? (pendingAttendances?.data as any)?.length) || 0) > 0 && (
                <span className="absolute -top-2 -right-2 bg-danger-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {pendingAttendances?.data?.pagination?.totalItems ?? (pendingAttendances?.data as any)?.length}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {(isHistoryError || isAllError) && (
        <div className="card bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span>
              {((isHistoryError ? historyError : allError) as any)?.response?.status === 429 
                ? 'Too many requests. Please wait a moment.' 
                : 'Error loading attendance data'
              }
            </span>
          </div>
        </div>
      )}

      {/* Current Status (employees) */}
      {!isAdmin && attendanceStatus?.data && (
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Current Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-secondary-50 dark:bg-secondary-700">
              <Clock className="w-8 h-8 text-primary-500 mx-auto mb-2" />
              <p className="font-medium text-secondary-900 dark:text-white">
                {attendanceStatus.data.status === 'clocked_in' ? 'Clocked In' : attendanceStatus.data.status === 'clocked_out' ? 'Clocked Out' : 'Not Started'}
              </p>
            </div>

            <div className="text-center p-4 rounded-lg bg-secondary-50 dark:bg-secondary-700">
              <Calendar className="w-8 h-8 text-success-500 mx-auto mb-2" />
              <p className="font-medium text-secondary-900 dark:text-white">
                {attendanceStatus.data.workingHours && typeof attendanceStatus.data.workingHours === 'number'
                  ? formatWorkingHours(attendanceStatus.data.workingHours)
                  : '0h'}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">Working Hours</p>
            </div>

            <div className="text-center p-4 rounded-lg bg-secondary-50 dark:bg-secondary-700">
              <MapPin className="w-8 h-8 text-warning-500 mx-auto mb-2" />
              <p className="font-medium text-secondary-900 dark:text-white">
                {attendanceStatus.data.attendance?.locationStatus === 'valid' ? 'Office' : attendanceStatus.data.attendance?.locationStatus === 'remote' ? 'Remote' : 'Unknown'}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">Location</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
          Attendance Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Input
            label="Start Date"
            name="startDate"
            type="date"
            value={localFilters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
          <Input
            label="End Date"
            name="endDate"
            type="date"
            value={localFilters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
          <Select
            label="Status"
            name="status"
            options={[
              { value: '', label: 'All Status' },
              { value: 'present', label: 'Present' },
              { value: 'late', label: 'Late' },
              { value: 'absent', label: 'Absent' },
              { value: 'remote', label: 'Remote' },
              { value: 'invalid', label: 'Invalid' },
            ]}
            value={localFilters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          />
          <Select
            label="Report Type"
            name="reportType"
            options={[
              { value: 'attendance', label: 'Attendance' },
              { value: 'department', label: 'Department' },
              { value: 'user', label: 'User' },
            ]}
            value={localFilters.reportType}
            onChange={(e) => handleFilterChange('reportType', e.target.value)}
          />
        </div>
        
        {/* Department Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            Departments
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ALL_DEPARTMENTS.map((dept) => (
              <Checkbox
                key={dept}
                name={`dept-${dept}`}
                label={dept}
                checked={localFilters.departments.includes(dept)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setLocalFilters(prev => ({
                      ...prev,
                      departments: [...prev.departments, dept]
                    }));
                    debouncedSetFilters({
                      ...localFilters,
                      departments: [...localFilters.departments, dept],
                      page: 1
                    });
                  } else {
                    setLocalFilters(prev => ({
                      ...prev,
                      departments: prev.departments.filter(d => d !== dept)
                    }));
                    debouncedSetFilters({
                      ...localFilters,
                      departments: localFilters.departments.filter(d => d !== dept),
                      page: 1
                    });
                  }
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              const newFilters = { ...defaultFilters };
              setLocalFilters(newFilters);
              setFilters(newFilters);
            }}
          >
            <Filter className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Filter Summary */}
      {filteredAttendanceReport?.data?.summary && (
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
            Filter Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
              <div className="text-2xl font-bold text-success-600 dark:text-success-400">
                {filteredAttendanceReport.data.summary.present || 0}
              </div>
              <div className="text-sm text-success-600 dark:text-success-400">Present</div>
            </div>
            <div className="text-center p-4 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
              <div className="text-2xl font-bold text-warning-600 dark:text-warning-400">
                {filteredAttendanceReport.data.summary.late || 0}
              </div>
              <div className="text-sm text-warning-600 dark:text-warning-400">Late</div>
            </div>
            <div className="text-center p-4 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
              <div className="text-2xl font-bold text-danger-600 dark:text-danger-400">
                {filteredAttendanceReport.data.summary.absent || 0}
              </div>
              <div className="text-sm text-danger-600 dark:text-danger-400">Absent</div>
            </div>
            <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
              <div className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
                {filteredAttendanceReport.data.summary.total || 0}
              </div>
              <div className="text-sm text-secondary-600 dark:text-secondary-400">Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Export Summary */}
      {(filters.startDate || filters.endDate || filters.status || filters.departments.length > 0) && exportSummary.totalFilteredRecords > 0 && (
        <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-green-800 dark:text-green-300">Export Ready</h4>
              <p className="text-sm text-green-700 dark:text-green-400">
                {exportSummary.description} - {exportSummary.totalFilteredRecords} records matching filters
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                Export will include exactly the {exportSummary.totalFilteredRecords} records shown in the table.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
            {isAdmin ? 'All Attendance Records' : 'Your Attendance History'}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              Page {currentData?.pagination?.currentPage || 1} of {currentData?.pagination?.totalPages || 1}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleQuickExport}
              loading={isExporting}
              disabled={exportSummary.totalFilteredRecords === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export ({exportSummary.totalFilteredRecords})
            </Button>
          </div>
        </div>

        <Table
          columns={columns}
          data={rows}
          loading={isLoading}
          pagination={currentData?.pagination ?? undefined}
          onPageChange={handlePageChange}
          onSort={(columnKey: string) => handleSort(columnKey)}
          sortColumn={localFilters.sortColumn}
          sortDirection={localFilters.sortDirection}
        />
      </div>

      {/* Modals lainnya tetap sama */}
      <CameraCapture 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handlePhotoCapture} 
        title={cameraAction === 'clockin' ? 'Clock In Photo' : 'Clock Out Photo'} 
      />

      <AdminReviewModal
        isOpen={isAdminReviewOpen}
        onClose={() => setIsAdminReviewOpen(false)}
        pendingAttendances={(pendingAttendances?.data as any)?.attendances || (pendingAttendances?.data as any) || []}
        isLoading={isPendingLoading}
        refreshCallbacks={{
          refreshPending: () => queryClient.invalidateQueries(['pending-attendances']),
          refreshAll: () => queryClient.invalidateQueries(['all-attendances']),
          refreshHistory: () => queryClient.invalidateQueries(['attendance-history'])
        }}
      />

      <EditAttendanceModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAttendance(null);
        }}
        attendance={selectedAttendance}
        onSave={(data: any) => {
          if (!selectedAttendance?.id) return window.alert('No attendance selected');
          updateAttendanceMutation.mutate({ id: selectedAttendance.id, data });
        }}
        loading={updateAttendanceMutation.isLoading}
      />
    </div>
  );
};

// Komponen modal lainnya tetap sama...
// AdminReviewModal, EditAttendanceModal, dll.

const AdminReviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  pendingAttendances: any[];
  isLoading: boolean;
  refreshCallbacks?: {
    refreshPending?: () => void;
    refreshAll?: () => void;
    refreshHistory?: () => void;
  };
}> = ({ isOpen, onClose, pendingAttendances, isLoading, refreshCallbacks }) => {
  const queryClient = useQueryClient();
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [currentPhotoType, setCurrentPhotoType] = useState<'clockin' | 'clockout'>('clockin');
  const [photoData, setPhotoData] = useState<string>('');

  const approveMutation = useMutation(
    ({ id, approvalStatus, approvalNotes }: { id: string; approvalStatus: 'approved' | 'rejected'; approvalNotes?: string }) =>
      attendanceAPI.approve(id, { approvalStatus, approvalNotes }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pending-attendances']);
        queryClient.invalidateQueries(['all-attendances']);
        queryClient.invalidateQueries(['attendance-history']);
        setSelectedAttendance(null);
        setReviewNotes('');
        setPhotoData('');
        refreshCallbacks?.refreshPending?.();
        refreshCallbacks?.refreshAll?.();
        refreshCallbacks?.refreshHistory?.();
        window.alert('Decision saved');
      },
      onError: (err: any) => {
        console.error('Approval failed', err);
        window.alert('Approval failed. See console for details.');
      }
    }
  );

  const getPhotoMutation = useMutation(
    ({ id, type }: { id: string; type: 'clockin' | 'clockout' }) => attendanceAPI.getPhoto(id, type),
    {
      onSuccess: (res: any) => {
        const photo = res?.data?.photoData ?? res?.photoData ?? null;
        if (!photo) {
          window.alert('No photo data returned');
          return;
        }
        setPhotoData(photo);
      },
      onError: (err: any) => {
        console.error('Get photo failed', err);
        window.alert('Failed to fetch photo. See console for details.');
      }
    }
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedAttendance(null);
      setPhotoData('');
      setReviewNotes('');
      setReviewAction('approved');
    }
  }, [isOpen]);

  const handleViewPhoto = (attendance: any, type: 'clockin' | 'clockout') => {
    setSelectedAttendance(attendance);
    setCurrentPhotoType(type);
    setPhotoData('');
    getPhotoMutation.mutate({ id: attendance.id, type });
  };

  const handleApproveClick = () => {
    if (!selectedAttendance?.id) {
      window.alert('Please select a pending attendance first');
      return;
    }
    approveMutation.mutate({ id: selectedAttendance.id, approvalStatus: reviewAction, approvalNotes: reviewNotes?.trim() || undefined });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Pending Attendance" size="xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-96">
        {/* Left: Pending List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Pending Submissions ({pendingAttendances?.length ?? 0})</h3>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          ) : pendingAttendances?.length === 0 ? (
            <div className="text-center py-8 text-secondary-500">No pending submissions</div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {pendingAttendances.map((attendance) => (
                <div
                  key={attendance.id}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedAttendance?.id === attendance.id ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/20' : 'border-secondary-200 hover:border-secondary-300 dark:border-secondary-700'
                  )}
                  onClick={() => setSelectedAttendance(attendance)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-secondary-900 dark:text-white">{attendance.user?.name}</p>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">{formatDate(attendance.date)}</p>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">
                        {attendance.clockInTime ? formatTime(attendance.clockInTime) : '-'}
                        {attendance.clockOutTime ? ` - ${formatTime(attendance.clockOutTime)}` : ''}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {attendance.hasClockInPhoto && (
                        <Button size="sm" variant="outline" onClick={() => { handleViewPhoto(attendance, 'clockin'); }}>
                          📷 In
                        </Button>
                      )}
                      {attendance.hasClockOutPhoto && (
                        <Button size="sm" variant="outline" onClick={() => { handleViewPhoto(attendance, 'clockout'); }}>
                          📷 Out
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Photo Review & Actions */}
        <div className="space-y-4">
          {selectedAttendance ? (
            <>
              <div>
                <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">{selectedAttendance.user?.name} - {formatDate(selectedAttendance.date)}</h4>

                {photoData ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <img src={photoData} alt={`${currentPhotoType} photo`} className="w-full max-h-64 object-cover rounded-lg border" />
                      <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                        {currentPhotoType === 'clockin' ? 'Clock In' : 'Clock Out'}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Button variant={reviewAction === 'approved' ? 'primary' : 'outline'} onClick={() => setReviewAction('approved')} size="sm">
                          <CheckCircle className="w-4 h-4 mr-2" /> Approve
                        </Button>
                        <Button variant={reviewAction === 'rejected' ? 'primary' : 'outline'} onClick={() => setReviewAction('rejected')} size="sm">
                          <XCircle className="w-4 h-4 mr-2" /> Reject
                        </Button>
                      </div>

                      <Input name="reviewNotes" label="Notes (optional)" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Add notes for your decision..." />

                      <Button variant="primary" onClick={handleApproveClick} loading={approveMutation.isLoading} className="w-full">
                        {reviewAction === 'approved' ? 'Approve' : 'Reject'} Attendance
                      </Button>
                    </div>
                  </div>
                ) : getPhotoMutation.isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="text-center py-8 text-secondary-500">Select a photo button to view</div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-secondary-500">Select an attendance record to review</div>
          )}
        </div>
      </div>
    </Modal>
  );
};

const EditAttendanceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  attendance: any;
  onSave: (data: any) => void;
  loading: boolean;
}> = ({ isOpen, onClose, attendance, onSave, loading }) => {
  const [formData, setFormData] = useState({
    clockInTime: '',
    clockOutTime: '',
    notes: ''
  });

  useEffect(() => {
    if (attendance) {
      setFormData({
        clockInTime: attendance.clockInTime || '',
        clockOutTime: attendance.clockOutTime || '',
        notes: attendance.notes || ''
      });
    } else {
      setFormData({ clockInTime: '', clockOutTime: '', notes: '' });
    }
  }, [attendance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clockInTime && !formData.clockOutTime) {
      if (!window.confirm('You are saving without any clock in/out times. Proceed?')) return;
    }
    onSave(formData);
  };

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Attendance Record" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="clockInTime" label="Clock In Time" type="time" value={formData.clockInTime} onChange={(e) => handleChange('clockInTime', e.target.value)} />
        <Input name="clockOutTime" label="Clock Out Time" type="time" value={formData.clockOutTime} onChange={(e) => handleChange('clockOutTime', e.target.value)} />
        <Input name="notes" label="Notes" type="text" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Additional notes..." />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit" loading={loading}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
};

export default Attendance;