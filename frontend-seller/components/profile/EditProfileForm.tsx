"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  userService,
  type UpdateProfilePayload,
} from "@/services/user-service";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function EditProfileForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          phone: data.user.phone ?? "",
        });
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
        phone: values.phone || null,
      };
      await userService.updateProfile(payload);
      setSuccess("Profile updated successfully.");
    } catch (e: any) {
      const apiError = e?.response?.data;
      setError(apiError?.message ?? "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}
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
