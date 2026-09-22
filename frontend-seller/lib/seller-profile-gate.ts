import type { User } from '@/types/auth';
import type { Store } from '@/types/store';

/** Query flag used after login / register when profile must be finished first. */
export const SELLER_PROFILE_SETUP_QUERY = 'setup';

export type SellerGateState =
  | 'ok'
  | 'needs_verification'
  | 'awaiting_approval'
  | 'rejected'
  | 'needs_store_setup'
  | 'suspended';

/**
 * Sellers must have name, email, and a usable phone before using the rest of the dashboard.
 */
export function isSellerProfileComplete(user: User | null): boolean {
  if (!user) {
    return true;
  }
  if (user.role && user.role !== 'seller') {
    return true;
  }
  const name = String(user.name ?? '').trim();
  const email = String(user.email ?? '').trim();
  const phone = String(user.phone ?? '').replace(/\s/g, '');
  if (name.length < 2) return false;
  if (!email.includes('@')) return false;
  if (phone.length < 8) return false;
  return true;
}

export function getSellerGateState(store: Store | null | undefined): SellerGateState {
  if (!store) return 'needs_verification';
  if (store.status === 'suspended') return 'suspended';
  if (store.onboarding_status === 'rejected' || store.status === 'rejected') return 'rejected';
  if (!store.verification_submitted_at && ['pending', 'in_progress', 'rejected'].includes(store.onboarding_status)) {
    return 'needs_verification';
  }
  if (store.onboarding_status === 'pending_review' || store.status === 'pending') {
    return 'awaiting_approval';
  }
  if (store.onboarding_status === 'approved' && !store.store_setup_completed_at) {
    return 'needs_store_setup';
  }
  if (store.can_sell || (store.onboarding_status === 'approved' && store.store_setup_completed_at)) {
    return 'ok';
  }
  if (store.onboarding_status === 'approved') return 'needs_store_setup';
  return 'awaiting_approval';
}

export function sellerGateRedirect(state: SellerGateState): string | null {
  switch (state) {
    case 'needs_verification':
    case 'rejected':
      return '/auth/verification';
    case 'needs_store_setup':
      return '/dashboard?setup=1';
    case 'awaiting_approval':
      return '/auth/pending-approval';
    case 'suspended':
      return '/auth/pending-approval';
    default:
      return null;
  }
}
