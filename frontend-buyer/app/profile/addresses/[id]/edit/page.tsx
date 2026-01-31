"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  userService,
  type Address,
  type AddressPayload,
} from "../../../../../services/user-service";
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

export default function EditAddressPage() {
  const router = useRouter();
  const params = useSearchParams();
  const idParam = params?.get("id");
  const id = idParam ? Number(idParam) : NaN;

  const [error, setError] = useState<string | null>(null);
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
      if (!id) return;
      try {
        const address: Address = await userService.getAddress(id);
        reset({
          full_name: address.full_name,
          phone: address.phone ?? "",
          address_line_1: address.address_line_1,
          address_line_2: address.address_line_2 ?? "",
          postal_code: address.postal_code ?? "",
          is_default: address.is_default,
        });
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Failed to load address");
      }
    };
    load();
  }, [id, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!id) return;
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
      await userService.updateAddress(id, payload);
      router.push("/profile/addresses");
    } catch (e: any) {
      const apiError = e?.response?.data;
      setError(apiError?.message ?? "Failed to update address");
    } finally {
      setLoading(false);
    }
  };

  if (!id) {
    return (
      <div className="max-w-xl mx-auto mt-8">
        <Alert type="error" message="Invalid address id." />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-8 space-y-4">
      <h1 className="text-2xl font-semibold">Edit Address</h1>
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
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}

