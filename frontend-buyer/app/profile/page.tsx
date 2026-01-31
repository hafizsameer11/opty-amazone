"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { userService, type ProfileResponse } from "../../services/user-service";
import { orderService, type Order } from "../../services/order-service";
import { useAuth } from "../../contexts/AuthContext";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EditProfileForm from "@/components/profile/EditProfileForm";

type AccountTab =
  | "overview"
  | "edit-profile"
  | "orders"
  | "saved"
  | "followed-stores"
  | "reviews"
  | "referrals"
  | "support"
  | "faqs";

export default function ProfilePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse["user"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AccountTab>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

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

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Profile overview
              </p>
              <p className="text-xs text-gray-500">
                Update your personal information and account security.
              </p>
            </div>
          </div>
          <div className="px-5 sm:px-6 py-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-[#0066CC]/10 flex items-center justify-center text-lg font-semibold text-[#0066CC] overflow-hidden">
                  {profile.profile_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.profile_image_url}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{profile.name?.charAt(0) ?? "U"}</span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{profile.name}</p>
                  <p className="text-sm text-gray-600 break-all">
                    {profile.email}
                  </p>
                  {profile.phone && (
                    <p className="text-sm text-gray-600">
                      Phone: {profile.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Full name
                </p>
                <p className="text-gray-900">{profile.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Email address
                </p>
                <p className="text-gray-900 break-all">{profile.email}</p>
              </div>
              {profile.phone && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Phone number
                  </p>
                  <p className="text-gray-900">{profile.phone}</p>
                </div>
              )}
              {profile.city && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    City
                  </p>
                  <p className="text-gray-900">{profile.city}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <Button
                onClick={() => setActiveTab("edit-profile")}
                variant="secondary"
                size="md"
              >
                Edit profile
              </Button>
              <Button
                onClick={() => router.push("/profile/change-password")}
                variant="outline"
                size="md"
              >
                Change password
              </Button>
              <Button
                onClick={() => router.push("/profile/addresses")}
                variant="outline"
                size="md"
              >
                Manage addresses
              </Button>
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
                Update your name, email address and phone number.
              </p>
            </div>
          </div>
          <div className="px-5 sm:px-6 py-6">
            <EditProfileForm />
          </div>
        </div>
      );
    }

    if (activeTab === "orders") {
      const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-800',
          accepted: 'bg-blue-100 text-blue-800',
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
                        <h3 className="font-semibold text-gray-900">
                          Order #{order.order_no}
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

                    <Link
                      href={`/orders/${order.id}`}
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
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === "saved") {
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Saved Items
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Products you’ve added to your wishlist or saved for later.
          </p>
          <Button
            onClick={() => router.push("/wishlist")}
            variant="outline"
            size="sm"
          >
            Go to wishlist
          </Button>
        </div>
      );
    }

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
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Referrals
          </h2>
          <p className="text-sm text-gray-600">
            In the future you’ll be able to invite friends and earn rewards for
            every successful signup or order. For now, this section is a
            placeholder.
          </p>
        </div>
      );
    }

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
      <Header />
      
      <main className="flex-1">
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-0 py-8">
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
                  <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold">
                    {profile?.name?.charAt(0) ?? "U"}
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
                <div className="px-3 py-3 grid grid-cols-2 gap-2 text-xs text-gray-700 bg-gray-50 border-t border-gray-100">
                  <div className="rounded-xl bg-white border border-gray-200 px-3 py-2">
                    <p className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
                      Orders
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">0</p>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-200 px-3 py-2">
                    <p className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
                      Saved items
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">0</p>
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
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}

