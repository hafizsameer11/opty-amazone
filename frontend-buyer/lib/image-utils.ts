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
  
  // If it's already a full URL (http/https) or data URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  
  // If it's a relative path starting with /storage, convert to full URL
  if (url.startsWith('/storage') || url.startsWith('/')) {
    return `${BACKEND_BASE_URL}${url}`;
  }
  
  // If it's a relative path without leading slash, add it
  if (!url.startsWith('/')) {
    return `${BACKEND_BASE_URL}/${url}`;
  }
  
  return url;
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

