import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Generate thumbnail URL using the Thumbnail.ws API
    const encodedUrl = encodeURIComponent(url);
    const apiKey = process.env.THUMBNAIL_API_KEY
    const thumbnailUrl = `https://api.thumbnail.ws/api/${apiKey}/thumbnail/get?url=${encodedUrl}&width=800&refresh=true`;
    
    // Fetch the image and return it as a response
    const response = await fetch(thumbnailUrl);
    
    if (!response.ok) {
      console.error('Thumbnail service error:', await response.text());
      return NextResponse.json({ error: 'Failed to generate thumbnail' }, { status: 500 });
    }
    
    const imageBuffer = await response.arrayBuffer();
    
    // Return the image with appropriate content type
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return NextResponse.json({ error: 'Failed to generate thumbnail' }, { status: 500 });
  }
} 