import React from 'react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'secondary';
}

const variantStyles: Record<string, string> = {
  primary: 'bg-team-blue hover:bg-blue-800 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-white',
};

export default function LoadingButton({
  loading = false,
  variant = 'primary',
  disabled,
  className = '',
  children,
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        px-4 py-2 rounded-lg font-medium text-sm transition-colors
        focus:outline-none focus:ring-2 focus:ring-team-blue focus:ring-offset-2
        ${variantStyles[variant]}
        ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${className}
      `.trim()}
      {...props}
    >
      <span className="inline-flex items-center gap-2">
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </span>
    </button>
  );
}
