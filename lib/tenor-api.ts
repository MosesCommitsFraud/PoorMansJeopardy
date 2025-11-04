// Tenor API integration for GIF search
// Documentation: https://tenor.com/gifapi/documentation#quickstart

const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY || 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Demo key, replace with your own
const TENOR_API_BASE = 'https://tenor.googleapis.com/v2';

export interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    gif?: { url: string; dims: [number, number]; size: number };
    tinygif?: { url: string; dims: [number, number]; size: number };
    mediumgif?: { url: string; dims: [number, number]; size: number };
    nanogif?: { url: string; dims: [number, number]; size: number };
    gifpreview?: { url: string; dims: [number, number]; size: number };
  };
  created: number;
  content_description: string;
  itemurl: string;
  url: string;
  tags: string[];
  flags: string[];
  hasaudio: boolean;
}

export interface TenorSearchResponse {
  results: TenorGif[];
  next: string;
}

export interface TenorCategory {
  searchterm: string;
  path: string;
  image: string;
  name: string;
}

// Search for GIFs
export async function searchTenorGifs(
  query: string,
  limit: number = 20,
  pos?: string
): Promise<TenorSearchResponse> {
  const params = new URLSearchParams({
    key: TENOR_API_KEY,
    q: query,
    client_key: 'jeopardy_game',
    limit: limit.toString(),
    media_filter: 'gif,tinygif',
    ar_range: 'all',
  });

  if (pos) {
    params.append('pos', pos);
  }

  const response = await fetch(`${TENOR_API_BASE}/search?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to search Tenor GIFs');
  }

  return await response.json();
}

// Get trending GIFs
export async function getTrendingGifs(limit: number = 20): Promise<TenorSearchResponse> {
  const params = new URLSearchParams({
    key: TENOR_API_KEY,
    client_key: 'jeopardy_game',
    limit: limit.toString(),
    media_filter: 'gif,tinygif',
  });

  const response = await fetch(`${TENOR_API_BASE}/featured?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to get trending GIFs');
  }

  return await response.json();
}

// Get autocomplete suggestions
export async function getTenorAutocomplete(query: string): Promise<string[]> {
  const params = new URLSearchParams({
    key: TENOR_API_KEY,
    q: query,
    client_key: 'jeopardy_game',
    limit: '10',
  });

  const response = await fetch(`${TENOR_API_BASE}/autocomplete?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to get autocomplete suggestions');
  }

  const data = await response.json();
  return data.results || [];
}

// Register a GIF share (helps improve Tenor's search results)
export async function registerTenorShare(gifId: string, query?: string): Promise<void> {
  const params = new URLSearchParams({
    key: TENOR_API_KEY,
    id: gifId,
    client_key: 'jeopardy_game',
  });

  if (query) {
    params.append('q', query);
  }

  await fetch(`${TENOR_API_BASE}/registershare?${params.toString()}`);
}

// Get the best quality GIF URL from a Tenor GIF object
export function getGifUrl(gif: TenorGif, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const formats = gif.media_formats;
  
  switch (size) {
    case 'small':
      return formats.tinygif?.url || formats.nanogif?.url || formats.gif?.url || '';
    case 'medium':
      return formats.mediumgif?.url || formats.gif?.url || formats.tinygif?.url || '';
    case 'large':
      return formats.gif?.url || formats.mediumgif?.url || '';
    default:
      return formats.gif?.url || '';
  }
}

// Get preview/thumbnail URL
export function getGifPreviewUrl(gif: TenorGif): string {
  return gif.media_formats.gifpreview?.url || 
         gif.media_formats.tinygif?.url || 
         gif.media_formats.nanogif?.url || 
         getGifUrl(gif, 'small');
}

