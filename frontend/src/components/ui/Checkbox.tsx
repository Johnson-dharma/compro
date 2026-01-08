import React from 'react';
import { CheckboxProps } from '@/types';
import { cn } from '@/utils';

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  name,
  checked,
  onChange,
  error,
  disabled = false,
  className,
  ...props
}) => {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'w-4 h-4 text-primary-600 bg-secondary-100 border-secondary-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-secondary-800 focus:ring-2 dark:bg-secondary-700 dark:border-secondary-600',
          error && 'border-danger-300 focus:ring-danger-500',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      />
      {label && (
        <label
          htmlFor={name}
          className={cn(
            'ml-2 text-sm font-medium text-secondary-700 dark:text-secondary-300',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {label}
        </label>
      )}
      {error && (
        <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default Checkbox;
