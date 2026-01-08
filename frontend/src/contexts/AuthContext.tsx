import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  User, 
  LoginCredentials, 
  UserCreate, 
  ResetPasswordRequest, 
  ChangePasswordRequest,
  AuthContextType 
} from '@/types';
import { authAPI, usersAPI } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          
          // Verify token is still valid
          try {
            await authAPI.getMe();
          } catch (error) {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(credentials);
      
      if (response.success) {
        const { user: userData, token: authToken } = response.data;
        
        setUser(userData);
        setToken(authToken);
        
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        toast.success(`Welcome back, ${userData.name}!`);
      } else {
        throw new Error(response.error?.message || 'Login failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    try {
      // Call logout API (but don't wait for it)
      authAPI.logout().catch(console.error);
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear local state regardless of API call success
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.success('Logged out successfully');
    }
  };

  const register = async (userData: UserCreate): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      
      if (response.success) {
        const { user: newUser, token: authToken } = response.data;
        
        setUser(newUser);
        setToken(authToken);
        
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        
        toast.success(`Welcome, ${newUser.name}! Your account has been created successfully.`);
      } else {
        throw new Error(response.error?.message || 'Registration failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authAPI.forgotPassword(email);
      
      if (response.success) {
        toast.success('Password reset email sent. Please check your inbox.');
      } else {
        throw new Error(response.error?.message || 'Failed to send reset email');
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Failed to send reset email';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (data: ResetPasswordRequest): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authAPI.resetPassword(data);
      
      if (response.success) {
        toast.success('Password reset successful. You can now log in with your new password.');
      } else {
        throw new Error(response.error?.message || 'Password reset failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Password reset failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (data: ChangePasswordRequest): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await authAPI.changePassword(data);
      
      if (response.success) {
        toast.success('Password changed successfully.');
      } else {
        throw new Error(response.error?.message || 'Password change failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Password change failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await usersAPI.updateProfile(data);
      
      if (response.success) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success('Profile updated successfully.');
      } else {
        throw new Error(response.error?.message || 'Profile update failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Profile update failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
