/** Base URL for the VistaExpress seller frontend (no trailing slash). */
export function getSellerAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SELLER_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, '');
  }
  return 'https://seller.vistaexpress.it';
}
