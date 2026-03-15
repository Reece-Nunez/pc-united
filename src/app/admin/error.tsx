'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-3xl font-bold text-white mb-4">
          Something went wrong
        </h1>
        <p className="text-gray-400 mb-6">
          An error occurred in the admin panel.
        </p>
        <details className="mb-8 text-left bg-gray-800 rounded-lg p-4">
          <summary className="text-gray-300 cursor-pointer font-medium">
            Error details
          </summary>
          <pre className="mt-3 text-sm text-red-400 whitespace-pre-wrap break-words">
            {error.message}
          </pre>
        </details>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/admin"
            className="px-6 py-3 border-2 border-gray-500 text-gray-300 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
