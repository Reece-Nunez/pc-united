// Upload types
export type UploadFolder = 'highlights' | 'profile-pics' | 'team-images';

// Upload file to S3 via API route with real progress tracking
export const uploadToS3 = async (
  file: File,
  folder: UploadFolder,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; url?: string; error?: string }> => {
  return new Promise((resolve) => {
    console.log('🚀 Starting S3 upload:', file.name, file.size, 'bytes');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        console.log('📊 Upload progress:', percentComplete + '%');
        onProgress(percentComplete);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      console.log('📡 Upload completed, status:', xhr.status);
      
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          console.log('✅ Upload result:', result);
          
          if (onProgress) {
            onProgress(100);
          }
          
          resolve(result);
        } catch (parseError) {
          console.error('❌ Error parsing response:', parseError);
          resolve({
            success: false,
            error: 'Failed to parse server response'
          });
        }
      } else {
        console.error('❌ Upload failed with status:', xhr.status, xhr.statusText);
        let errorMessage = `Upload failed: ${xhr.status} ${xhr.statusText}`;
        try {
          const errorResult = JSON.parse(xhr.responseText);
          errorMessage = errorResult.error || errorMessage;
        } catch (e) {
          // Use default error message
        }
        
        resolve({
          success: false,
          error: errorMessage
        });
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      console.error('❌ Upload error occurred');
      resolve({
        success: false,
        error: 'Network error during upload'
      });
    });

    // Handle timeouts
    xhr.addEventListener('timeout', () => {
      console.error('❌ Upload timeout');
      resolve({
        success: false,
        error: 'Upload timeout'
      });
    });

    // Start upload
    console.log('📤 Sending request to /api/upload...');
    xhr.open('POST', '/api/upload');
    xhr.timeout = 300000; // 5 minute timeout
    xhr.send(formData);
  });
};

// Delete file from S3 via API route
export const deleteFromS3 = async (fileUrl: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`/api/upload?url=${encodeURIComponent(fileUrl)}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('S3 Delete Error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to delete file from S3' 
    };
  }
};

// Check if S3 is properly configured (client-side check)
export const isS3Configured = (): boolean => {
  // This is a simple client-side check
  // The actual validation happens server-side in the API route
  return true; // We'll let the server handle the real validation
};