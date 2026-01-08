import React from 'react';
import { InputProps } from '@/types';
import { cn } from '@/utils';

const Input: React.FC<InputProps> = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
        >
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={cn(
          'input',
          error && 'border-danger-300 focus:border-danger-500 focus:ring-danger-500',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
