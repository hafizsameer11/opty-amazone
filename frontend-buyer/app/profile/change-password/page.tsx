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
  type ChangePasswordPayload,
} from "../../../services/user-service";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { useAuth } from "@/contexts/AuthContext";

const schema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    password: z.string().min(8, "New password must be at least 8 characters"),
    password_confirmation: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/profile/change-password');
      return;
    }
  }, [isAuthenticated, authLoading, router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const payload: ChangePasswordPayload = {
        current_password: values.current_password,
        password: values.password,
        password_confirmation: values.password_confirmation,
      };
      await userService.changePassword(payload);
      setSuccess("Password updated successfully.");
      reset();
    } catch (e: any) {
      const apiError = e?.response?.data;
      if (apiError?.errors?.current_password) {
        setError(apiError.errors.current_password[0]);
      } else {
        setError(apiError?.message ?? "Failed to update password");
      }
    } finally {
      setLoading(false);
    }
  };

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {/* Back Button */}
          <Link
            href="/profile"
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
            Back to Profile
          </Link>

          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Change Password</h1>
            <p className="text-gray-600">
              Update your account password to keep your account secure
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6">
              <Alert type="error" message={error} />
            </div>
          )}
          {success && (
            <div className="mb-6">
              <Alert type="success" message={success} />
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Current Password *"
                type="password"
                {...register("current_password")}
                error={errors.current_password?.message}
                placeholder="Enter your current password"
              />
              <Input
                label="New Password *"
                type="password"
                {...register("password")}
                error={errors.password?.message}
                placeholder="Enter your new password (min. 8 characters)"
              />
              <Input
                label="Confirm New Password *"
                type="password"
                {...register("password_confirmation")}
                error={errors.password_confirmation?.message}
                placeholder="Confirm your new password"
              />

              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#0066CC] hover:bg-[#0052a3] text-white"
                  size="lg"
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/profile")}
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
