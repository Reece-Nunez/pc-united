import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');
  
  if (!videoUrl) {
    return NextResponse.json({ error: 'No video URL provided' }, { status: 400 });
  }

  try {
    console.log('🎥 Testing video URL:', videoUrl);
    
    // Try to fetch the video URL
    const response = await fetch(videoUrl, {
      method: 'HEAD' // Just check headers, don't download the full video
    });

    console.log('📡 Video URL response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      accessible: response.ok,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    });

  } catch (error: any) {
    console.error('❌ Video URL test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      accessible: false
    });
  }
}