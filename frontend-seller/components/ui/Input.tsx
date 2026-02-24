import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-3.5 border-2 rounded-xl
          text-base text-gray-900 font-medium
          transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500
          placeholder:text-gray-400 placeholder:font-normal
          shadow-sm hover:shadow-md
          ${error ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-gray-300 bg-white hover:border-blue-300'}
          ${props.disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm font-medium text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
