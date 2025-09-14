import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';

// S3 Client Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'pc-united';

export async function GET() {
  try {
    console.log('🔍 Testing S3 connection...');
    console.log('Region:', process.env.AWS_REGION);
    console.log('Bucket:', BUCKET_NAME);
    console.log('Access Key exists:', !!process.env.AWS_ACCESS_KEY_ID);
    console.log('Secret Key exists:', !!process.env.AWS_SECRET_ACCESS_KEY);

    // Test 1: List objects in bucket
    console.log('📋 Test 1: Listing bucket contents...');
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 5
    });
    
    const listResult = await s3Client.send(listCommand);
    console.log('✅ Bucket listing successful:', listResult.Contents?.length || 0, 'objects found');

    // Test 2: Upload a small test file
    console.log('📤 Test 2: Uploading test file...');
    const testContent = 'S3 Connection Test - ' + new Date().toISOString();
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'test/connection-test.txt',
      Body: Buffer.from(testContent),
      ContentType: 'text/plain'
    });

    const uploadResult = await s3Client.send(uploadCommand);
    console.log('✅ Test upload successful:', uploadResult);

    const testUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/test/connection-test.txt`;

    return NextResponse.json({
      success: true,
      message: 'S3 connection successful',
      details: {
        region: process.env.AWS_REGION,
        bucket: BUCKET_NAME,
        objectCount: listResult.Contents?.length || 0,
        testFileUrl: testUrl,
        uploadETag: uploadResult.ETag
      }
    });

  } catch (error: any) {
    console.error('❌ S3 Test Error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId
    });

    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        name: error.name,
        code: error.code,
        statusCode: error.$metadata?.httpStatusCode,
        region: process.env.AWS_REGION,
        bucket: BUCKET_NAME,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
      }
    }, { status: 500 });
  }
}