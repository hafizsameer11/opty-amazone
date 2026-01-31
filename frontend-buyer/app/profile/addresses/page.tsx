"use client";

import { useEffect, useState } from "react";
import { userService, type Address } from "../../../services/user-service";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    load();
  }, []);

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

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Addresses</h1>
        <a href="/profile/addresses/new">
          <Button type="button">Add Address</Button>
        </a>
      </div>
      {error && <Alert type="error" message={error} />}
      {loading && <p>Loading...</p>}
      <div className="space-y-3">
        {addresses.map((address) => (
          <div
            key={address.id}
            className="border rounded-lg p-4 bg-white flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {address.full_name}{" "}
                  {address.is_default && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Default
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-600">
                  {address.address_line_1}
                  {address.address_line_2
                    ? `, ${address.address_line_2}`
                    : ""}
                </p>
                {address.postal_code && (
                  <p className="text-sm text-gray-600">
                    Postal code: {address.postal_code}
                  </p>
                )}
                {address.phone && (
                  <p className="text-sm text-gray-600">Phone: {address.phone}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`/profile/addresses/${address.id}/edit`}>
                <Button type="button" variant="secondary">
                  Edit
                </Button>
              </a>
              <Button
                onClick={() => handleDelete(address.id)}
                variant="outline"
              >
                Delete
              </Button>
              {!address.is_default && (
                <Button
                  onClick={() => handleSetDefault(address.id)}
                  variant="outline"
                >
                  Set Default
                </Button>
              )}
            </div>
          </div>
        ))}
        {!loading && addresses.length === 0 && (
          <p className="text-sm text-gray-600">
            You have not added any addresses yet.
          </p>
        )}
      </div>
    </div>
  );
}

