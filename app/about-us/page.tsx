import PageLayout from "@/components/layout/PageLayout";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "About Us",
  description: "About Rydez India, a verified Indian vehicle marketplace for return journeys, self-drive rentals, and vehicles with driver.",
  path: "/about-us",
});

export default function AboutUsPage() {
  return (
    <PageLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 md:px-6">
        <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-4">About Rydez India</h1>
        <p className="text-gray-600 leading-relaxed">
          Rydez India is building a trusted Indian vehicle marketplace for return journey sharing,
          self-drive rentals, and vehicles with professional drivers. Our platform helps passengers
          discover verified vehicles while helping owners earn from idle vehicle capacity.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ["Verified Owners", "Owner KYC, vehicle documents, and approvals improve marketplace trust."],
            ["Three Booking Models", "Return journey seats, self-drive rentals, and full vehicle hiring with drivers."],
            ["India First", "Built for Indian cities, mobile verification, local compliance, and INR payments."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-secondary">{title}</h2>
              <p className="mt-2 text-sm text-gray-500">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
