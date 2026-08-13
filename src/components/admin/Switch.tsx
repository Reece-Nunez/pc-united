'use client';

import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}

/**
 * Shared controlled toggle switch. Sizing (h-6 w-11 track, h-5 w-5 knob,
 * translate-x-5) matches the original newsletter-page toggle so existing
 * adoptions stay visually seamless.
 */
export default function Switch({
  checked,
  onChange,
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors ease-in-out
        active:scale-[0.97] motion-reduce:transition-none
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-team-blue focus:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${checked ? 'bg-team-blue' : 'bg-gray-300 dark:bg-gray-600'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white shadow ring-0 transition-transform ease-in-out
          motion-reduce:transition-none
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}
