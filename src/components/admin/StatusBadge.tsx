import { ReactNode } from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'pending';

interface StatusBadgeProps {
  variant: Variant;
  children: ReactNode;
  className?: string;
  icon?: boolean;
}

const variantStyles: Record<Variant, { badge: string; dot: string }> = {
  success: {
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dot: 'bg-green-500 dark:bg-green-400',
  },
  warning: {
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    dot: 'bg-yellow-500 dark:bg-yellow-400',
  },
  danger: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500 dark:bg-red-400',
  },
  info: {
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    dot: 'bg-blue-500 dark:bg-blue-400',
  },
  neutral: {
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
    dot: 'bg-gray-500 dark:bg-gray-400',
  },
  pending: {
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    dot: 'bg-orange-500 dark:bg-orange-400',
  },
};

export default function StatusBadge({ variant, children, className = '', icon = true }: StatusBadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles.badge} ${className}`}
    >
      {icon && (
        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      )}
      {children}
    </span>
  );
}
