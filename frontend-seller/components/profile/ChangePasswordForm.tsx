"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  userService,
  type ChangePasswordPayload,
} from "@/services/user-service";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

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

export default function ChangePasswordForm() {
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

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Current password"
          type="password"
          {...register("current_password")}
          error={errors.current_password?.message}
        />
        <Input
          label="New password"
          type="password"
          {...register("password")}
          error={errors.password?.message}
        />
        <Input
          label="Confirm new password"
          type="password"
          {...register("password_confirmation")}
          error={errors.password_confirmation?.message}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}
