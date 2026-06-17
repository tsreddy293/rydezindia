"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import { createCouponAction } from "@/server/actions/phase2Admin";

interface Props {
  coupons: Record<string, unknown>[];
}

export default function AdminCouponsClient({ coupons }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const result = await createCouponAction({
      code: String(form.get("code") ?? ""),
      discountType: String(form.get("discount_type") ?? "flat") as "flat" | "percentage",
      discountValue: Number(form.get("discount_value")),
      startDate: String(form.get("start_date")),
      expiryDate: String(form.get("expiry_date")),
      usageLimit: Number(form.get("usage_limit") ?? 100),
    });
    if (result.success) {
      setSuccess(true);
      setShowForm(false);
    } else {
      setError(result.error ?? "Failed");
    }
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <p className="text-sm text-gray-500">{coupons.length} coupon(s)</p>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>Create Coupon</Button>
      </div>

      {success && <p className="text-green-600 text-sm mb-4">Coupon created!</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 rounded-2xl border p-6 grid gap-4 sm:grid-cols-2">
          <FormField label="Code" name="code" required placeholder="WELCOME100" />
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Type</span>
            <select name="discount_type" className="w-full rounded-xl border px-4 py-2.5 text-sm">
              <option value="flat">Flat Discount (₹)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </label>
          <FormField label="Value" name="discount_value" type="number" required />
          <FormField label="Usage Limit" name="usage_limit" type="number" defaultValue="100" />
          <FormField label="Start Date" name="start_date" type="date" required />
          <FormField label="Expiry Date" name="expiry_date" type="date" required />
          {error && <p className="text-red-600 text-sm sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary">Create</Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Value</th>
              <th className="px-4 py-3 text-left">Used</th>
              <th className="px-4 py-3 text-left">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={String(c.id)} className="border-t">
                <td className="px-4 py-3 font-medium">{String(c.code)}</td>
                <td className="px-4 py-3">{String(c.discount_type)}</td>
                <td className="px-4 py-3">{String(c.discount_value)}</td>
                <td className="px-4 py-3">{String(c.used_count)}/{String(c.usage_limit)}</td>
                <td className="px-4 py-3">{String(c.expiry_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
