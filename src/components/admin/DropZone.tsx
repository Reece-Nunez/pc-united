'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  currentFileUrl?: string;
  uploading?: boolean;
  uploadProgress?: number;
  previewType?: 'image' | 'video' | 'none';
}

export default function DropZone({
  onFileSelect,
  accept = 'image/*',
  maxSizeMB = 10,
  label = 'Drop file here or click to browse',
  currentFileUrl,
  uploading = false,
  uploadProgress = 0,
  previewType = 'image',
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validateAndSelect = (file: File) => {
    setError(null);

    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB`);
      return;
    }

    if (accept && accept !== '*') {
      const acceptTypes = accept.split(',').map((t) => t.trim());
      const matches = acceptTypes.some((type) => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'));
        }
        return file.type === type || file.name.endsWith(type);
      });
      if (!matches) {
        setError('Invalid file type');
        return;
      }
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
  };

  const displayUrl = previewUrl || currentFileUrl;

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging
            ? 'border-team-blue bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${uploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {displayUrl && previewType === 'image' ? (
          <div className="space-y-2">
            <div className="relative w-32 h-32 mx-auto rounded-lg overflow-hidden">
              <Image src={displayUrl} alt="Preview" fill className="object-cover" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Click or drop to replace</p>
          </div>
        ) : displayUrl && previewType === 'video' ? (
          <div className="space-y-2">
            <video src={displayUrl} className="w-full max-h-40 rounded-lg mx-auto" controls preload="metadata" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Click or drop to replace</p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg className="w-10 h-10 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Max {maxSizeMB}MB</p>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-team-red h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{uploadProgress}%</p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
