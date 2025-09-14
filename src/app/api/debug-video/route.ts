import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');
  
  if (!videoUrl) {
    return NextResponse.json({ error: 'No video URL provided' }, { status: 400 });
  }

  try {
    console.log('🔍 Debugging video URL:', videoUrl);
    
    // Get video headers
    const headResponse = await fetch(videoUrl, { method: 'HEAD' });
    
    const headers = Object.fromEntries(headResponse.headers.entries());
    console.log('📋 Video headers:', headers);
    
    // Try to get first few bytes to check video signature
    const rangeResponse = await fetch(videoUrl, {
      headers: { 'Range': 'bytes=0-50' }
    });
    
    const buffer = await rangeResponse.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const signature = Array.from(bytes.slice(0, 16))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    
    // Check for common video file signatures
    const fileType = checkVideoSignature(bytes);
    
    return NextResponse.json({
      url: videoUrl,
      accessible: headResponse.ok,
      status: headResponse.status,
      headers,
      contentType: headers['content-type'],
      contentLength: headers['content-length'],
      acceptsRanges: headers['accept-ranges'] === 'bytes',
      signature,
      detectedFormat: fileType,
      supportsStreaming: headers['accept-ranges'] === 'bytes' && headResponse.status === 200
    });

  } catch (error: any) {
    console.error('❌ Video debug error:', error);
    return NextResponse.json({
      error: error.message,
      accessible: false
    });
  }
}

function checkVideoSignature(bytes: Uint8Array): string {
  const signature = Array.from(bytes.slice(0, 12)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  if (signature.startsWith('000000')) {
    // Check for MP4/MOV
    const boxType = String.fromCharCode(...bytes.slice(4, 8));
    if (boxType === 'ftyp') return 'MP4/MOV';
  }
  
  if (signature.startsWith('52494646')) return 'AVI';
  if (signature.startsWith('1a45dfa3')) return 'WebM';
  if (signature.startsWith('464c5601')) return 'FLV';
  
  return 'Unknown format';
}