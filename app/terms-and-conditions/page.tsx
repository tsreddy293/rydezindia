import LegalPage from "@/components/legal/LegalPage";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Terms and Conditions",
  description: "Rydez India marketplace terms for passengers, owners, vehicles, bookings, cancellations, and payments.",
  path: "/terms-and-conditions",
});

export default function TermsAndConditionsPage() {
  return (
    <LegalPage title="Terms and Conditions" lastUpdated="13 June 2026">
      <p>These terms govern use of Rydez India by passengers, vehicle owners, drivers, and administrators.</p>
      <h2>Marketplace Role</h2>
      <p>Rydez India enables discovery, booking requests, payments, verification, and communication between users and owners. Owners remain responsible for vehicle condition, documents, driver conduct, and legal compliance.</p>
      <h2>Accounts And Verification</h2>
      <p>Users and owners must provide accurate information, verify mobile numbers, and complete requested KYC checks before accessing restricted marketplace features.</p>
      <h2>Bookings</h2>
      <p>Bookings may remain pending until owner availability, payment, and verification checks are complete. Rydez India may cancel fraudulent, unsafe, or policy-violating bookings.</p>
      <h2>Owner Responsibilities</h2>
      <p>Owners must upload valid KYC, RC, insurance, and vehicle photos. Vehicles cannot be published until approved by Rydez India.</p>
      <h2>Payments And Refunds</h2>
      <p>Payments are processed through Razorpay. Refunds depend on cancellation eligibility, payment status, and operational review.</p>
      <h2>Prohibited Use</h2>
      <p>Users must not misuse vehicles, bypass marketplace payments, upload false documents, harass participants, or violate Indian law.</p>
    </LegalPage>
  );
}
