/**
 * Utility functions for handling image URLs from the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const BACKEND_BASE_URL = API_BASE_URL.replace('/api', '');

/**
 * Convert a relative image URL to a full URL
 * Handles both relative paths and full URLs
 */
export function getFullImageUrl(url: string | null | undefined): string {
  if (!url) return '/file.svg';

  const normalized = String(url).trim();
  if (!normalized || normalized === 'null' || normalized === 'undefined') {
    return '/file.svg';
  }

  const sanitized = normalized.replace(/\\/g, '/');

  // If it's already a full URL (http/https) or data URL, validate and return as is.
  if (sanitized.startsWith('http://') || sanitized.startsWith('https://') || sanitized.startsWith('data:')) {
    try {
      return encodeURI(sanitized);
    } catch {
      return '/file.svg';
    }
  }

  // Convert relative paths to full backend URLs.
  const relativePath = sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
  const fullUrl = `${BACKEND_BASE_URL}${relativePath}`;

  try {
    return encodeURI(fullUrl);
  } catch {
    return '/file.svg';
  }
}

/**
 * Get multiple image URLs converted to full URLs
 */
export function getFullImageUrls(urls: string[] | null | undefined): string[] {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return ['/file.svg'];
  }
  
  return urls.map(url => getFullImageUrl(url));
}

/**
 * Check if image URL is from localhost (should use unoptimized)
 */
export function isLocalhostImage(url: string): boolean {
  return url.includes('localhost') || url.includes('127.0.0.1');
}

