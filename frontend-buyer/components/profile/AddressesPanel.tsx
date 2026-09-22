"use client";

import { useCallback, useEffect, useState } from "react";
import { userService, type Address, type AddressPayload } from "@/services/user-service";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type AddressFormValues = {
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  country_name: string;
  state_name: string;
  city_name: string;
  postal_code: string;
  is_default: boolean;
};

const blankAddress = (defaultName = ""): AddressFormValues => ({
  full_name: defaultName,
  phone: "",
  address_line_1: "",
  address_line_2: "",
  country_name: "",
  state_name: "",
  city_name: "",
  postal_code: "",
  is_default: false,
});

function toFormValues(address: Address): AddressFormValues {
  return {
    full_name: address.full_name,
    phone: address.phone ?? "",
    address_line_1: address.address_line_1,
    address_line_2: address.address_line_2 ?? "",
    country_name: address.country_name ?? "",
    state_name: address.state_name ?? "",
    city_name: address.city_name ?? "",
    postal_code: address.postal_code ?? "",
    is_default: address.is_default,
  };
}

export default function AddressesPanel({
  defaultName,
  onBack,
}: {
  defaultName?: string;
  onBack: () => void;
}) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<AddressFormValues>(() => blankAddress(defaultName));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setAddresses(await userService.getAddresses());
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to load your addresses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const openCreate = () => {
    setEditingId(null);
    setForm(blankAddress(defaultName));
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (address: Address) => {
    setEditingId(address.id);
    setForm(toFormValues(address));
    setError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setError(null);
  };

  const updateField = <K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.full_name.trim() || !form.address_line_1.trim()) {
      setError("Full name and address line 1 are required.");
      return;
    }

    const payload: AddressPayload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      address_line_1: form.address_line_1.trim(),
      address_line_2: form.address_line_2.trim() || null,
      country_id: null,
      country_name: form.country_name.trim() || null,
      state_id: null,
      state_name: form.state_name.trim() || null,
      city_id: null,
      city_name: form.city_name.trim() || null,
      postal_code: form.postal_code.trim() || null,
      is_default: form.is_default,
    };

    try {
      setSaving(true);
      setError(null);
      if (editingId) await userService.updateAddress(editingId, payload);
      else await userService.createAddress(payload);
      await loadAddresses();
      closeForm();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id: number) => {
    if (!window.confirm("Delete this saved address?")) return;
    try {
      setError(null);
      await userService.deleteAddress(id);
      await loadAddresses();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to delete address");
    }
  };

  const setDefaultAddress = async (id: number) => {
    try {
      setError(null);
      await userService.setDefaultAddress(id);
      await loadAddresses();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to set the default address");
    }
  };

  if (formOpen) {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-cyan-50/70 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#087f8c]">Your account</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{editingId ? "Edit address" : "Add an address"}</h2>
            <p className="mt-1 text-sm text-slate-500">Keep delivery details ready for a faster checkout.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={closeForm}>Back to addresses</Button>
        </div>
        <form onSubmit={saveAddress} className="space-y-5 p-5 sm:p-7">
          {error && <Alert type="error" message={error} />}
          <div className="grid gap-5 md:grid-cols-2">
            <Input label="Full name *" value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} placeholder="Name for this delivery" />
            <Input label="Phone" type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="Delivery contact number" />
          </div>
          <Input label="Address line 1 *" value={form.address_line_1} onChange={(event) => updateField("address_line_1", event.target.value)} placeholder="Street address, building or house number" />
          <Input label="Address line 2" value={form.address_line_2} onChange={(event) => updateField("address_line_2", event.target.value)} placeholder="Apartment, suite, floor or other details" />
          <div className="grid gap-5 md:grid-cols-3">
            <Input label="Country" value={form.country_name} onChange={(event) => updateField("country_name", event.target.value)} placeholder="Country" />
            <Input label="State / Province" value={form.state_name} onChange={(event) => updateField("state_name", event.target.value)} placeholder="State or province" />
            <Input label="City" value={form.city_name} onChange={(event) => updateField("city_name", event.target.value)} placeholder="City" />
          </div>
          <Input label="Postal code" value={form.postal_code} onChange={(event) => updateField("postal_code", event.target.value)} placeholder="Postal or ZIP code" />
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={form.is_default} onChange={(event) => updateField("is_default", event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#087f8c] focus:ring-cyan-200" />
            Use this as my default delivery address
          </label>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save changes" : "Add address"}</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-cyan-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#087f8c]">Checkout essentials</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Manage addresses</h2>
          <p className="mt-1 text-sm text-slate-500">Save delivery details once and use them whenever you shop.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onBack}>Back to profile</Button>
          <Button type="button" size="sm" onClick={openCreate}>+ Add address</Button>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {error && <div className="mb-5"><Alert type="error" message={error} /></div>}
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl bg-slate-50 py-14 text-sm text-slate-500">Loading your addresses...</div>
        ) : addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-2xl text-[#087f8c]">⌖</div>
            <h3 className="mt-4 text-lg font-bold text-slate-950">No saved addresses yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Add a delivery address here so checkout is quicker and your orders always have the right destination.</p>
            <Button type="button" className="mt-5" onClick={openCreate}>Add your first address</Button>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {addresses.map((address) => (
              <article key={address.id} className={`rounded-2xl border p-5 transition ${address.is_default ? "border-[#087f8c]/40 bg-cyan-50/40" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-950">{address.full_name}</h3>
                      {address.is_default && <span className="rounded-full bg-[#087f8c] px-2.5 py-1 text-[11px] font-bold text-white">Default</span>}
                    </div>
                    <div className="mt-3 space-y-1 text-sm leading-5 text-slate-600">
                      <p>{address.address_line_1}</p>
                      {address.address_line_2 && <p>{address.address_line_2}</p>}
                      {(address.city_name || address.state_name || address.country_name) && <p>{[address.city_name, address.state_name, address.country_name].filter(Boolean).join(", ")}</p>}
                      {address.postal_code && <p>Postal code: {address.postal_code}</p>}
                      {address.phone && <p>Phone: {address.phone}</p>}
                    </div>
                  </div>
                  <span className="rounded-xl bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-500">#{address.id}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(address)}>Edit</Button>
                  {!address.is_default && <Button type="button" variant="outline" size="sm" onClick={() => void setDefaultAddress(address.id)}>Set as default</Button>}
                  <Button type="button" variant="outline" size="sm" className="!border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => void deleteAddress(address.id)}>Delete</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
