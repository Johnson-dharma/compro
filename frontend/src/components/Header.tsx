import React, { useState, useRef, useEffect } from 'react';
import { Menu, Sun, Moon, Bell, X, CheckCircle, AlertCircle, Info, Trash2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { User } from '@/types';
import { cn } from '@/utils';
import { NavLink } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, user }) => {
  const { theme, toggleTheme } = useTheme();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'success',
      title: 'Attendance Recorded',
      message: 'Your clock-in has been successfully recorded at 9:00 AM',
      time: '2 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'warning',
      title: 'Late Arrival',
      message: 'You arrived 15 minutes late today. Please ensure punctuality.',
      time: '1 hour ago',
      read: false
    },
    {
      id: 3,
      type: 'info',
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM',
      time: '3 hours ago',
      read: true
    },
    {
      id: 4,
      type: 'success',
      title: 'Profile Updated',
      message: 'Your profile information has been successfully updated',
      time: '1 day ago',
      read: true
    }
  ]);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-warning-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-info-500" />;
      default:
        return <Info className="w-5 h-5 text-info-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Function to delete a notification
  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Function to mark a notification as read
  const markNotificationAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Function to mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  // Function to refresh notifications (add default ones when opened)
  const refreshNotifications = () => {
    const defaultNotifications = [
      {
        id: Date.now(),
        type: 'success',
        title: 'Attendance Recorded',
        message: 'Your clock-in has been successfully recorded at 9:00 AM',
        time: '2 minutes ago',
        read: false
      },
      {
        id: Date.now() + 1,
        type: 'warning',
        title: 'Late Arrival',
        message: 'You arrived 15 minutes late today. Please ensure punctuality.',
        time: '1 hour ago',
        read: false
      },
      {
        id: Date.now() + 2,
        type: 'info',
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM',
        time: '3 hours ago',
        read: true
      },
      {
        id: Date.now() + 3,
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile information has been successfully updated',
        time: '1 day ago',
        read: true
      }
    ];
    setNotifications(defaultNotifications);
  };

  // Refresh notifications when dropdown is opened
  const handleNotificationToggle = () => {
    if (!isNotificationOpen) {
      refreshNotifications();
    }
    setIsNotificationOpen(!isNotificationOpen);
  };

  // Simulate new notification arrival (for demonstration)
  const addNewNotification = () => {
    const newNotification = {
      id: Date.now() + Math.random(),
      type: 'info' as const,
      title: 'New Message',
      message: 'You have a new message from the system',
      time: 'Just now',
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  return (
    <header className="bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 lg:pl-0">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:text-secondary-300 dark:hover:bg-secondary-700 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <div>
            <h1 className="text-xl font-semibold text-secondary-900 dark:text-white">
              Good {getGreeting()}, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              {getCurrentDate()}
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:text-secondary-300 dark:hover:bg-secondary-700 transition-colors duration-200"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button 
              className="p-2 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:text-secondary-300 dark:hover:bg-secondary-700 transition-colors duration-200 relative"
              onClick={handleNotificationToggle}
            >
              <Bell className="w-5 h-5" />
                             {/* Notification badge */}
               {unreadCount > 0 && (
                 <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-danger-500 rounded-full flex items-center justify-center text-xs text-white font-medium px-1">
                   {unreadCount > 99 ? '99+' : unreadCount}
                 </span>
               )}
            </button>

            {/* Notification dropdown */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 z-50">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-600">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                    Notifications
                  </h3>
                  <button
                    onClick={() => setIsNotificationOpen(false)}
                    className="p-1 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:text-secondary-300 dark:hover:bg-secondary-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Notifications list */}
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                                             <div
                         key={notification.id}
                         className={cn(
                           "p-4 border-b border-secondary-100 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors duration-200 cursor-pointer",
                           !notification.read && "bg-primary-50 dark:bg-primary-900/20"
                         )}
                         onClick={() => markNotificationAsRead(notification.id)}
                       >
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-medium text-secondary-900 dark:text-white">
                                {notification.title}
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-secondary-500 dark:text-secondary-400 whitespace-nowrap">
                                  {notification.time}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className="p-1 rounded-lg text-secondary-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors duration-200"
                                  title="Delete notification"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                              {notification.message}
                            </p>
                                                         {!notification.read && (
                               <div className="flex items-center gap-2 mt-2">
                                 <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                                 <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                                   Unread
                                 </span>
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <Bell className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                      <p className="text-secondary-500 dark:text-secondary-400">
                        No notifications yet
                      </p>
                    </div>
                  )}
                </div>

                                 {/* Footer */}
                 <div className="p-3 border-t border-secondary-200 dark:border-secondary-600 space-y-2">
                   <button 
                     onClick={markAllAsRead}
                     className="w-full text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium py-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors duration-200"
                   >
                     Mark all as read
                   </button>
                   <button 
                     onClick={addNewNotification}
                     className="w-full text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 font-medium py-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors duration-200"
                   >
                     Add Test Notification
                   </button>
                 </div>
              </div>
            )}
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-3 ml-2">
            <NavLink to="/profile" className="hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                {user?.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </NavLink>
            <NavLink to="/profile" className="hidden sm:block hover:opacity-80 transition-opacity">
              <div>
                <p className="text-sm font-medium text-secondary-900 dark:text-white">
                  {user?.name}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 capitalize">
                  {user?.role}
                </p>
              </div>
            </NavLink>
          </div>
        </div>
      </div>
    </header>
  );
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const getCurrentDate = (): string => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default Header;
