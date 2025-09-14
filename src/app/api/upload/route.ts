import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// S3 Client Configuration - Amplify only allows S3_* prefixed variables
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'pc-united';

// Generate unique filename
const generateUniqueFilename = (originalName: string, folder: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop() || '';
  return `${folder}/${timestamp}-${randomString}.${extension}`;
};

// Configure route for large uploads
export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

// POST - Upload file to S3
export async function POST(request: NextRequest) {
  console.log('🚀 S3 Upload API called');
  console.log('📊 Request headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    // Check if S3 is configured
    console.log('🔍 Checking S3 credentials...');
    if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
      console.error('❌ S3 credentials not configured - missing S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY');
      console.log('Available env vars:', Object.keys(process.env).filter(k => k.startsWith('S3_')));
      return NextResponse.json(
        { success: false, error: 'S3 credentials not configured' },
        { status: 500 }
      );
    }
    console.log('✅ S3 credentials found');

    console.log('📁 Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'highlights';
    
    console.log('📊 Request details:', {
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      hasFile: !!file,
      folder
    });

    if (!file) {
      console.error('❌ No file provided');
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`📄 File details: ${file.name}, ${file.size} bytes, ${file.type}`);
    
    // Check file size (limit to 200MB)
    const maxSize = 200 * 1024 * 1024; // 200MB in bytes
    if (file.size > maxSize) {
      console.error(`❌ File too large: ${file.size} bytes > ${maxSize} bytes`);
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is 200MB, received ${Math.round(file.size / 1024 / 1024)}MB` },
        { status: 413 }
      );
    }
    
    const fileName = generateUniqueFilename(file.name, folder);
    console.log(`🎯 Generated filename: ${fileName}`);
    
    // Convert File to Buffer (preserving video integrity)
    console.log('🔄 Converting file to buffer...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`📦 Buffer created: ${buffer.length} bytes`);
    
    // Verify buffer integrity
    if (buffer.length !== file.size) {
      console.error(`❌ Buffer size mismatch: expected ${file.size}, got ${buffer.length}`);
      return NextResponse.json(
        { success: false, error: 'File processing error: size mismatch' },
        { status: 500 }
      );
    }

    // Ensure proper content type for videos
    let contentType = file.type;
    if (!contentType || contentType === 'application/octet-stream') {
      // Fallback based on file extension
      const extension = fileName.toLowerCase().split('.').pop();
      switch (extension) {
        case 'mp4':
          contentType = 'video/mp4';
          break;
        case 'mov':
          contentType = 'video/quicktime';
          break;
        case 'avi':
          contentType = 'video/x-msvideo';
          break;
        case 'webm':
          contentType = 'video/webm';
          break;
        default:
          contentType = 'video/mp4'; // Default fallback
      }
    }
    
    console.log('📺 Content-Type set to:', contentType);

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
      // Add cache control for better streaming
      CacheControl: 'max-age=31536000',
      // Add content disposition to ensure proper handling
      ContentDisposition: 'inline',
    };

    console.log(`☁️ Uploading to S3: ${BUCKET_NAME}/${fileName}`);
    const command = new PutObjectCommand(uploadParams);
    const result = await s3Client.send(command);
    console.log('✅ S3 upload successful:', result);

    // Construct the public URL
    const region = process.env.S3_REGION || 'us-east-1';
    const publicUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${fileName}`;
    console.log(`🌐 Public URL: ${publicUrl}`);
    
    return NextResponse.json({ 
      success: true, 
      url: publicUrl 
    });

  } catch (error: any) {
    console.error('❌ S3 Upload Error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode
    });
    
    return NextResponse.json(
      { success: false, error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE - Delete file from S3
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: 'No file URL provided' },
        { status: 400 }
      );
    }

    // Extract the key from the URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('S3 Delete Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Delete failed' },
      { status: 500 }
    );
  }
}