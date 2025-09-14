import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Get the range header from the original request
    const range = request.headers.get('range');
    
    // Prepare headers for the S3 request
    const fetchHeaders: HeadersInit = {};
    if (range) {
      fetchHeaders['Range'] = range;
    }

    // Fetch the video from S3
    const response = await fetch(url, {
      headers: fetchHeaders,
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch video', status: response.status },
        { status: response.status }
      );
    }

    // Get the video data as a stream
    const videoStream = response.body;
    
    if (!videoStream) {
      return NextResponse.json({ error: 'No video data' }, { status: 500 });
    }

    // Prepare response headers
    const responseHeaders: HeadersInit = {
      'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
    };

    // Forward Content-Length and Content-Range if present
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    const contentRange = response.headers.get('Content-Range');
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    // Return the video with appropriate status and headers
    return new NextResponse(videoStream, {
      status: response.status, // Forward the status (206 for partial content, 200 for full)
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Error proxying video:', error);
    return NextResponse.json(
      { error: 'Failed to proxy video' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
    },
  });
}