import { getApiOrigin } from '@/lib/api-client';

/** Turn relative / localhost storage paths into live absolute URLs. */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url || !String(url).trim()) return '';
  let value = String(url).trim();
  const origin = getApiOrigin();

  value = value.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, origin);

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    return `${origin}${value}`;
  }

  return `${origin}/storage/${value.replace(/^storage\//, '')}`;
}
