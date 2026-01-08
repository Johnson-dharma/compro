import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistance as formatDistanceFns, isToday, isYesterday, parseISO } from 'date-fns';

// Utility function to merge Tailwind classes
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

// Date formatting utilities
export const formatDate = (date: string | Date, formatStr: string = 'MMM dd, yyyy') => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
};

export const formatTime = (date: string | Date, formatStr: string = 'HH:mm') => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
};

export const formatDateTime = (date: string | Date, formatStr: string = 'MMM dd, yyyy HH:mm') => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
};

export const formatRelativeTime = (date: string | Date) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(dateObj)) {
    return 'Today';
  }
  
  if (isYesterday(dateObj)) {
    return 'Yesterday';
  }
  
  return formatDistanceFns(dateObj, new Date(), { addSuffix: true });
};

export const formatWorkingHours = (hours: number): string => {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  
  return `${wholeHours}h ${minutes}m`;
};

// Status utilities
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'present':
      return 'success';
    case 'late':
      return 'warning';
    case 'absent':
      return 'danger';
    case 'remote':
      return 'secondary';
    case 'invalid':
      return 'danger';
    default:
      return 'secondary';
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'present':
      return 'Present';
    case 'late':
      return 'Late';
    case 'absent':
      return 'Absent';
    case 'remote':
      return 'Remote';
    case 'invalid':
      return 'Invalid';
    default:
      return status;
  }
};

export const getLocationStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'valid':
      return 'success';
    case 'invalid':
      return 'danger';
    case 'remote':
      return 'warning';
    default:
      return 'secondary';
  }
};

export const getLocationStatusLabel = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'valid':
      return 'Valid Location';
    case 'invalid':
      return 'Invalid Location';
    case 'remote':
      return 'Remote Work';
    default:
      return status;
  }
};

// Role utilities
export const getRoleLabel = (role: string): string => {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'Administrator';
    case 'employee':
      return 'Employee';
    default:
      return role;
  }
};

export const getRoleColor = (role: string): string => {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'primary';
    case 'employee':
      return 'secondary';
    default:
      return 'secondary';
  }
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// File utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const compressImage = async (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      const { width, height } = img;
      
      if (width <= maxWidth) {
        resolve(file);
        return;
      }
      
      const ratio = maxWidth / width;
      canvas.width = maxWidth;
      canvas.height = height * ratio;
      
      ctx.drawImage(img, 0, 0, maxWidth, height * ratio);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Location utilities
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  
  return `${(distance / 1000).toFixed(1)}km`;
};

// Array utilities
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Number utilities
export const formatNumber = (num: number, decimals: number = 0): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

// Color utilities
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

export const getContrastColor = (hexColor: string): string => {
  const { r, g, b } = hexToRgb(hexColor);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

// Storage utilities
export const setLocalStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting localStorage:', error);
  }
};

export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error getting localStorage:', error);
    return defaultValue;
  }
};

export const removeLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing localStorage:', error);
  }
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Random utilities
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const randomColor = (): string => {
  const colors = [
    '#007BFF', '#28a745', '#ffc107', '#dc3545', '#6c757d',
    '#17a2b8', '#fd7e14', '#6f42c1', '#e83e8c', '#20c997'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Time utilities
export const isWorkingHours = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  const day = date.getDay();
  
  // Monday to Friday, 9 AM to 6 PM
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
};

export const getTimeUntilNextDay = (): string => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
};
