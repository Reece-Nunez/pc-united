import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 Client Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'pc-united';

// Generate unique filename
const generateUniqueFilename = (originalName: string, folder: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop() || '';
  return `${folder}/${timestamp}-${randomString}.${extension}`;
};

// Configure route
export const maxDuration = 60; // 1 minute for presigned URL generation
export const runtime = 'nodejs';

// POST - Generate presigned URL for direct S3 upload
export async function POST(request: NextRequest) {
  console.log('🚀 Presigned URL API called');
  
  try {
    // Check if S3 is configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('❌ AWS credentials not configured');
      return NextResponse.json(
        { success: false, error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { fileName, fileType, fileSize, folder = 'highlights' } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { success: false, error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    // Check file size (limit to 200MB)
    const maxSize = 200 * 1024 * 1024; // 200MB in bytes
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is 200MB, received ${Math.round(fileSize / 1024 / 1024)}MB` },
        { status: 413 }
      );
    }

    const key = generateUniqueFilename(fileName, folder);
    console.log(`🎯 Generated key: ${key}`);

    // Create the command for putting an object in S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      CacheControl: 'max-age=31536000',
      ContentDisposition: 'inline',
    });

    // Generate presigned URL (valid for 10 minutes)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    
    // Construct the final public URL
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    console.log(`✅ Generated presigned URL for: ${key}`);

    return NextResponse.json({
      success: true,
      presignedUrl,
      publicUrl,
      key
    });

  } catch (error: any) {
    console.error('❌ Presigned URL Error:', error);
    return NextResponse.json(
      { success: false, error: `Failed to generate presigned URL: ${error.message}` },
      { status: 500 }
    );
  }
}