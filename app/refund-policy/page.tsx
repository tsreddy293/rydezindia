import LegalPage from "@/components/legal/LegalPage";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Refund Policy",
  description: "Rydez India refund and cancellation policy for return journeys, self-drive vehicles, and vehicles with driver.",
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy" lastUpdated="13 June 2026">
      <p>Refunds are reviewed based on booking type, payment status, cancellation reason, and operational impact.</p>
      <h2>Passenger Cancellations</h2>
      <p>Passengers may cancel eligible bookings before trip confirmation or within the applicable cancellation window shown during booking.</p>
      <h2>Owner Cancellations</h2>
      <p>If an owner cancels due to vehicle unavailability or document issues, Rydez India may process a full or partial refund after review.</p>
      <h2>Admin Cancellations</h2>
      <p>Rydez India may cancel bookings for fraud, safety, compliance, failed payment, or incorrect listing information.</p>
      <h2>Refund Processing</h2>
      <p>Approved refunds are initiated through Razorpay to the original payment method. Bank timelines may vary.</p>
      <h2>Security Deposits</h2>
      <p>Self-drive security deposits may be adjusted for damages, fines, late returns, fuel, tolls, or policy violations.</p>
    </LegalPage>
  );
}
