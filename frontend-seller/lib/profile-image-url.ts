import { getApiOrigin } from "@/lib/api-client";

/** Absolute URL for displaying a user profile image (handles relative /storage/... paths). */
export function displayProfileImageUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = getApiOrigin().replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}
