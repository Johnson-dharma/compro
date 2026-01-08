import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
// import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginCredentials } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/utils';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const validateForm = () => {
    const newErrors: {email?: string; password?: string} = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (error) {
      // Error is handled in the auth context
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-secondary-900 dark:to-secondary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-4 shadow-lg">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            Sign in to your attendance account
          </p>
        </div>

        {/* Login form */}
        <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl p-8 border border-secondary-200 dark:border-secondary-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="Enter your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />

            {/* Password */}
            <div className="relative">
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Forgot password link */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full"
            >
              Sign In
            </Button>
          </form>

          {/* Register link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
              >
                Contact your administrator
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
