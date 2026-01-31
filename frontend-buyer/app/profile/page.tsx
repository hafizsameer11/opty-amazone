"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { userService, type ProfileResponse } from "../../services/user-service";
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
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse["user"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AccountTab>("overview");

  useEffect(() => {
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
  }, []);

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
      return (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                My Orders
              </h2>
              <p className="text-sm text-gray-600">
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
          <p className="text-sm text-gray-600">
            You don't have any orders yet. Once you place an order, you’ll see
            it here with tracking and status information.
          </p>
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
  );
}

