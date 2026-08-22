"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  userService,
  type UpdateProfilePayload,
} from "@/services/user-service";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/types/auth";
import { isSellerProfileComplete } from "@/lib/seller-profile-gate";
import { displayProfileImageUrl } from "@/lib/profile-image-url";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z
    .string()
    .min(8, "Phone is required (at least 8 characters)")
    .transform((s) => s.trim()),
});

type FormValues = z.infer<typeof schema>;

type EditProfileFormProps = {
  onProfileSynced?: (user: User) => void;
};

export default function EditProfileForm({
  onProfileSynced,
}: EditProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateSessionUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [avatarInitial, setAvatarInitial] = useState("S");
  const [imageUploading, setImageUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await userService.getProfile();
        reset({
          name: data.user.name,
          email: data.user.email,
          phone: (data.user.phone ?? "").trim(),
        });
        setProfileImageUrl(
          displayProfileImageUrl(data.user.profile_image_url ?? null)
        );
        setAvatarInitial(
          data.user.name?.trim()?.charAt(0)?.toUpperCase() || "S"
        );
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Failed to load profile");
      }
    };
    load();
  }, [reset]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const payload: UpdateProfilePayload = {
        name: values.name,
        email: values.email,
        phone: values.phone.trim() || null,
      };
      const updated = await userService.updateProfile(payload);
      const nextUser = updated.user as User;
      updateSessionUser(nextUser);
      onProfileSynced?.(nextUser);
      setSuccess("Profile updated successfully.");
      if (isSellerProfileComplete(nextUser)) {
        router.replace("/profile");
      }
    } catch (e: any) {
      const apiError = e?.response?.data;
      setError(apiError?.message ?? "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setSuccess(null);
    setImageUploading(true);
    try {
      const updated = await userService.uploadProfileImage(file);
      const nextUser = updated.user as User;
      updateSessionUser(nextUser);
      onProfileSynced?.(nextUser);
      setProfileImageUrl(
        displayProfileImageUrl(nextUser.profile_image_url ?? null)
      );
      setAvatarInitial(nextUser.name?.trim()?.charAt(0)?.toUpperCase() || "S");
      setSuccess("Profile photo updated.");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to upload image (max 2MB, JPG/PNG/WebP/GIF).";
      setError(msg);
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    setError(null);
    setSuccess(null);
    setImageUploading(true);
    try {
      const updated = await userService.deleteProfileImage();
      const nextUser = updated.user as User;
      updateSessionUser(nextUser);
      onProfileSynced?.(nextUser);
      setProfileImageUrl(null);
      setSuccess("Profile photo removed.");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to remove image.";
      setError(msg);
    } finally {
      setImageUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-gray-200">
        <div className="h-24 w-24 rounded-full bg-[#0066CC]/10 overflow-hidden flex items-center justify-center text-3xl font-semibold text-[#0066CC] shrink-0 ring-2 ring-gray-100">
          {profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{avatarInitial}</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-900">Profile photo</p>
          <p className="text-xs text-gray-500">
            JPG, PNG, WebP or GIF. Max 2 MB.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageSelected}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={imageUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {imageUploading ? "Working…" : "Upload photo"}
            </Button>
            {profileImageUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={imageUploading}
                onClick={handleRemoveImage}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Remove photo
              </Button>
            )}
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full name"
          {...register("name")}
          error={errors.name?.message}
        />
        <Input
          label="Email address"
          type="email"
          {...register("email")}
          error={errors.email?.message}
        />
        <Input
          label="Phone number"
          {...register("phone")}
          error={errors.phone?.message}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
