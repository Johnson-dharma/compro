// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  profilePictureUrl?: string;
  department?: string;
  isActive: boolean;
  lastLoginAt?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreate {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
  department?: string;
}

export interface UserUpdate {
  name?: string;
  department?: string;
  role?: 'admin' | 'employee';
}

// Attendance types
export interface Attendance {
  id: string;
  userId: string;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  clockInPhotoUrl?: string;
  clockOutPhotoUrl?: string;
  clockInLocation?: Location;
  clockOutLocation?: Location;
  status: 'present' | 'absent' | 'late' | 'remote' | 'invalid';
  locationStatus: 'valid' | 'invalid' | 'remote';
  notes?: string;
  isManualEntry: boolean;
  manualEntryReason?: string;
  workingHours?: number;
  overtimeHours?: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface AttendanceCreate {
  photoUrl: string;
  latitude: number;
  longitude: number;
  notes?: string;
}

export interface AttendanceUpdate {
  clockInTime?: string;
  clockOutTime?: string;
  status?: string;
  notes?: string;
}

export interface AttendanceStatus {
  status: 'not_started' | 'clocked_in' | 'clocked_out';
  attendance?: Attendance;
  workingHours?: number;
}


// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Report types
export interface DashboardStats {
  today: AttendanceStats;
  week: AttendanceStats;
  totalUsers: number;
  totalEmployees: number;
  recentAttendances: Attendance[];
  departmentStats: Record<string, DepartmentStats>;
}

export interface AttendanceStats {
  total: number;
  present: number;
  late: number;
  absent: number;
  remote: number;
  invalid: number;
}

export interface DepartmentStats {
  totalUsers: number;
  present: number;
  late: number;
  absent: number;
}

export interface AttendanceReport {
  attendances: Attendance[];
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
    remote: number;
    invalid: number;
    totalWorkingHours: number;
    totalOvertimeHours: number;
    averageWorkingHours: number;
  };
  pagination: Pagination;
}

export interface UserReport {
  userId: string;
  user: User | null;
  stats: {
    totalDays: number;
    present: number;
    late: number;
    absent: number;
    remote: number;
    totalWorkingHours: number;
    totalOvertimeHours: number;
    averageWorkingHours: number;
    attendanceRate: number;
  };
  dailyBreakdown: DailyBreakdown[];
  attendances: Attendance[];
}

export interface DailyBreakdown {
  date: string;
  status: string;
  clockInTime?: string;
  clockOutTime?: string;
  workingHours?: number;
  overtimeHours?: number;
  locationStatus: string;
}

export interface DepartmentReport {
  department: string;
  stats: {
    totalUsers: number;
    totalDays: number;
    present: number;
    late: number;
    absent: number;
    remote: number;
    totalWorkingHours: number;
    totalOvertimeHours: number;
    averageWorkingHours: number;
  };
  userBreakdown: UserBreakdown[];
  attendances: Attendance[];
}

export interface UserBreakdown {
  userId: string;
  name: string;
  email: string;
  totalDays: number;
  present: number;
  late: number;
  absent: number;
  totalWorkingHours: number;
  attendanceRate: number;
}


// Common types
export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
  };
}

export interface LocationCheck {
  isValid: boolean;
  distance: number;
  type: 'valid' | 'remote' | 'error';
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'date' | 'number';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: any;
}

// Theme types
export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Auth context types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (userData: UserCreate) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (data: ResetPasswordRequest) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

// Component props types
// LayoutProps removed - no longer needed

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'employee';
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  label?: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'time' | 'color';
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  step?: string;
  min?: string | number;
  max?: string | number;
}

export interface SelectProps {
  label?: string;
  name: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export interface CheckboxProps {
  label?: string;
  name: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export interface FileInputProps {
  label?: string;
  name: string;
  accept?: string;
  value?: File | null;
  onChange?: (file: File) => void;
  onRemove?: () => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export interface TableProps {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

// Chart types
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface LineChartData {
  name: string;
  present: number;
  late: number;
  absent: number;
}

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

