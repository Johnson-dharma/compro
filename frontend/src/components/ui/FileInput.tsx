import React, { useRef } from 'react';
import { FileInputProps } from '@/types';
import { Upload, X } from 'lucide-react';
import { cn } from '@/utils';

const FileInput: React.FC<FileInputProps> = ({
  label,
  name,
  accept,
  value,
  onChange,
  onRemove,
  error,
  disabled = false,
  className,
  ...props
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onChange) {
      onChange(file);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
        >
          {label}
        </label>
      )}
      
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          id={name}
          name={name}
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled}
          className={cn(
            'hidden'
          )}
          {...props}
        />
        
        {!value ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={cn(
              'w-full p-4 border-2 border-dashed border-secondary-300 dark:border-secondary-600 rounded-lg text-center hover:border-primary-500 dark:hover:border-primary-400 transition-colors duration-200',
              disabled && 'opacity-50 cursor-not-allowed',
              error && 'border-danger-300',
              className
            )}
          >
            <Upload className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-secondary-500 dark:text-secondary-500 mt-1">
              {accept ? `Accepted formats: ${accept}` : 'All file types accepted'}
            </p>
          </button>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-secondary-900 dark:text-white">
                {value.name}
              </p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                {(value.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              aria-label={`Remove ${value.name}`}
              title={`Remove ${value.name}`}
              className="p-1 text-secondary-400 hover:text-danger-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default FileInput;