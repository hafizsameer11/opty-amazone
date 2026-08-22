/**
 * Utility functions for handling image URLs from the backend
 */

import { getApiOrigin } from './api-client';

const API_BASE_URL = `${getApiOrigin()}/api`;
const BACKEND_BASE_URL = getApiOrigin();

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

/** Stable key for deduping the same asset served as relative vs absolute URL. */
export function imageUrlKey(url: string): string {
  return getFullImageUrl(url).replace(/\?.*$/, '').toLowerCase();
}

/**
 * Product gallery first, then extra URLs (e.g. pack-specific shots), deduped by imageUrlKey.
 * Returns full URLs for display.
 */
export function mergeGalleryUrls(basePathsOrUrls: string[], extraFullUrls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of basePathsOrUrls) {
    const full = getFullImageUrl(u);
    const k = imageUrlKey(full);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(full);
    }
  }
  for (const u of extraFullUrls) {
    const full = getFullImageUrl(u);
    const k = imageUrlKey(full);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(full);
    }
  }
  return out;
}

/**
 * Check if image URL is from localhost (should use unoptimized)
 */
export function isLocalhostImage(url: string): boolean {
  return url.includes('localhost') || url.includes('127.0.0.1');
}

