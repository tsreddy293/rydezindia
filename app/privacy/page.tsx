import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "Read Rydez India's Privacy Policy. Learn how we collect, use, and protect your personal data on our vehicle sharing platform.",
  path: "/privacy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="June 1, 2026">
      <p>
        Rydez India (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy.
        This Privacy Policy explains how we collect, use, and safeguard your information when you use
        our platform at rydezindia.com.
      </p>
      <h2 className="text-xl font-semibold text-secondary">Information We Collect</h2>
      <p>
        We collect personal information including name, email, phone number, Aadhaar, driving licence,
        vehicle information, and location data for GPS tracking during active trips.
      </p>
      <h2 className="text-xl font-semibold text-secondary">How We Use Your Information</h2>
      <p>
        Your information is used for identity verification, booking management, payment processing,
        AI-powered matching and pricing, fraud detection, and customer support.
      </p>
      <h2 className="text-xl font-semibold text-secondary">Data Security</h2>
      <p>
        We implement industry-standard encryption, secure servers hosted on Supabase, and regular
        security audits. All payment data is processed through PCI-DSS compliant infrastructure.
      </p>
      <h2 className="text-xl font-semibold text-secondary">Your Rights</h2>
      <p>
        You may request access, correction, or deletion of your personal data by contacting us. We
        respond to all requests within 30 days as per applicable Indian data protection guidelines.
      </p>
      <h2 className="text-xl font-semibold text-secondary">Contact</h2>
      <p>
        For privacy-related queries, contact us at info@rydezindia.com or +91 9494651116.
      </p>
    </LegalPage>
  );
}
