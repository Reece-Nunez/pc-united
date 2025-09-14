import { NextRequest, NextResponse } from 'next/server';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

// S3 Client Configuration - Amplify only allows S3_* prefixed variables
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'pc-united';

export async function GET() {
  console.log('🔍 Testing S3 connection...');
  console.log('🔍 Full process.env dump (sanitized):', Object.keys(process.env));
  
  try {
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const region = process.env.S3_REGION || 'us-east-1';
    
    console.log('📋 Configuration check:');
    console.log('- Access Key ID:', accessKeyId ? `${accessKeyId.substring(0, 8)}...` : 'MISSING');
    console.log('- Secret Key:', secretAccessKey ? 'Present' : 'MISSING');
    console.log('- Region:', region);
    console.log('- Bucket:', BUCKET_NAME);
    
    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({
        success: false,
        error: 'S3 credentials not configured',
        details: {
          hasAccessKey: !!accessKeyId,
          hasSecretKey: !!secretAccessKey,
          region,
          bucket: BUCKET_NAME,
          availableS3Vars: Object.keys(process.env).filter(k => k.startsWith('S3_'))
        }
      }, { status: 500 });
    }
    
    // Test bucket access
    const command = new HeadBucketCommand({ Bucket: BUCKET_NAME });
    await s3Client.send(command);
    
    console.log('✅ S3 connection test successful');
    
    return NextResponse.json({
      success: true,
      message: 'S3 connection successful',
      details: {
        region,
        bucket: BUCKET_NAME,
        accessKeyPrefix: accessKeyId ? accessKeyId.substring(0, 8) + '...' : 'missing'
      }
    });
    
  } catch (error: any) {
    console.error('❌ S3 connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'S3 connection failed',
      details: {
        message: error.message,
        code: error.Code || error.code,
        statusCode: error.$metadata?.httpStatusCode
      }
    }, { status: 500 });
  }
}