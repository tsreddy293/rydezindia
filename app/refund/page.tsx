import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Refund Policy",
  description:
    "Rydez India Refund Policy. Cancellation rules, security deposit refunds, and payment processing timelines.",
  path: "/refund",
});

export default function RefundPage() {
  return (
    <LegalPage title="Refund Policy" lastUpdated="June 1, 2026">
      <h2 className="text-xl font-semibold text-secondary">Cancellation by User</h2>
      <p>
        Free cancellation up to 24 hours before pickup. Cancellations within 24 hours incur a 25%
        fee. No-shows forfeit the full booking amount.
      </p>
      <h2 className="text-xl font-semibold text-secondary">Cancellation by Owner</h2>
      <p>
        If an owner cancels, users receive a full refund plus a 10% credit for future bookings on
        Rydez India.
      </p>
      <h2 className="text-xl font-semibold text-secondary">Security Deposit</h2>
      <p>
        Security deposits are refunded within 3–5 business days after trip completion, minus any
        damages or penalties assessed through our dispute process.
      </p>
      <h2 className="text-xl font-semibold text-secondary">Refund Processing</h2>
      <p>
        Refunds are processed to the original payment method within 5–7 business days. For support,
        email info@rydezindia.com or call +91 9494651116.
      </p>
    </LegalPage>
  );
}
