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
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
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
        setError(e?.response?.data?.message ?? t('editProfile.loadFailed'));
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
        phone: values.phone.trim() || null,
      };
      const updated = await userService.updateProfile(payload);
      const nextUser = updated.user as User;
      updateSessionUser(nextUser);
      onProfileSynced?.(nextUser);
      setSuccess(t('editProfile.updated'));
      if (isSellerProfileComplete(nextUser)) {
        router.replace("/profile");
      }
    } catch (e: any) {
      const apiError = e?.response?.data;
      setError(apiError?.message ?? t('editProfile.updateFailed'));
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
      setSuccess(t('editProfile.photoUpdated'));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? t('editProfile.uploadFailed');
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
      setSuccess(t('editProfile.photoRemoved'));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? t('editProfile.removeFailed');
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
          <p className="text-sm font-medium text-gray-900">{t('editProfile.photo')}</p>
          <p className="text-xs text-gray-500">{t('editProfile.photoHint')}</p>
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
              {imageUploading ? t('editProfile.working') : t('editProfile.upload')}
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
                {t('editProfile.remove')}
              </Button>
            )}
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t('editProfile.name')}
          {...register("name")}
          error={errors.name?.message}
        />
        <Input
          label={t('editProfile.email')}
          type="email"
          {...register("email")}
          error={errors.email?.message}
          disabled
          readOnly
        />
        <p className="-mt-2 text-xs text-gray-500">{t('editProfile.emailHint')}</p>
        <Input
          label={t('editProfile.phone')}
          {...register("phone")}
          error={errors.phone?.message}
        />
        <Button type="submit" disabled={loading}>
          {loading ? t('editProfile.saving') : t('editProfile.save')}
        </Button>
      </form>
    </div>
  );
}
