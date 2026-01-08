import React from 'react';

const Register: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-secondary-900 dark:to-secondary-800 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">
          Registration
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Please contact your administrator to create an account.
        </p>
      </div>
    </div>
  );
};

export default Register;
