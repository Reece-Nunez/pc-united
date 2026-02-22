// Upload types
export type UploadFolder = 'highlights' | 'profile-pics' | 'team-images';

// Upload file to S3 using presigned URLs (bypasses platform body size limits)
export const uploadToS3Direct = async (
  file: File,
  folder: UploadFolder,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; url?: string; error?: string }> => {
  console.log('🚀 Starting direct S3 upload:', file.name, file.size, 'bytes');
  
  try {
    // Step 1: Get presigned URL from our API
    console.log('📝 Requesting presigned URL...');
    const presignedResponse = await fetch('/api/presigned-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        folder,
      }),
    });

    if (!presignedResponse.ok) {
      const error = await presignedResponse.json();
      throw new Error(error.error || 'Failed to get presigned URL');
    }

    const { presignedUrl, publicUrl } = await presignedResponse.json();
    console.log('✅ Got presigned URL');

    // Step 2: Upload directly to S3 using presigned URL
    return new Promise((resolve) => {
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
        console.log('📡 Direct upload completed, status:', xhr.status);
        console.log('📄 Response headers:', xhr.getAllResponseHeaders());
        console.log('📄 Response text (first 200 chars):', xhr.responseText?.substring(0, 200));
        
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('✅ Direct S3 upload successful:', publicUrl);
          if (onProgress) {
            onProgress(100);
          }
          resolve({
            success: true,
            url: publicUrl
          });
        } else {
          console.error('❌ Direct upload failed with status:', xhr.status, xhr.statusText);
          console.error('❌ Response text:', xhr.responseText);
          resolve({
            success: false,
            error: `Direct upload failed: ${xhr.status} ${xhr.statusText}`
          });
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        console.error('❌ Direct upload error occurred');
        resolve({
          success: false,
          error: 'Network error during direct upload'
        });
      });

      // Handle timeouts
      xhr.addEventListener('timeout', () => {
        console.error('❌ Direct upload timeout after 10 minutes');
        resolve({
          success: false,
          error: 'Direct upload timeout after 10 minutes - please try a smaller file or check your internet connection'
        });
      });

      // Start direct upload to S3
      console.log('📤 Uploading directly to S3...');
      console.log('🔗 Presigned URL length:', presignedUrl.length);
      console.log('📁 File type:', file.type);
      console.log('📏 File size:', file.size, 'bytes');
      
      xhr.open('PUT', presignedUrl);
      xhr.timeout = 600000; // Increase to 10 minute timeout for large files
      // Must match the headers in the presigned URL signature
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('Content-Disposition', 'inline');
      xhr.setRequestHeader('Cache-Control', 'max-age=31536000');

      console.log('🚀 Starting PUT request...');
      xhr.send(file);
    });

  } catch (error: any) {
    console.error('❌ Direct upload setup error:', error);
    return {
      success: false,
      error: error.message || 'Failed to setup direct upload'
    };
  }
};

// Upload file to S3 via API route with real progress tracking (fallback method)
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
        
        // Provide more specific error messages
        if (xhr.status === 408) {
          errorMessage = 'Upload timeout - please try again with a smaller file or better internet connection';
        } else if (xhr.status === 413) {
          errorMessage = 'File too large - maximum size is 200MB';
        } else if (xhr.status === 500) {
          errorMessage = 'Server error during upload - please try again';
        }
        
        try {
          const errorResult = JSON.parse(xhr.responseText);
          if (errorResult.error) {
            errorMessage = errorResult.error;
          }
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
      console.error('❌ Upload timeout after 5 minutes');
      resolve({
        success: false,
        error: 'Upload timeout after 5 minutes - please try again with a smaller file or better internet connection'
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