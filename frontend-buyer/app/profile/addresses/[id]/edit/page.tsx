'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { userService, type AddressPayload } from '@/services/user-service';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

const schema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().optional().or(z.literal('')),
  address_line_1: z.string().min(1, 'Address line 1 is required'),
  address_line_2: z.string().optional().or(z.literal('')),
  country_name: z.string().optional().or(z.literal('')),
  state_name: z.string().optional().or(z.literal('')),
  city_name: z.string().optional().or(z.literal('')),
  postal_code: z.string().optional().or(z.literal('')),
  is_default: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function EditAddressPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const id = Number(params?.id);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/auth/login?redirect=/profile/addresses');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !Number.isFinite(id)) return;
    void (async () => {
      try {
        setLoadingAddress(true);
        const address = await userService.getAddress(id);
        reset({
          full_name: address.full_name,
          phone: address.phone ?? '',
          address_line_1: address.address_line_1,
          address_line_2: address.address_line_2 ?? '',
          country_name: address.country_name ?? '',
          state_name: address.state_name ?? '',
          city_name: address.city_name ?? '',
          postal_code: address.postal_code ?? '',
          is_default: address.is_default,
        });
      } catch (e: any) {
        setError(e?.response?.data?.message ?? 'Failed to load address');
      } finally {
        setLoadingAddress(false);
      }
    })();
  }, [id, isAuthenticated, reset]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSaving(true);
    try {
      const payload: AddressPayload = {
        full_name: values.full_name,
        phone: values.phone?.trim() || null,
        address_line_1: values.address_line_1,
        address_line_2: values.address_line_2?.trim() || null,
        country_id: null,
        country_name: values.country_name?.trim() || null,
        state_id: null,
        state_name: values.state_name?.trim() || null,
        city_id: null,
        city_name: values.city_name?.trim() || null,
        postal_code: values.postal_code?.trim() || null,
        is_default: values.is_default,
      };
      await userService.updateAddress(id, payload);
      router.replace('/profile/addresses');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to update address');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingAddress) return <div className="mx-auto max-w-2xl p-8 text-gray-500">Loading address...</div>;
  if (!isAuthenticated || !Number.isFinite(id)) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      <Link href="/profile/addresses" className="mb-6 inline-flex items-center text-[#0066CC] hover:text-[#0052a3]"><span aria-hidden="true" className="mr-2 text-xl">←</span>Back to Addresses</Link>
      <div className="mb-6"><h1 className="mb-2 text-3xl font-bold text-gray-900">Edit Address</h1><p className="text-gray-600">Update your shipping or billing address.</p></div>
      {error && <div className="mb-6"><Alert type="error" message={error} /></div>}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input label="Full Name *" {...register('full_name')} error={errors.full_name?.message} />
          <Input label="Phone" type="tel" {...register('phone')} error={errors.phone?.message} />
          <Input label="Address Line 1 *" {...register('address_line_1')} error={errors.address_line_1?.message} />
          <Input label="Address Line 2" {...register('address_line_2')} error={errors.address_line_2?.message} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input label="Country" {...register('country_name')} error={errors.country_name?.message} placeholder="Enter country" />
            <Input label="State / Province" {...register('state_name')} error={errors.state_name?.message} placeholder="Enter state or province" />
            <Input label="City" {...register('city_name')} error={errors.city_name?.message} placeholder="Enter city" />
          </div>
          <Input label="Postal Code" {...register('postal_code')} error={errors.postal_code?.message} />
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4"><input type="checkbox" {...register('is_default')} id="is_default" className="h-5 w-5 rounded border-gray-300 text-[#0066CC] focus:ring-2 focus:ring-[#0066CC]" /><label htmlFor="is_default" className="cursor-pointer text-sm font-medium text-gray-700">Set as default address</label></div>
          <div className="flex flex-col gap-4 border-t border-gray-200 pt-4 sm:flex-row"><Button type="submit" disabled={saving} className="flex-1 bg-[#0066CC] text-white hover:bg-[#0052a3]" size="lg">{saving ? 'Saving...' : 'Save Changes'}</Button><Button type="button" variant="outline" onClick={() => router.push('/profile/addresses')} size="lg">Cancel</Button></div>
        </form>
      </div>
    </div>
  );
}
