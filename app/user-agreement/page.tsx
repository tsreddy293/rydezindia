import LegalPage from "@/components/legal/LegalPage";

export default function UserAgreementPage() {
  return (
    <LegalPage title="User Agreement" lastUpdated="June 1, 2026">
      <h2 className="text-xl font-semibold text-secondary">User Responsibilities</h2>
      <p>Users must possess a valid driving licence for self-drive rentals, comply with traffic laws, and return vehicles in the same condition as received.</p>
      <h2 className="text-xl font-semibold text-secondary">KYC Verification</h2>
      <p>All users must complete KYC verification including Aadhaar, driving licence upload, and selfie verification before their first booking.</p>
      <h2 className="text-xl font-semibold text-secondary">Damage & Penalties</h2>
      <p>Users are liable for damages beyond normal wear and tear, traffic violations during the rental period, and late return penalties.</p>
      <h2 className="text-xl font-semibold text-secondary">Ratings & Reviews</h2>
      <p>Users agree to provide honest ratings and reviews after trip completion. Fake or malicious reviews may result in account suspension.</p>
    </LegalPage>
  );
}
