"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  userService,
  type AddressPayload,
} from "../../../../services/user-service";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone: z.string().optional().or(z.literal("")),
  address_line_1: z.string().min(1, "Address line 1 is required"),
  address_line_2: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  is_default: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewAddressPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setLoading(true);
    try {
      const payload: AddressPayload = {
        full_name: values.full_name,
        phone: values.phone || null,
        address_line_1: values.address_line_1,
        address_line_2: values.address_line_2 || null,
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
    <div className="max-w-xl mx-auto mt-8 space-y-4">
      <h1 className="text-2xl font-semibold">Add Address</h1>
      {error && <Alert type="error" message={error} />}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          {...register("full_name")}
          error={errors.full_name?.message}
        />
        <Input
          label="Phone"
          {...register("phone")}
          error={errors.phone?.message}
        />
        <Input
          label="Address Line 1"
          {...register("address_line_1")}
          error={errors.address_line_1?.message}
        />
        <Input
          label="Address Line 2"
          {...register("address_line_2")}
          error={errors.address_line_2?.message}
        />
        <Input
          label="Postal Code"
          {...register("postal_code")}
          error={errors.postal_code?.message}
        />
        <div className="flex items-center gap-2">
          <input type="checkbox" {...register("is_default")} id="is_default" />
          <label htmlFor="is_default" className="text-sm">
            Set as default address
          </label>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Address"}
        </Button>
      </form>
    </div>
  );
}

