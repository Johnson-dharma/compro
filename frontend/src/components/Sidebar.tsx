import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Clock, 
  Users, 
  BarChart3, 
  Settings,
  User, 
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { User as UserType } from '@/types';
import { cn } from '@/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user }) => {
  const { logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'employee'] },
    { name: 'Attendance', href: '/attendance', icon: Clock, roles: ['admin', 'employee'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
    { name: 'Profile', href: '/profile', icon: User, roles: ['admin', 'employee'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    user && item.roles.includes(user.role)
  );

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-secondary-800 border-r border-secondary-200 dark:border-secondary-700">
          {/* Logo */}
          <div className="flex h-16 flex-shrink-0 items-center px-6 border-b border-secondary-200 dark:border-secondary-700">
            <NavLink to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-secondary-900 dark:text-white">
                AttendanceApp
              </span>
            </NavLink>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-6">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'sidebar-item',
                    isActive && 'active'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-secondary-200 dark:border-secondary-700 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-secondary-600 hover:text-danger-600 hover:bg-danger-50 dark:text-secondary-300 dark:hover:text-danger-400 dark:hover:bg-danger-900/20 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-secondary-800 transform transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Mobile header */}
          <div className="flex h-16 flex-shrink-0 items-center justify-between px-6 border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-secondary-900 dark:text-white">
                AttendanceApp
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:text-secondary-300 dark:hover:bg-secondary-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-6">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    'sidebar-item',
                    isActive && 'active'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-secondary-200 dark:border-secondary-700 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-secondary-600 hover:text-danger-600 hover:bg-danger-50 dark:text-secondary-300 dark:hover:text-danger-400 dark:hover:bg-danger-900/20 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
