import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch the URL server-side (no CORS restrictions)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type');

    // If it's already an image, return it directly
    if (contentType?.startsWith('image/')) {
      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // If it's HTML, try to extract an image from Open Graph tags or main content
    if (contentType?.includes('text/html')) {
      const html = await response.text();
      const $ = cheerio.load(html);

      // Try Open Graph image first (og:image)
      let imageUrl = $('meta[property="og:image"]').attr('content') ||
                     $('meta[property="og:image:url"]').attr('content') ||
                     $('meta[name="twitter:image"]').attr('content');

      // If no OG image, try to find the first large image in the page
      if (!imageUrl) {
        const images = $('img[src]');
        for (let i = 0; i < images.length; i++) {
          const src = $(images[i]).attr('src');
          if (src && (src.startsWith('http') || src.startsWith('//'))) {
            imageUrl = src;
            break;
          }
        }
      }

      if (!imageUrl) {
        return NextResponse.json(
          { error: 'No image found in page. Please use a direct image URL (ending in .jpg, .png, etc.)' },
          { status: 400 }
        );
      }

      // Make relative URLs absolute
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        const baseUrl = new URL(url);
        imageUrl = `${baseUrl.protocol}//${baseUrl.host}${imageUrl}`;
      }

      // Fetch the extracted image
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!imageResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch extracted image: ${imageResponse.status}` },
          { status: imageResponse.status }
        );
      }

      const imageContentType = imageResponse.headers.get('content-type');
      if (!imageContentType?.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Extracted URL is not an image' },
          { status: 400 }
        );
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': imageContentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Not an image or HTML
    return NextResponse.json(
      { error: `URL returned ${contentType}, expected image or HTML. Use direct image URLs (ending in .jpg, .png, etc.)` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
