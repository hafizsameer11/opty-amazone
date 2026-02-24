"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
// Layout components are now handled by app/template.tsx
import {
  userService,
  type AddressPayload,
} from "../../../../services/user-service";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import apiClient from "@/lib/api-client";

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone: z.string().optional().or(z.literal("")),
  address_line_1: z.string().min(1, "Address line 1 is required"),
  address_line_2: z.string().optional().or(z.literal("")),
  country_id: z.number().optional(),
  state_id: z.number().optional(),
  city_id: z.number().optional(),
  postal_code: z.string().optional().or(z.literal("")),
  is_default: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Country {
  id: number;
  name: string;
  code: string;
}

interface State {
  id: number;
  name: string;
  country_id: number;
}

interface City {
  id: number;
  name: string;
  state_id: number;
}

export default function NewAddressPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const selectedCountryId = watch("country_id");
  const selectedStateId = watch("state_id");

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setLoadingGeo(true);
        const response = await apiClient.get("/geographic/countries");
        setCountries(response.data.data || []);
      } catch (error) {
        console.error("Failed to load countries:", error);
      } finally {
        setLoadingGeo(false);
      }
    };
    loadCountries();
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (selectedCountryId) {
      const loadStates = async () => {
        try {
          setLoadingGeo(true);
          const response = await apiClient.get(
            `/geographic/countries/${selectedCountryId}/states`
          );
          setStates(response.data.data || []);
          setCities([]); // Reset cities when country changes
        } catch (error) {
          console.error("Failed to load states:", error);
        } finally {
          setLoadingGeo(false);
        }
      };
      loadStates();
    } else {
      setStates([]);
      setCities([]);
    }
  }, [selectedCountryId]);

  // Load cities when state changes
  useEffect(() => {
    if (selectedStateId) {
      const loadCities = async () => {
        try {
          setLoadingGeo(true);
          const response = await apiClient.get(
            `/geographic/states/${selectedStateId}/cities`
          );
          setCities(response.data.data || []);
        } catch (error) {
          console.error("Failed to load cities:", error);
        } finally {
          setLoadingGeo(false);
        }
      };
      loadCities();
    } else {
      setCities([]);
    }
  }, [selectedStateId]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setLoading(true);
    try {
      const payload: AddressPayload = {
        full_name: values.full_name,
        phone: values.phone || null,
        address_line_1: values.address_line_1,
        address_line_2: values.address_line_2 || null,
        country_id: values.country_id || null,
        state_id: values.state_id || null,
        city_id: values.city_id || null,
        postal_code: values.postal_code || null,
        is_default: values.is_default,
      };
      await userService.createAddress(payload);
      router.push("/profile/addresses");
    } catch (e: any) {
      const apiError = e?.response?.data;
      setError(apiError?.message ?? "Failed to create address");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {/* Back Button */}
          <Link
            href="/profile/addresses"
            className="inline-flex items-center text-[#0066CC] hover:text-[#0052a3] mb-6"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Addresses
          </Link>

          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Address</h1>
            <p className="text-gray-600">
              Add a new shipping or billing address to your account
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6">
              <Alert type="error" message={error} />
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Full Name */}
              <div>
                <Input
                  label="Full Name *"
                  {...register("full_name")}
                  error={errors.full_name?.message}
                  placeholder="Enter full name"
                />
              </div>

              {/* Phone */}
              <div>
                <Input
                  label="Phone"
                  type="tel"
                  {...register("phone")}
                  error={errors.phone?.message}
                  placeholder="Enter phone number"
                />
              </div>

              {/* Address Line 1 */}
              <div>
                <Input
                  label="Address Line 1 *"
                  {...register("address_line_1")}
                  error={errors.address_line_1?.message}
                  placeholder="Street address, P.O. box, company name"
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <Input
                  label="Address Line 2"
                  {...register("address_line_2")}
                  error={errors.address_line_2?.message}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                />
              </div>

              {/* Geographic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Country */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Country
                  </label>
                  <select
                    {...register("country_id", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
                    disabled={loadingGeo}
                  >
                    <option value="">Select Country</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {errors.country_id && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.country_id.message}
                    </p>
                  )}
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    State/Province
                  </label>
                  <select
                    {...register("state_id", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={loadingGeo || !selectedCountryId || states.length === 0}
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                  {errors.state_id && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.state_id.message}
                    </p>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    City
                  </label>
                  <select
                    {...register("city_id", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={loadingGeo || !selectedStateId || cities.length === 0}
                  >
                    <option value="">Select City</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                  {errors.city_id && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.city_id.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Postal Code */}
              <div>
                <Input
                  label="Postal Code"
                  {...register("postal_code")}
                  error={errors.postal_code?.message}
                  placeholder="Enter postal/zip code"
                />
              </div>

              {/* Default Address Checkbox */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  {...register("is_default")}
                  id="is_default"
                  className="w-5 h-5 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC] focus:ring-2"
                />
                <label
                  htmlFor="is_default"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Set as default address
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
                <Button
                  type="submit"
                  disabled={loading || loadingGeo}
                  className="flex-1 bg-[#0066CC] hover:bg-[#0052a3] text-white"
                  size="lg"
                >
                  {loading ? "Saving..." : "Save Address"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/profile/addresses")}
                  className="sm:w-auto"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
    </div>
  );
}
