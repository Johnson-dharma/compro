import React from 'react';

const ForgotPassword: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-secondary-900 dark:to-secondary-800 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">
          Forgot Password
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Password reset functionality will be implemented here.
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
