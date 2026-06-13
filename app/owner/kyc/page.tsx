import { ShieldCheck } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";
import { requireRole } from "@/server/actions/auth";
import { submitOwnerKyc } from "@/server/actions/kyc";

export const dynamic = "force-dynamic";

export default async function OwnerKycPage() {
  await requireRole("owner");

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Owner KYC</h1>
          <p className="text-gray-600 mt-2">Upload required documents for marketplace approval.</p>
        </div>

        <form action={submitOwnerKyc} className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6">
          {[
            ["aadhaar", "Aadhaar Card"],
            ["pan", "PAN Card"],
            ["license", "Driving License"],
            ["rc", "Vehicle RC"],
            ["insurance", "Insurance Copy"],
          ].map(([name, label]) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
              <input name={name} type="file" accept="image/*,.pdf" required className="w-full text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Photos</label>
            <input name="vehicle_photos" type="file" accept="image/*" multiple className="w-full text-sm" />
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full">
            Submit KYC
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
