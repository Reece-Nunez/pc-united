'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (imageUrl: string) => void;
  className?: string;
  placeholder?: string;
}

export default function ImageUpload({ 
  currentImageUrl, 
  onImageChange, 
  className = '', 
  placeholder = 'No image selected' 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);

      // For now, we'll use a simple approach where we convert the image to a data URL
      // In a production environment, you would upload to a service like Supabase Storage,
      // AWS S3, Cloudinary, or similar
      const reader2 = new FileReader();
      reader2.onload = (e) => {
        const result = e.target?.result as string;
        onImageChange(result);
        setIsUploading(false);
      };
      reader2.readAsDataURL(file);

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image. Please try again.');
      setIsUploading(false);
    }
  };

  const handleUrlInput = (url: string) => {
    setPreviewUrl(url);
    onImageChange(url);
  };

  const clearImage = () => {
    setPreviewUrl(null);
    onImageChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preview */}
      {previewUrl && (
        <div className="relative">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full h-32 sm:h-40 md:h-48 object-cover rounded-lg border border-gray-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/logo.png'; // Fallback image
            }}
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Options */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-6">
        <div className="text-center">
          <div className="space-y-3 md:space-y-4">
            {/* File Upload */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
                disabled={isUploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </button>
            </div>

            <div className="text-gray-500 text-sm">or</div>

            {/* URL Input */}
            <div>
              <input
                type="url"
                placeholder="Enter image URL"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                onChange={(e) => handleUrlInput(e.target.value)}
                defaultValue={currentImageUrl && !previewUrl ? currentImageUrl : ''}
              />
            </div>

            {!previewUrl && (
              <p className="text-xs md:text-sm text-gray-500">
                {placeholder}
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Supported formats: JPG, PNG, GIF, WebP. Max size: 5MB.<br className="sm:hidden" />
        <span className="hidden sm:inline"> For best results, use images with a 16:9 aspect ratio (e.g., 1600×900px).</span>
      </p>
    </div>
  );
}