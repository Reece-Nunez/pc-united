'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const variantStyles = {
  danger: {
    icon: (
      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
  },
  warning: {
    icon: (
      <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 text-white',
  },
  info: {
    icon: (
      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
  },
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Basic focus trap between cancel and confirm buttons
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the cancel button when dialog opens
      setTimeout(() => cancelRef.current?.focus(), 0);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ease-out"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Card */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl
          animate-fade-in-scale"
      >
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3
                id="confirm-dialog-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {title}
              </h3>
              <p
                id="confirm-dialog-message"
                className="mt-2 text-sm text-gray-600 dark:text-gray-400"
              >
                {message}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg
                text-gray-700 dark:text-gray-300
                bg-gray-100 dark:bg-gray-700
                hover:bg-gray-200 dark:hover:bg-gray-600
                focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
                dark:focus:ring-offset-gray-800
                transition-colors duration-150"
            >
              {cancelText}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg
                focus:outline-none focus:ring-2 focus:ring-offset-2
                dark:focus:ring-offset-gray-800
                transition-colors duration-150
                ${styles.button}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
