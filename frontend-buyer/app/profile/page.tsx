"use client";

import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
// Layout components are now handled by app/template.tsx
import { userService, type ProfileResponse } from "../../services/user-service";
import { orderService, type Order } from "../../services/order-service";
import { walletService, type WalletTransaction } from "../../services/wallet-service";
import { useAuth } from "../../contexts/AuthContext";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EditProfileForm from "@/components/profile/EditProfileForm";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";
import Badge from "@/components/ui/Badge";
import FollowedStoresPanel from "@/components/profile/FollowedStoresPanel";
import SavedItemsPanel from "@/components/profile/SavedItemsPanel";
import ReviewsPanel from "@/components/profile/ReviewsPanel";
import SupportPanel from "@/components/profile/SupportPanel";
import ReferralPanel from "@/components/profile/ReferralPanel";
import AddressesPanel from "@/components/profile/AddressesPanel";
import { getFullImageUrl } from "@/lib/image-utils";

type AccountTab =
  | "overview"
  | "edit-profile"
  | "addresses"
  | "orders"
  | "wallet"
  | "saved"
  | "followed-stores"
  | "reviews"
  | "referrals"
  | "support"
  | "faqs";

const accountTabs: AccountTab[] = ['overview', 'edit-profile', 'addresses', 'orders', 'wallet', 'saved', 'followed-stores', 'reviews', 'referrals', 'support', 'faqs'];

function isAccountTab(value: string | null): value is AccountTab {
  return Boolean(value && accountTabs.includes(value as AccountTab));
}

function AccountMenuIcon({ tab }: { tab: AccountTab }) {
  const paths: Record<AccountTab, string> = {
    overview: 'M20 21a8 8 0 0 0-16 0m12-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    'edit-profile': 'm4 20 4.5-1 9.8-9.8a2.2 2.2 0 0 0-3.1-3.1L5.4 15.9 4 20Z',
    addresses: 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    orders: 'M8 3h8l2 2v16H6V5l2-2Zm0 8h8m-8 4h8m-8-8h3',
    wallet: 'M4 7h15a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h10v4M16 14h2',
    saved: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z',
    'followed-stores': 'M4 21V5l8-3 8 3v16M9 21v-4h6v4M8 8h.01M16 8h.01M8 12h.01M16 12h.01',
    reviews: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
    referrals: 'M16 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 7.5l4.8-2.8M8.6 8.5l4.8 2.8',
    support: 'M4 18v-6a8 8 0 0 1 16 0v6M4 18h3v-5H4m13 5h3v-5h-3m-3 7h-4',
    faqs: 'M9.1 9a3 3 0 1 1 5.8 1c0 2-2.9 2-2.9 4m.1 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  };

  return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[tab]} /></svg>;
}

export default function ProfilePage() {
  return <Suspense fallback={<main className="mx-auto max-w-7xl p-6 text-gray-500">Loading your profile…</main>}><ProfilePageContent /></Suspense>;
}

