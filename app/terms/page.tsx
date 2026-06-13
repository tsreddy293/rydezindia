import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Terms & Conditions",
  description:
    "Rydez India Terms & Conditions. Rules for using our AI-powered vehicle sharing and return journey booking platform.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" lastUpdated="June 1, 2026">
      <p>
        By accessing and using Rydez India&apos;s platform at rydezindia.com, you agree to these
        Terms and Conditions.
      </p>
      <h2 className="text-xl font-semibold text-secondary">Platform Usage</h2>
      <p>
        Rydez India provides a vehicle sharing marketplace connecting verified owners with verified
        users. Users must be 18+ with a valid driving licence for self-drive rentals.
      </p>
      <h2 className="text-xl font-semibold text-secondary">Bookings & Payments</h2>
      <p>
        All bookings are subject to availability and verification. Payments are processed securely.
        Security deposits are refundable upon successful trip completion per our Refund Policy.
      </p>
      <h2 className="text-xl font-semibold text-secondary">Owner Responsibilities</h2>
      <p>
        Vehicle owners must maintain valid RC, insurance, and fitness certificates. Owners are
        responsible for accurate listing information and timely communication with passengers.
      </p>
      <h2 className="text-xl font-semibold text-secondary">Liability</h2>
      <p>
        Rydez India acts as an intermediary platform. Vehicle owners and users are responsible for
        compliance with traffic laws and proper vehicle usage during trips.
      </p>
      <h2 className="text-xl font-semibold text-secondary">Dispute Resolution</h2>
      <p>
        Disputes shall be resolved through arbitration in Hyderabad, Telangana, India, governed by
        Indian law.
      </p>
    </LegalPage>
  );
}
