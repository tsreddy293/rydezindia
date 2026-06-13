import LegalPage from "@/components/legal/LegalPage";

export default function OwnerAgreementPage() {
  return (
    <LegalPage title="Owner Agreement" lastUpdated="June 1, 2026">
      <h2 className="text-xl font-semibold text-secondary">Owner Responsibilities</h2>
      <p>Vehicle owners agree to maintain valid RC, insurance, and PUC certificates. Vehicles must be in good working condition and clean for each booking.</p>
      <h2 className="text-xl font-semibold text-secondary">Earnings & Commission</h2>
      <p>Rydez India charges a 15-20% platform commission on each completed booking. Earnings are transferred to the registered bank account within 2 business days.</p>
      <h2 className="text-xl font-semibold text-secondary">Vehicle Listing</h2>
      <p>Owners set availability and pricing with AI-recommended rates. Rydez reserves the right to delist vehicles that receive consistent negative reviews or safety concerns.</p>
      <h2 className="text-xl font-semibold text-secondary">Insurance</h2>
      <p>Owners must maintain comprehensive vehicle insurance. Rydez provides additional trip protection coverage for verified bookings.</p>
    </LegalPage>
  );
}
