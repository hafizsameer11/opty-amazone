"use client";

import { Suspense, useEffect, useState } from "react";
import Link from 'next/link';
import { useRouter, useSearchParams } from "next/navigation";
import { userService, type ProfileResponse } from "@/services/user-service";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { isSellerProfileComplete } from "@/lib/seller-profile-gate";
import { displayProfileImageUrl } from "@/lib/profile-image-url";
import type { User } from "@/types/auth";
import type { Store } from "@/types/store";
import { StoreService } from "@/services/store-service";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EditProfileForm from "@/components/profile/EditProfileForm";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import DataPanel from "@/components/profile/DataPanel";
import FollowersPanel from "@/components/profile/FollowersPanel";
import SupportPanel from "@/components/profile/SupportPanel";
import ReviewsPanel from "@/components/profile/ReviewsPanel";
import StoreSettingsPanel from "@/components/profile/StoreSettingsPanel";

type AccountTab =
  | "overview"
  | "edit-profile"
  | "change-password"
  | "products"
  | "orders"
  | "warehouse-orders"
  | "analytics"
  | "store-settings"
  | "followers"
  | "reviews"
  | "support"
  | "faqs";

const ACCOUNT_SHORTCUT_TABS: AccountTab[] = [
  "products",
  "orders",
  "analytics",
  "store-settings",
];

function ProfilePageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProfileResponse["user"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AccountTab>("overview");
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [sellerStats, setSellerStats] = useState({ products: 0, orders: 0, followers: 0, revenue: 0 });

  const showSetupBanner =
    searchParams.get("setup") === "1" &&
    Boolean(user && !isSellerProfileComplete(user));
  const accountShortcutsLocked = Boolean(
    user && !isSellerProfileComplete(user)
  );

  useEffect(() => {
    if (!accountShortcutsLocked) return;
    if (ACCOUNT_SHORTCUT_TABS.includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [accountShortcutsLocked, activeTab]);

  useEffect(() => {
    if (searchParams.get("tab") === "followers") {
      setActiveTab("followers");
      setMobileSectionOpen(true);
    }
  }, [searchParams]);

  const openMobileSection = (tab: AccountTab) => {
    if (tab === "warehouse-orders") {
      router.push("/warehouse/orders");
      return;
    }
    setActiveTab(tab);
    setMobileSectionOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeMobileSection = () => {
    setMobileSectionOpen(false);
    setActiveTab("overview");
    router.replace("/profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadAccountData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const profileResponse = await userService.getProfile();
      setProfile(profileResponse.user);
      const [storeResponse, dashboardResponse] = await Promise.all([
        StoreService.getStore(),
        StoreService.getDashboard(),
      ]);
      setStore(storeResponse.data?.store ?? null);
      setSellerStats({
        products: dashboardResponse.data?.total_products ?? 0,
        orders: dashboardResponse.data?.total_orders ?? 0,
        followers: dashboardResponse.data?.total_followers ?? 0,
        revenue: dashboardResponse.data?.total_revenue ?? 0,
      });
    } catch (e: any) {
      if (!silent) setError(e?.response?.data?.message ?? "Failed to load profile");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccountData();
  }, []);

  useLiveRefresh(() => loadAccountData(true), Boolean(user), 15000);

  if (!user) {
    return (
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 lg:px-0 py-8">
        <div className="rounded-2xl bg-white shadow-sm border border-red-100 p-5 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">
            My Profile
          </h1>
          <Alert
            type="error"
            message="You must be logged in to view your profile."
          />
        </div>
      </div>
    );
  }

  // Sidebar menu configuration
  const menuItems: {
    id: AccountTab;
    label: string;
    description?: string;
    colorClass: string;
    icon: string;
  }[] = [
    {
      id: "overview",
      label: t('profile.profileTab'),
      description: t('profile.profileTabDescription'),
      colorClass: "from-[#0066CC] to-[#0052a3]",
      icon: "◉",
    },
    {
      id: "products",
      label: t('profile.productsTab'),
      description: t('profile.productsTabDescription'),
      colorClass: "from-[#22c55e] to-[#16a34a]",
      icon: "▦",
    },
    {
      id: "orders",
      label: t('profile.ordersTab'),
      description: t('profile.ordersTabDescription'),
      colorClass: "from-[#f97316] to-[#ea580c]",
      icon: "▤",
    },
    {
      id: "warehouse-orders",
      label: "Warehouse Orders",
      description: "View supplies purchased from the platform warehouse",
      colorClass: "from-cyan-500 to-blue-600",
      icon: "▣",
    },
    {
      id: "analytics",
      label: t('profile.analyticsTab'),
      description: t('profile.analyticsTabDescription'),
      colorClass: "from-[#a855f7] to-[#7c3aed]",
      icon: "⌁",
    },
    {
      id: "store-settings",
      label: t('profile.storeSettingsTab'),
      description: t('profile.storeSettingsTabDescription'),
      colorClass: "from-[#ec4899] to-[#db2777]",
      icon: "⌂",
    },
    {
      id: "followers",
      label: t('profile.followersTab'),
      description: t('profile.followersTabDescription'),
      colorClass: "from-violet-500 to-fuchsia-600",
      icon: "♧",
    },
    {
      id: "reviews",
      label: t('profile.reviewsTab'),
      description: t('profile.reviewsTabDescription'),
      colorClass: "from-[#f59e0b] to-[#d97706]",
      icon: "★",
    },
    {
      id: "support",
      label: t('profile.supportTab'),
      description: t('profile.supportTabDescription'),
      colorClass: "from-[#facc15] to-[#eab308]",
      icon: "?",
    },
    {
      id: "faqs",
      label: t('profile.faqsTab'),
      description: t('profile.faqsTabDescription'),
      colorClass: "from-[#64748b] to-[#475569]",
      icon: "i",
    },
  ];

  const renderContent = () => {
    if (!profile) {
      if (loading) {
        return (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6 flex items-center justify-center text-sm text-gray-600">
            {t('profile.loadingAccount')}
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
      const overviewAvatarSrc = displayProfileImageUrl(
        profile.profile_image_url
      );
      const storeProfile = store?.meta?.profile;
      return (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#062b5c] via-[#075985] to-[#0f766e] p-6 text-white shadow-[0_20px_50px_rgba(7,89,133,0.2)] sm:p-8">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/15" />
            <div className="absolute -bottom-28 right-20 h-56 w-56 rounded-full border border-white/10" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-5">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/15 text-3xl font-bold ring-4 ring-white/20 shadow-xl">
                  {overviewAvatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={overviewAvatarSrc} alt={profile.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>{profile.name?.charAt(0)?.toUpperCase() ?? "S"}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">{t('profile.sellerAccount')}</p>
                  <h2 className="mt-1 truncate text-2xl font-bold sm:text-3xl">{profile.name}</h2>
                  <p className="mt-1 truncate text-sm text-white/75">{profile.email}</p>
                  <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-50">{store?.name || "Your optical store"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setActiveTab("edit-profile")} variant="outline" size="md" className="!border-white/60 !bg-white !text-[#075985] hover:!bg-cyan-50">{t('profile.editAccount')}</Button>
                <Button onClick={() => router.push("/store/edit")} variant="outline" size="md" className="!border-white/60 !bg-white/10 !text-white hover:!bg-white/20">{t('profile.storeProfile')}</Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Products", value: sellerStats.products, tone: "bg-blue-50 text-blue-700", icon: "▦" },
              { label: "Orders", value: sellerStats.orders, tone: "bg-emerald-50 text-emerald-700", icon: "↗" },
              { label: "Followers", value: sellerStats.followers, tone: "bg-violet-50 text-violet-700", icon: "♡" },
              { label: "Delivered revenue", value: `€${sellerStats.revenue.toFixed(2)}`, tone: "bg-amber-50 text-amber-700", icon: "€" },
            ].map((stat) => {
              const content = <>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${stat.tone}`}>{stat.icon}</div>
                <p className="mt-4 text-2xl font-bold text-slate-950">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </>;

              return stat.label === "Followers" ? (
                <button key={stat.label} type="button" onClick={() => setActiveTab("followers")} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md" title={t('profile.viewFollowers')}>
                  {content}
                </button>
              ) : (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{content}</div>
              );
            })}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0066CC]">{t('profile.accountDetails')}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{t('profile.professionalProfile')}</h3></div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${store?.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{store?.status === 'active' ? 'Store active' : store?.onboarding_status || 'Profile in progress'}</span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                [t('profile.fullName'), profile.name],
                [t('profile.loginEmail'), profile.email],
                [t('profile.phoneNumber'), profile.phone || t('profile.notAdded')],
                [t('profile.storeName'), store?.name || t('profile.notSet')],
                [t('profile.storeEmail'), store?.email || t('profile.notAdded')],
                [t('profile.storePhone'), store?.phone || t('profile.notAdded')],
                [t('profile.businessType'), storeProfile?.business_type || t('profile.notAdded')],
                [t('profile.registrationNumber'), storeProfile?.registration_number || t('profile.notAdded')],
                [t('profile.businessLocation'), [storeProfile?.city, storeProfile?.country].filter(Boolean).join(', ') || t('profile.notAdded')],
                [t('profile.businessAddress'), storeProfile?.address || t('profile.notAdded')],
                [t('profile.website'), storeProfile?.website || t('profile.notAdded')],
              ].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 break-words font-semibold text-slate-900">{value}</p>{label === t('profile.loginEmail') && <p className="mt-1 text-xs text-slate-500">{t('profile.loginEmailCannotChange')}</p>}</div>)}
            </div>
            {store?.description && <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('profile.storeDescription')}</p><p className="mt-2 text-sm leading-6 text-slate-600">{store.description}</p></div>}
            {storeProfile?.tagline && <p className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 text-sm font-medium text-cyan-900">{storeProfile.tagline}</p>}
            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <Button onClick={() => setActiveTab("change-password")} variant="outline" size="md">{t('profile.changePassword')}</Button>
              <Button onClick={() => router.push("/store/edit")} variant="secondary" size="md">{t('profile.manageStore')}</Button>
            </div>
          </div>
        </div>
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
                Update your name, phone number and profile photo. Your login email stays fixed.
              </p>
            </div>
          </div>
          <div className="px-5 sm:px-6 py-6">
            <EditProfileForm
              onProfileSynced={(u: User) =>
                setProfile((p) => (p ? { ...p, ...u } : { ...u }))
              }
            />
          </div>
        </div>
      );
    }

    if (activeTab === "change-password") {
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Change password
              </p>
              <p className="text-xs text-gray-500">
                Update your account password for better security.
              </p>
            </div>
          </div>
          <div className="px-5 sm:px-6 py-6">
            <ChangePasswordForm />
          </div>
        </div>
      );
    }

    if (String(activeTab) === "products") return <DataPanel kind="products" />;
    if (activeTab === "products") {
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                My Products
              </h2>
              <p className="text-sm text-gray-600">
                Manage your product listings, inventory and pricing.
              </p>
            </div>
            <Button
              onClick={() => router.push("/products")}
              variant="outline"
              size="sm"
            >
              View all products
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            You haven't added any products yet. Start by creating your first
            product listing.
          </p>
        </div>
      );
    }

    if (String(activeTab) === "orders") return <DataPanel kind="orders" />;
    if (activeTab === "orders") {
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Orders
              </h2>
              <p className="text-sm text-gray-600">
                Track and manage customer orders.
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
          <p className="text-sm text-gray-600">
            You don't have any orders yet. Once customers place orders, you'll
            see them here with details and status information.
          </p>
        </div>
      );
    }

    if (activeTab === "warehouse-orders") {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#0066CC]">Warehouse</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Warehouse Orders</h2>
          <p className="mt-2 text-sm text-slate-600">Review your separate wholesale supply purchases, payment details and delivery status.</p>
          <Button className="mt-5" onClick={() => router.push('/warehouse/orders')}>Open Warehouse Orders</Button>
        </div>
      );
    }

    if (String(activeTab) === "analytics") return <DataPanel kind="analytics" />;
    if (activeTab === "analytics") {
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Analytics
          </h2>
          <p className="text-sm text-gray-600">
            View your sales performance, revenue metrics, and product analytics.
            This section will show detailed analytics once you start making
            sales.
          </p>
        </div>
      );
    }

    if (activeTab === "store-settings") return <StoreSettingsPanel />;

    if (activeTab === "followers") return <FollowersPanel />;

    if (activeTab === "reviews") return <ReviewsPanel />;

    if (String(activeTab) === "support") return <SupportPanel />;
    if (activeTab === "support") {
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Support
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Need help with your store or account? Reach out to our support
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
            <p>{t('profile.supportHours')}</p>
          </div>
        </div>
      );
    }

    // FAQs
    return (
      <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('profile.faqs')}</h2>
        <p className="text-sm text-gray-600 mb-4">
          Quick answers to common questions from sellers.
        </p>
        <ul className="space-y-3 text-sm text-gray-700">
          <li>
            <span className="font-semibold">How do I add products?</span>
            <br />
            Go to the <span className="font-medium">My Products</span> tab and
            click "Add Product" to create your first listing.
          </li>
          <li>
            <span className="font-semibold">
              How do I manage my store settings?
            </span>
            <br />
            Use the <span className="font-medium">Store Settings</span> tab to
            configure your store information and policies.
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
      <Link href="/wallet" className="hidden px-6 py-3 text-blue-700 font-semibold lg:block">{t('profile.walletEarnings')}</Link>
          <main className="flex-1 overflow-y-auto">
            <div className="lg:hidden px-3 py-4 pb-24">
              {mobileSectionOpen ? (
                <section className="min-h-[calc(100dvh-5rem)]">
                  <div className="sticky top-0 z-20 -mx-3 mb-4 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur">
                    <button type="button" onClick={closeMobileSection} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700" aria-label="Back to account menu"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 18l-6-6 6-6" /></svg></button>
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066CC]">Seller account</p><h1 className="truncate text-base font-bold text-slate-950">{activeTab === 'edit-profile' ? 'Edit profile' : menuItems.find((item) => item.id === activeTab)?.label || 'Profile'}</h1></div>
                  </div>
                  <div className="min-w-0">{renderContent()}</div>
                </section>
              ) : (
                <section>
                  <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#062b5c] via-[#075985] to-[#0f766e] p-4 text-white shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 text-xl font-bold ring-2 ring-white/20">
                        {profile?.profile_image_url ? <img src={displayProfileImageUrl(profile.profile_image_url) || undefined} alt="" className="h-full w-full object-cover" /> : profile?.name?.charAt(0)?.toUpperCase() ?? 'S'}
                      </div>
                      <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-100">Seller account</p><h1 className="mt-0.5 truncate text-lg font-bold">{profile?.name || user?.name || 'Seller account'}</h1><p className="mt-0.5 truncate text-xs text-white/75">{store?.name || profile?.email || user?.email}</p></div>
                      <button type="button" onClick={() => openMobileSection('edit-profile')} className="rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white">Edit</button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 py-2.5 text-center"><div><p className="text-base font-bold">{sellerStats.products}</p><p className="text-[10px] text-cyan-100">Products</p></div><div><p className="text-base font-bold">{sellerStats.orders}</p><p className="text-[10px] text-cyan-100">Orders</p></div><div><p className="text-base font-bold">{sellerStats.followers}</p><p className="text-[10px] text-cyan-100">Followers</p></div></div>
                  </div>
                  <div className="mt-5"><p className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Manage your business</p><nav className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">{menuItems.map((item) => {
                    const tabLocked = accountShortcutsLocked && ACCOUNT_SHORTCUT_TABS.includes(item.id);
                    return <button key={item.id} type="button" disabled={tabLocked} title={tabLocked ? t('completeProfileNavHint') : undefined} onClick={() => !tabLocked && openMobileSection(item.id)} className={`flex w-full items-center gap-3 px-3 py-3.5 text-left transition ${tabLocked ? 'cursor-not-allowed opacity-45' : 'hover:bg-slate-50'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white ${item.colorClass}`}>{item.icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{item.label}</span>{item.description && <span className="mt-0.5 block truncate text-xs text-slate-500">{item.description}</span>}</span><span className="text-lg text-slate-400">›</span></button>;
                  })}</nav></div>
                </section>
              )}
            </div>
            <div className="hidden py-6 lg:block">
              <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8">
                <div className="mb-5 sm:mb-7">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                    {t('profile.yourAccount')}
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    {t('profile.accountDescription')}
                  </p>
                </div>

                {error && (
                  <div className="mb-4">
                    <Alert type="error" message={error} />
                  </div>
                )}

                {showSetupBanner && (
                  <div className="mb-4">
                    <Alert
                      type="error"
                      message={`${t("profileSetupTitle")}: ${t("profileSetupBody")}`}
                    />
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
                  <img src={displayProfileImageUrl(profile.profile_image_url) || undefined} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  profile?.name?.charAt(0)?.toUpperCase() ?? "S"
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {profile?.name ?? "Seller account"}
                </p>
                <p className="text-xs text-white/80">
                  {profile?.email ?? "Signed-in seller"}
                </p>
              </div>
            </div>
            <div className="px-3 py-3 grid grid-cols-2 gap-2 text-xs text-gray-700 bg-gray-50 border-t border-gray-100">
              <div className="rounded-xl bg-white border border-gray-200 px-3 py-2">
                <p className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
                  Products
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{sellerStats.products}</p>
              </div>
              <div className="rounded-xl bg-white border border-gray-200 px-3 py-2">
                <p className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
                  Orders
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{sellerStats.orders}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              const tabLocked =
                accountShortcutsLocked &&
                ACCOUNT_SHORTCUT_TABS.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={tabLocked}
                  title={tabLocked ? t("completeProfileNavHint") : undefined}
                  onClick={() => {
                    if (tabLocked) return;
                    setActiveTab(item.id);
                  }}
                  className={`w-full text-left rounded-2xl border px-4 py-3 text-sm flex flex-col transition-all ${
                    isActive
                      ? "border-[#0066CC] bg-gradient-to-r from-[#0066CC]/10 to-[#00CC66]/5 shadow-sm"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  } ${tabLocked ? "opacity-50 cursor-not-allowed hover:bg-white" : ""}`}
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
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">Loading profile…</p>
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
