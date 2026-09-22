"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { userService, type ProfileResponse, type UpdateProfilePayload } from "../../services/user-service";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { getFullImageUrl } from "@/lib/image-utils";

const schema = z.object({
  name: z.string().min(2, "Full name is required"),
  phone: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;
type ProfileUser = ProfileResponse["user"];

export default function EditProfileForm({
  onProfileUpdated,
}: {
  onProfileUpdated?: (profile: ProfileUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await userService.getProfile();
        setEmail(data.user.email);
        setProfileImageUrl(data.user.profile_image_url ? getFullImageUrl(data.user.profile_image_url) : null);
        reset({ name: data.user.name, phone: data.user.phone ?? "" });
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Failed to load profile");
      }
    };
    void load();
  }, [reset]);

  const notifyProfileUpdate = (profile: ProfileUser) => {
    setProfileImageUrl(profile.profile_image_url ? getFullImageUrl(profile.profile_image_url) : null);
    onProfileUpdated?.(profile);
  };

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const payload: UpdateProfilePayload = {
        name: values.name.trim(),
        phone: values.phone?.trim() || null,
      };
      const data = await userService.updateProfile(payload);
      notifyProfileUpdate(data.user);
      setSuccess("Your profile details have been updated.");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Profile pictures must be 2 MB or smaller.");
      return;
    }

    setError(null);
    setSuccess(null);
    setImageLoading(true);
    try {
      const profile = await userService.uploadProfileImage(file);
      notifyProfileUpdate(profile);
      setSuccess("Profile picture updated.");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to upload profile picture");
    } finally {
      setImageLoading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!profileImageUrl || !window.confirm("Remove your profile picture?")) return;
    setError(null);
    setSuccess(null);
    setImageLoading(true);
    try {
      const profile = await userService.deleteProfileImage();
      notifyProfileUpdate(profile);
      setSuccess("Profile picture removed.");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to remove profile picture");
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-cyan-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#087f8c]/10 text-2xl font-bold text-[#087f8c] ring-4 ring-white shadow-sm">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileImageUrl} alt="Your profile" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden="true">{email.charAt(0).toUpperCase() || "B"}</span>
            )}
          </div>
          <div>
            <p className="text-base font-bold text-slate-950">Profile picture</p>
            <p className="mt-1 max-w-sm text-sm leading-5 text-slate-500">Use a clear image so stores can recognize you when you contact them.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
          <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={imageLoading}>
            {imageLoading ? "Updating..." : profileImageUrl ? "Change picture" : "Upload picture"}
          </Button>
          {profileImageUrl && <Button type="button" size="sm" variant="outline" onClick={handleRemoveImage} disabled={imageLoading}>Remove</Button>}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Full name" autoComplete="name" {...register("name")} error={errors.name?.message} />
          <div>
            <Input label="Email address" type="email" value={email} disabled readOnly aria-describedby="buyer-email-note" />
            <p id="buyer-email-note" className="mt-2 text-xs leading-5 text-slate-500">Email is your account identifier and cannot be changed here.</p>
          </div>
        </div>
        <Input label="Phone number" type="tel" autoComplete="tel" {...register("phone")} error={errors.phone?.message} placeholder="Your preferred contact number" />
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Your phone number helps with order and delivery communication.</p>
          <Button type="submit" disabled={loading} className="sm:min-w-36">{loading ? "Saving..." : "Save changes"}</Button>
        </div>
      </form>
    </div>
  );
}
