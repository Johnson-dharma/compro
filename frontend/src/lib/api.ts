import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '@/types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generic API functions for file downloads
const downloadFile = async (url: string, filename: string, responseType: 'blob' | 'arraybuffer' = 'blob') => {
  const response = await api.get(url, { responseType });
  
  const blob = new Blob([response.data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
  
  return response.data;
};

// Auth API
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post<ApiResponse<{ user: any; token: string }>>('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: any) => {
    const response = await api.post<ApiResponse<{ user: any; token: string }>>('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get<ApiResponse<{ user: any }>>('/auth/me');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (data: { token: string; password: string }) => {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/reset-password', data);
    return response.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/change-password', data);
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getAll: async (params?: any) => {
    const response = await api.get<ApiResponse<{ users: any[]; pagination: any }>>('/users', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<{ user: any }>>(`/users/${id}`);
    return response.data;
  },

  create: async (userData: any) => {
    const response = await api.post<ApiResponse<{ user: any; tempPassword: string; message: string }>>('/users', userData);
    return response.data;
  },

  update: async (id: string, userData: any) => {
    const response = await api.put<ApiResponse<{ user: any; message: string }>>(`/users/${id}`, userData);
    return response.data;
  },

  updateProfilePicture: async (id: string, photoUrl: string) => {
    const response = await api.put<ApiResponse<{ user: any; message: string }>>(`/users/${id}/profile-picture`, { photoUrl });
    return response.data;
  },

  updateStatus: async (id: string, isActive: boolean) => {
    const response = await api.patch<ApiResponse<{ user: any; message: string }>>(`/users/${id}/status`, { isActive });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/users/${id}`);
    return response.data;
  },

  getStats: async (id: string, params?: any) => {
    const response = await api.get<ApiResponse<{ stats: any }>>(`/users/${id}/stats`, { params });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get<ApiResponse<{ user: any }>>('/users/profile/me');
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.put<ApiResponse<{ user: any; message: string }>>('/users/profile/me', data);
    return response.data;
  },

  // EXPORT METHODS
  exportToExcel: async (filters?: any) => {
    const params = new URLSearchParams({ format: 'excel', ...filters });
    return downloadFile(`/users/export?${params}`, `users_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  exportToCSV: async (filters?: any) => {
    const params = new URLSearchParams({ format: 'csv', ...filters });
    return downloadFile(`/users/export?${params}`, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
  },
};

// Attendance API
export const attendanceAPI = {
  clockIn: async (data: any) => {
    const response = await api.post<ApiResponse<{ attendance: any; message: string }>>('/attendance/clock-in', data);
    return response.data;
  },

  clockOut: async (data: any) => {
    const response = await api.post<ApiResponse<{ attendance: any; workingHours: number; message: string }>>('/attendance/clock-out', data);
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get<ApiResponse<{ status: string; attendance?: any; workingHours?: number }>>('/attendance/status');
    return response.data;
  },

  getHistory: async (params?: any) => {
    const response = await api.get<ApiResponse<{ attendances: any[]; pagination: any }>>('/attendance/history', { params });
    return response.data;
  },

  getAll: async (params?: any) => {
    const response = await api.get<ApiResponse<{ attendances: any[]; pagination: any }>>('/attendance/all', { params });
    return response.data;
  },

  getPending: async (params?: any) => {
    const response = await api.get<ApiResponse<{ attendances: any[]; pagination: any }>>('/attendance/pending', { params });
    return response.data;
  },

  getPhoto: async (id: string, type: 'clockin' | 'clockout') => {
    const response = await api.get<ApiResponse<{ photoData: string; type: string; attendanceId: string }>>(`/attendance/${id}/photo/${type}`);
    return response.data;
  },

  approve: async (id: string, data: { approvalStatus: 'approved' | 'rejected'; approvalNotes?: string }) => {
    const response = await api.put<ApiResponse<{ attendance: any; message: string }>>(`/attendance/${id}/approval`, data);
    return response.data;
  },

  createManual: async (data: any) => {
    const response = await api.post<ApiResponse<{ attendance: any; message: string }>>('/attendance/manual', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put<ApiResponse<{ attendance: any; message: string }>>(`/attendance/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/attendance/${id}`);
    return response.data;
  },

  // Export methods for attendance
  exportToExcel: async (filters?: any) => {
    const params = new URLSearchParams({ format: 'excel', ...filters });
    return downloadFile(`/attendance/export?${params}`, `attendance_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  exportToCSV: async (filters?: any) => {
    const params = new URLSearchParams({ format: 'csv', ...filters });
    return downloadFile(`/attendance/export?${params}`, `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
  },
};


// Settings API
export const settingsAPI = {
  getAll: async (params?: any) => {
    const response = await api.get<ApiResponse<{ settings: any[] }>>('/settings', { params });
    return response.data;
  },

  getByKey: async (key: string) => {
    const response = await api.get<ApiResponse<{ setting: any }>>(`/settings/${key}`);
    return response.data;
  },

  update: async (key: string, data: any) => {
    const response = await api.put<ApiResponse<{ setting: any; message: string }>>(`/settings/${key}`, data);
    return response.data;
  },

  delete: async (key: string) => {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/settings/${key}`);
    return response.data;
  },

  getPublicAttendanceSettings: async () => {
    const response = await api.get<ApiResponse<{ settings: any }>>('/settings/attendance/public');
    return response.data;
  },
};

// Reports API
export const reportsAPI = {
  getDashboard: async () => {
    const response = await api.get<ApiResponse<{ today: any; week: any; totalUsers: number; totalEmployees: number; recentAttendances: any[]; departmentStats: any }>>('/reports/dashboard');
    return response.data;
  },

  getAttendance: async (params?: any) => {
    const response = await api.get<ApiResponse<{ attendances: any[]; summary: any; pagination: any }>>('/reports/attendance', { params });
    return response.data;
  },

  getUser: async (userId: string, params?: any) => {
    const response = await api.get<ApiResponse<{ userId: string; user: any; stats: any; dailyBreakdown: any[]; attendances: any[] }>>(`/reports/user/${userId}`, { params });
    return response.data;
  },

  getDepartment: async (department: string, params?: any) => {
    const response = await api.get<ApiResponse<{ department: string; stats: any; userBreakdown: any[]; attendances: any[] }>>(`/reports/department/${department}`, { params });
    return response.data;
  },


  // Export methods for reports
  exportAttendanceReport: async (params?: any) => {
    const queryParams = new URLSearchParams({ format: 'excel', ...params });
    return downloadFile(`/reports/attendance/export?${queryParams}`, `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  exportUserReport: async (userId: string, params?: any) => {
    const queryParams = new URLSearchParams({ format: 'excel', ...params });
    return downloadFile(`/reports/user/${userId}/export?${queryParams}`, `user_report_${userId}_${new Date().toISOString().split('T')[0]}.xlsx`);
  },
};

// Utility functions
export const downloadCSV = async (url: string, filename: string) => {
  return downloadFile(url, filename, 'blob');
};

export const downloadExcel = async (url: string, filename: string) => {
  return downloadFile(url, filename, 'blob');
};

// Generic export function
export const exportData = {
  users: usersAPI.exportToExcel,
  attendance: attendanceAPI.exportToExcel,
  reports: reportsAPI.exportAttendanceReport,
};

export default api;