import LegalPage from "@/components/legal/LegalPage";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description: "Rydez India privacy policy for users, owners, bookings, payments, KYC, and marketplace communications.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="13 June 2026">
      <p>Rydez India collects only the information required to operate a trusted vehicle marketplace across India.</p>
      <h2>Information We Collect</h2>
      <p>We may collect name, email, mobile number, city, booking details, vehicle details, payment status, KYC documents, device data, and support communications.</p>
      <h2>How We Use Information</h2>
      <p>Information is used for account creation, OTP verification, owner KYC, vehicle approvals, booking coordination, payment processing, fraud prevention, support, legal compliance, and marketplace analytics.</p>
      <h2>KYC And Documents</h2>
      <p>Owner KYC files such as Aadhaar, PAN, driving license, RC, insurance, and vehicle photos are stored securely in Supabase Storage and reviewed only for marketplace verification.</p>
      <h2>Payments</h2>
      <p>Payment orders, transaction references, and refund records are stored for reconciliation. Card, UPI, or net banking credentials are processed by Razorpay and are not stored by Rydez India.</p>
      <h2>Data Sharing</h2>
      <p>We share data only with service providers required for authentication, hosting, payments, fraud prevention, SMS delivery, legal compliance, and customer support.</p>
      <h2>Your Rights</h2>
      <p>You may request access, correction, account blocking, or deletion where legally permitted by contacting Rydez India support.</p>
    </LegalPage>
  );
}
