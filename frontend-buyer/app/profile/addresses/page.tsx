"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { userService, type Address } from "../../../services/user-service";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { useAuth } from "@/contexts/AuthContext";

export default function AddressesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/profile/addresses');
      return;
    }
  }, [isAuthenticated, authLoading, router]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await userService.getAddresses();
      setAddresses(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      load();
    }
  }, [isAuthenticated]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      await userService.deleteAddress(id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to delete address");
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await userService.setDefaultAddress(id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to set default address");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Addresses</h1>
              <p className="text-gray-600">Manage your shipping and billing addresses</p>
            </div>
            <Link href="/profile/addresses/new">
              <Button className="bg-[#0066CC] hover:bg-[#0052a3] text-white">
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Address
              </Button>
            </Link>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6">
              <Alert type="error" message={error} />
            </div>
          )}

          {/* Addresses List */}
          {addresses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No addresses yet</h3>
              <p className="text-gray-600 mb-6">Add your first address to get started with faster checkout.</p>
              <Link href="/profile/addresses/new">
                <Button className="bg-[#0066CC] hover:bg-[#0052a3] text-white">
                  Add Your First Address
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {address.full_name}
                        </h3>
                        {address.is_default && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>{address.address_line_1}</p>
                        {address.address_line_2 && (
                          <p>{address.address_line_2}</p>
                        )}
                        {address.postal_code && (
                          <p>Postal Code: {address.postal_code}</p>
                        )}
                        {address.phone && (
                          <p>Phone: {address.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                    <Link href={`/profile/addresses/${address.id}/edit`}>
                      <Button type="button" variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      onClick={() => handleDelete(address.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      Delete
                    </Button>
                    {!address.is_default && (
                      <Button
                        onClick={() => handleSetDefault(address.id)}
                        variant="outline"
                        size="sm"
                      >
                        Set as Default
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
