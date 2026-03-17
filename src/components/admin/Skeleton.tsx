import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header area */}
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
      {/* Text lines */}
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
}

export function SkeletonTable({ rows = 5 }: SkeletonTableProps) {
  return (
    <div className="animate-pulse">
      {/* Header row */}
      <div className="flex gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4" />
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/5" />
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/6" />
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 px-4 py-4 border-b border-gray-100 dark:border-gray-700/50"
        >
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
        </div>
      ))}
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
}

export function SkeletonText({ lines = 3 }: SkeletonTextProps) {
  const widths = ['w-full', 'w-4/5', 'w-3/5'];
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 bg-gray-200 dark:bg-gray-700 rounded ${widths[i % widths.length]}`}
        />
      ))}
    </div>
  );
}