function ProfilePageContent() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfileResponse["user"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AccountTab>("overview");
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [accountCounts, setAccountCounts] = useState({ orders: 0, saved_items: 0, followed_stores: 0 });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (isAccountTab(tab)) {
      setActiveTab(tab);
      setMobileSectionOpen(true);
    }
  }, [searchParams]);

  useLiveRefresh(async () => {
    if (activeTab === 'orders') { const data = await orderService.getOrders(); setOrders(data.data || []); }
    if (activeTab === 'wallet') { const [balance, history] = await Promise.all([walletService.getBalance(), walletService.getTransactions({ per_page: 10 })]); setWalletBalance(balance.balance); setTransactions(history.data || []); }
  }, isAuthenticated && ['orders', 'wallet'].includes(activeTab));

  useLiveRefresh(async () => {
    if (!isAuthenticated) return;
    const data = await userService.getProfile();
    setAccountCounts({
      orders: data.counts?.orders ?? 0,
      saved_items: data.counts?.saved_items ?? 0,
      followed_stores: data.counts?.followed_stores ?? 0,
    });
  }, isAuthenticated, 30000);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/profile');
      return;
    }

    if (isAuthenticated) {
      const load = async () => {
        try {
          setLoading(true);
          const data = await userService.getProfile();
          setProfile(data.user);
          setAccountCounts({
            orders: data.counts?.orders ?? 0,
            saved_items: data.counts?.saved_items ?? 0,
            followed_stores: data.counts?.followed_stores ?? 0,
          });
        } catch (e: any) {
          setError(e?.response?.data?.message ?? "Failed to load profile");
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [isAuthenticated, authLoading, router]);

  // Load orders when orders tab is active
  useEffect(() => {
    if (isAuthenticated && activeTab === "orders") {
      loadOrders();
    }
  }, [isAuthenticated, activeTab]);

  // Load wallet balance when wallet tab is active
  useEffect(() => {
    if (isAuthenticated && activeTab === "wallet") {
      loadWalletBalance();
      loadTransactions();
    }
  }, [isAuthenticated, activeTab]);

  const loadTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const data = await walletService.getTransactions({ per_page: 10 });
      setTransactions(data.data || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadWalletBalance = async () => {
    try {
      setLoadingBalance(true);
      const data = await walletService.getBalance();
      setWalletBalance(data.balance);
    } catch (error) {
      console.error('Failed to load wallet balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleOrderClick = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsOrderModalOpen(true);
  };

  const handleOrderModalClose = () => {
    setIsOrderModalOpen(false);
    setSelectedOrderId(null);
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const data = await orderService.getOrders({ per_page: 10 });
      setOrders(data.data || []);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoadingOrders(false);
    }
  };

  const isNewOrder = (createdAt: string) => {
    const createdAtMs = new Date(createdAt).getTime();
    if (!Number.isFinite(createdAtMs)) return false;
    const hoursSinceCreated = (Date.now() - createdAtMs) / (1000 * 60 * 60);
    return hoursSinceCreated >= 0 && hoursSinceCreated <= 24;
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect is in progress)
  if (!isAuthenticated || !user) {
    return null;
  }

  // Sidebar menu configuration
  const menuItems: {
    id: AccountTab;
    label: string;
    description?: string;
    colorClass: string;
  }[] = [
    {
      id: "overview",
      label: "Profile",
      description: "Personal information & security",
      colorClass: "from-[#0066CC] to-[#0052a3]",
    },
    {
      id: "orders",
      label: "My Orders",
      description: "Track and manage orders",
      colorClass: "from-[#22c55e] to-[#16a34a]",
    },
    {
      id: "addresses",
      label: "Addresses",
      description: "Delivery details for checkout",
      colorClass: "from-[#06b6d4] to-[#0891b2]",
    },
    {
      id: "wallet",
      label: "Wallet",
      description: "Balance, top-up & withdraw",
      colorClass: "from-[#3b82f6] to-[#2563eb]",
    },
    {
      id: "saved",
      label: "Saved Items",
      description: "Wishlist & saved for later",
      colorClass: "from-[#f97316] to-[#ea580c]",
    },
    {
      id: "followed-stores",
      label: "Followed Stores",
      description: "Brands & stores you follow",
      colorClass: "from-[#a855f7] to-[#7c3aed]",
    },
    {
      id: "reviews",
      label: "Reviews",
      description: "Your product ratings",
      colorClass: "from-[#ec4899] to-[#db2777]",
    },
    {
      id: "referrals",
      label: "Referrals",
      description: "Invite friends & earn",
      colorClass: "from-[#14b8a6] to-[#0d9488]",
    },
    {
      id: "support",
      label: "Support",
      description: "Help & contact us",
      colorClass: "from-[#facc15] to-[#eab308]",
    },
    {
      id: "faqs",
      label: "FAQs",
      description: "Common buyer questions",
      colorClass: "from-[#64748b] to-[#475569]",
    },
  ];

  const renderContent = () => {
    if (!profile) {
      if (loading) {
        return (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6 flex items-center justify-center text-sm text-gray-600">
            Loading your account…
          </div>
        );
      }
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6 text-sm text-gray-600">
          We couldn't load your profile details right now. Please refresh the
          page or try again in a moment.
        </div>
      );
    }

    if (activeTab === "overview") {
      const profileImageUrl = profile.profile_image_url ? getFullImageUrl(profile.profile_image_url) : null;
      return (
        <>
          <div className="space-y-4 lg:hidden">
            <div className="rounded-2xl bg-gradient-to-br from-[#075985] to-[#0f766e] p-4 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-xl font-bold ring-2 ring-white/30">
                  {profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileImageUrl} alt={profile.name} className="h-full w-full object-cover" />
                  ) : (
                    profile.name?.charAt(0)?.toUpperCase() ?? 'U'
                  )}
                </div>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">Profile</p><h2 className="truncate text-lg font-bold">{profile.name}</h2><p className="truncate text-sm text-white/75">{profile.email}</p></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{ label: 'Orders', value: accountCounts.orders }, { label: 'Saved', value: accountCounts.saved_items }, { label: 'Stores', value: accountCounts.followed_stores }].map((stat) => <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center"><p className="text-lg font-bold text-slate-900">{stat.value}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p></div>)}
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3"><p className="text-sm font-bold text-slate-900">Personal details</p></div>
              <dl className="divide-y divide-slate-100 text-sm"><div className="px-4 py-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Full name</dt><dd className="mt-1 font-semibold text-slate-900">{profile.name}</dd></div><div className="px-4 py-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</dt><dd className="mt-1 break-all font-semibold text-slate-900">{profile.email}</dd></div><div className="px-4 py-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</dt><dd className="mt-1 font-semibold text-slate-900">{profile.phone || 'Not added yet'}</dd></div></dl>
            </div>
            <div className="grid grid-cols-2 gap-3"><Button onClick={() => setActiveTab('edit-profile')} size="sm">Edit profile</Button><Button onClick={() => router.push('/profile/change-password')} variant="outline" size="sm">Password</Button></div>
          </div>
          <div className="hidden space-y-5 lg:block">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#075985] via-[#087f8c] to-[#0f766e] p-6 text-white shadow-[0_20px_50px_rgba(8,127,140,0.2)] sm:p-8">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/15" />
            <div className="absolute -bottom-28 right-20 h-56 w-56 rounded-full border border-white/10" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/15 text-3xl font-bold ring-4 ring-white/20 shadow-xl">
                  {profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileImageUrl} alt={profile.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>{profile.name?.charAt(0)?.toUpperCase() ?? "U"}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Buyer profile</p>
                  <h2 className="mt-1 truncate text-2xl font-bold sm:text-3xl">{profile.name}</h2>
                  <p className="mt-1 truncate text-sm text-white/75">{profile.email}</p>
                  <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-50">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <Button onClick={() => setActiveTab("edit-profile")} variant="outline" size="md" className="!border-white/60 !bg-white !text-[#075985] hover:!bg-cyan-50">Edit profile</Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Orders placed", value: accountCounts.orders, tone: "bg-emerald-50 text-emerald-700", icon: "↗" },
              { label: "Saved items", value: accountCounts.saved_items, tone: "bg-orange-50 text-orange-700", icon: "♡" },
              { label: "Followed stores", value: accountCounts.followed_stores, tone: "bg-violet-50 text-violet-700", icon: "✦" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${stat.tone}`}>{stat.icon}</div>
                <p className="mt-4 text-2xl font-bold text-slate-950">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#087f8c]">Account details</p><h3 className="mt-1 text-xl font-bold text-slate-950">Your shopping identity</h3></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Active account</span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Full name</p><p className="mt-2 font-semibold text-slate-900">{profile.name}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Email address</p><p className="mt-2 break-all font-semibold text-slate-900">{profile.email}</p><p className="mt-1 text-xs text-slate-500">Account email cannot be changed.</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Phone number</p><p className="mt-2 font-semibold text-slate-900">{profile.phone || "Not added yet"}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Saved addresses</p><p className="mt-2 font-semibold text-slate-900">Ready to manage in one place</p></div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <Button onClick={() => setActiveTab("addresses")} variant="secondary" size="md">Manage addresses</Button>
              <Button onClick={() => router.push("/profile/change-password")} variant="outline" size="md">Change password</Button>
            </div>
          </div>
          </div>
        </>
      );
    }

    if (activeTab === "edit-profile") {
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Edit profile
              </p>
              <p className="text-xs text-gray-500">
                Update your name, contact number and profile picture.
              </p>
            </div>
          </div>
          <div className="px-5 sm:px-6 py-6">
            <EditProfileForm onProfileUpdated={(updatedProfile) => setProfile(updatedProfile)} />
          </div>
        </div>
      );
    }

    if (activeTab === "addresses") {
      return <AddressesPanel defaultName={profile.name} onBack={() => { setActiveTab("overview"); setMobileSectionOpen(false); }} />;
    }

    if (activeTab === "orders") {
      const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-800',
          awaiting_payment: 'bg-blue-100 text-blue-800',
          rejected: 'bg-red-100 text-red-800',
          paid: 'bg-green-100 text-green-800',
          out_for_delivery: 'bg-purple-100 text-purple-800',
          delivered: 'bg-gray-100 text-gray-800',
          cancelled: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
      };

      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                My Orders
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Track your recent orders, returns and reorders.
              </p>
            </div>
            <Button
              onClick={() => router.push("/orders")}
              variant="outline"
              size="sm"
            >
              View all orders
            </Button>
          </div>
          
          <div className="p-5 sm:p-6">
            {loadingOrders ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                <p className="text-sm text-gray-600 mb-4">
                  You don't have any orders yet. Once you place an order, you'll see
                  it here with tracking and status information.
                </p>
                <Button
                  onClick={() => router.push("/")}
                  variant="primary"
                  size="sm"
                >
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-[#0066CC] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          Order #{order.order_no}
                          {isNewOrder(order.created_at) && (
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full bg-[#ef4444] animate-pulse"
                              title="New order"
                              aria-label="New order"
                            />
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#0066CC]">
                          €{Number(order.grand_total || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {order.store_orders.length} store{order.store_orders.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      {order.store_orders.slice(0, 2).map((storeOrder) => (
                        <div
                          key={storeOrder.id}
                          className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{storeOrder.store.name}</p>
                            <p className="text-xs text-gray-600">
                              {storeOrder.items.length} item{storeOrder.items.length > 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                storeOrder.status
                              )}`}
                            >
                              {storeOrder.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                      {order.store_orders.length > 2 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{order.store_orders.length - 2} more store{order.store_orders.length - 2 > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleOrderClick(order.id)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-[#0066CC] hover:text-[#0052a3] transition-colors"
                    >
                      View Details
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === "wallet") {
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Wallet</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Manage your wallet balance, top-up and withdraw funds.
              </p>
            </div>
          </div>
          
          <div className="p-5 sm:p-6">
            {loadingBalance ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066CC]"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Balance Card */}
                <div className="bg-gradient-to-r from-[#0066CC] to-[#0052a3] rounded-xl p-6 text-white">
                  <p className="text-sm text-white/80 mb-2">Available Balance</p>
                  <p className="text-4xl font-bold mb-4">
                    €{walletBalance !== null ? Number(walletBalance || 0).toFixed(2) : '0.00'}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => router.push('/profile/top-up')}
                      variant="outline"
                      size="sm"
                      className="!border-white !bg-white !text-[#0066CC] hover:!bg-gray-100 hover:!text-[#0052a3]"
                    >
                      Top Up
                    </Button>
                    <Button
                      onClick={() => router.push('/profile/withdraw')}
                      variant="outline"
                      size="sm"
                      className="!border-white !bg-transparent !text-white hover:!bg-white/10 hover:!text-white"
                    >
                      Withdraw
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => router.push('/profile/top-up')}
                    className="bg-gradient-to-br from-[#0066CC]/10 to-[#0066CC]/5 border-2 border-[#0066CC]/20 rounded-xl p-5 hover:border-[#0066CC]/40 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#0066CC]/10 flex items-center justify-center mb-3 group-hover:bg-[#0066CC]/20 transition-colors">
                      <svg className="w-6 h-6 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="font-bold text-gray-900 mb-1">Top Up</p>
                    <p className="text-xs text-gray-600">Add funds to wallet</p>
                  </button>
                  <button
                    onClick={() => router.push('/profile/withdraw')}
                    className="bg-gradient-to-br from-[#00CC66]/10 to-[#00CC66]/5 border-2 border-[#00CC66]/20 rounded-xl p-5 hover:border-[#00CC66]/40 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#00CC66]/10 flex items-center justify-center mb-3 group-hover:bg-[#00CC66]/20 transition-colors">
                      <svg className="w-6 h-6 text-[#00CC66]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <p className="font-bold text-gray-900 mb-1">Withdraw</p>
                    <p className="text-xs text-gray-600">Transfer to bank</p>
                  </button>
                </div>

                {/* Transaction History */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Transactions</h3>
                  {loadingTransactions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0066CC]"></div>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-[#0066CC]/30 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                transaction.type === 'top_up' 
                                  ? 'bg-green-100' 
                                  : transaction.type === 'withdraw'
                                  ? 'bg-blue-100'
                                  : 'bg-gray-100'
                              }`}>
                                {transaction.type === 'top_up' ? (
                                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                ) : transaction.type === 'withdraw' ? (
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm">
                                  {transaction.type === 'referral_reward'
                                    ? `Referral Reward — ${(transaction.meta as any)?.products?.join(', ') || 'Eligible order'}`
                                    : transaction.type === 'referral_reward_reversal'
                                    ? `Referral Reward Reversal — ${(transaction.meta as any)?.products?.join(', ') || 'Eligible order'}`
                                    : transaction.description || transaction.type.replace('_', ' ')}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(transaction.created_at).toLocaleDateString()} · {transaction.meta?.payment_method || 'wallet'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-sm ${
                              transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''}€{Math.abs(transaction.amount).toFixed(2)}
                            </p>
                            <Badge
                              variant={
                                (transaction.status === 'completed' || transaction.status === 'success') ? 'success' :
                                transaction.status === 'pending' ? 'warning' : 'error'
                              }
                              size="sm"
                              className="mt-1"
                            >
                              {transaction.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-700">
                    <strong>Note:</strong> Wallet funds can be used for faster checkout. Minimum withdrawal amount is €10.00.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === "saved") return <SavedItemsPanel onCountChange={(saved_items) => setAccountCounts((current) => ({ ...current, saved_items }))} />;
    /* Legacy saved placeholder retained below for reference only.
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Saved Items
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Products you’ve added to your wishlist or saved for later.
          </p>
        </div>
      );
    */

    if (String(activeTab) === "followed-stores") return <FollowedStoresPanel onCountChange={(followed_stores) => setAccountCounts((current) => ({ ...current, followed_stores }))} />;
    if (activeTab === "followed-stores") {
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Followed Stores
          </h2>
          <p className="text-sm text-gray-600">
            Follow your favourite optical stores to get quick access to their
            latest products and promotions. This section will show them once
            you start following stores.
          </p>
        </div>
      );
    }

    if (String(activeTab) === "reviews") return <ReviewsPanel />;
    if (activeTab === "reviews") {
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Your Reviews
          </h2>
          <p className="text-sm text-gray-600">
            Keep track of the products you’ve reviewed. You haven't submitted
            any reviews yet.
          </p>
        </div>
      );
    }

    if (activeTab === "referrals") {
      return <ReferralPanel />;
    }

    if (String(activeTab) === "support") return <SupportPanel />;
    if (activeTab === "support") {
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Support
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Need help with an order or your account? Reach out to our support
            team.
          </p>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              • Email:{" "}
              <a
                href="mailto:support@example.com"
                className="text-[#0066CC] hover:underline"
              >
                support@example.com
              </a>
            </p>
            <p>• Support hours: 9:00 AM – 6:00 PM (local time)</p>
          </div>
        </div>
      );
    }

    // FAQs
    return (
      <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">FAQs</h2>
        <p className="text-sm text-gray-600 mb-4">
          Quick answers to common questions from buyers.
        </p>
        <ul className="space-y-3 text-sm text-gray-700">
          <li>
            <span className="font-semibold">How do I track my order?</span>
            <br />
            Go to the <span className="font-medium">My Orders</span> tab and
            open any order to see tracking details.
          </li>
          <li>
            <span className="font-semibold">
              How can I change my delivery address?
            </span>
            <br />
            Use the <span className="font-medium">Manage addresses</span>{" "}
            button in the Profile tab.
          </li>
          <li>
            <span className="font-semibold">
              How do I change my email or password?
            </span>
            <br />
            From the Profile tab, choose{" "}
            <span className="font-medium">Edit profile</span> or{" "}
            <span className="font-medium">Change password</span>.
          </li>
        </ul>
      </div>
    );
  };

  const openMobileSection = (tab: AccountTab) => {
    setActiveTab(tab);
    setMobileSectionOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeMobileSection = () => {
    setActiveTab('overview');
    setMobileSectionOpen(false);
    router.replace('/profile', { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const countForTab = (tab: AccountTab) => {
    if (tab === 'orders') return accountCounts.orders;
    if (tab === 'saved') return accountCounts.saved_items;
    if (tab === 'followed-stores') return accountCounts.followed_stores;
    return null;
  };

  return (
    <>
      <div className="lg:hidden">
        {mobileSectionOpen ? (
          <section className="min-h-[calc(100vh-10rem)] bg-slate-50 pb-6">
            <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur">
              <button type="button" onClick={closeMobileSection} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700" aria-label="Back to account menu"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 18-6-6 6-6" /></svg></button>
              <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0066CC]">Your account</p><h1 className="truncate text-base font-bold text-slate-950">{activeTab === 'edit-profile' ? 'Edit profile' : menuItems.find((item) => item.id === activeTab)?.label || 'Profile'}</h1></div>
            </div>
            <div className="px-3 py-4">{error && <div className="mb-4"><Alert type="error" message={error} /></div>}{renderContent()}</div>
          </section>
        ) : (
          <section className="min-h-[calc(100vh-10rem)] bg-slate-50 px-3 py-4">
            <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0066CC]">Your account</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Hello, {profile?.name?.split(' ')[0] || 'there'}</h1><p className="mt-1 text-sm text-slate-500">Manage your shopping account.</p></div><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#0066CC] to-[#0f766e] font-bold text-white shadow-sm">{profile?.profile_image_url ? <img src={getFullImageUrl(profile.profile_image_url)} alt="Profile" className="h-full w-full object-cover" /> : profile?.name?.charAt(0)?.toUpperCase() || 'U'}</div></div>
            {error && <div className="mb-4"><Alert type="error" message={error} /></div>}
            <nav className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {menuItems.map((item, index) => { const count = countForTab(item.id); return <button key={item.id} type="button" onClick={() => openMobileSection(item.id)} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 ${index ? 'border-t border-slate-100' : ''}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${item.colorClass}`}><AccountMenuIcon tab={item.id} /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">{item.label}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{item.description}</span></span>{count !== null && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{count}</span>}<span className="text-lg text-slate-400">›</span></button>; })}
            </nav>
          </section>
        )}
      </div>

      <div className="hidden w-full max-w-6xl mx-auto px-3 py-8 sm:px-4 lg:block lg:px-0">
        <div className="mb-5 sm:mb-7">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
              Your Account
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your orders, personal information, saved items and support.
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} />
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-5">
            {/* Sidebar */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden mb-4">
                <div className="px-4 py-4 bg-gradient-to-r from-[#0066CC] to-[#0052a3] text-white flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold ring-2 ring-white/30">
                    {profile?.profile_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getFullImageUrl(profile.profile_image_url)} alt={profile.name} className="h-full w-full object-cover" />
                    ) : (
                      profile?.name?.charAt(0)?.toUpperCase() ?? "U"
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {profile?.name ?? "Buyer account"}
                    </p>
                    <p className="text-xs text-white/80">
                      {profile?.email ?? "Signed-in buyer"}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-700 bg-gray-50 border-t border-gray-100">
                  <div className="rounded-xl bg-white border border-gray-200 px-3 py-2">
                    <p className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
                      Orders
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{accountCounts.orders}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-200 px-3 py-2">
                    <p className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
                      Saved items
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{accountCounts.saved_items}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-200 px-3 py-2">
                    <p className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
                      Followed stores
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{accountCounts.followed_stores}</p>
                  </div>
                </div>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full text-left rounded-2xl border px-4 py-3 text-sm flex flex-col transition-all ${
                        isActive
                          ? "border-[#0066CC] bg-gradient-to-r from-[#0066CC]/10 to-[#00CC66]/5 shadow-sm"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <span className="font-semibold text-gray-900">
                        {item.label}
                      </span>
                      {item.description && (
                        <span className="mt-0.5 text-xs text-gray-500">
                          {item.description}
                        </span>
                      )}
                      <span
                        className={`mt-2 h-1.5 w-12 rounded-full bg-gradient-to-r ${
                          isActive
                            ? item.colorClass
                            : "from-gray-200 to-gray-200"
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Main content */}
            <section className="flex-1 min-w-0">{renderContent()}</section>
          </div>
        </div>
      {/* Order Details Modal */}
      {selectedOrderId && (
        <OrderDetailsModal
          isOpen={isOrderModalOpen}
          onClose={handleOrderModalClose}
          orderId={selectedOrderId}
        />
      )}
    </>
  );
}
