import { Car } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import OwnerRegistrationForm from "@/components/forms/OwnerRegistrationForm";

export const metadata = {
  title: "Register as Vehicle Owner",
  description: "Join Rydez India and start earning from your vehicle",
};

export default function OwnerRegistrationPage() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
          <div className="text-center mb-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Car className="h-8 w-8 text-primary" />
            </div>
            <span className="inline-block rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1 mb-3">
              Rydez India Partner Program
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-secondary">
              Register as Vehicle Owner
            </h1>
            <p className="text-gray-600 mt-3 max-w-lg mx-auto">
              List your vehicle, connect with verified passengers, and earn from return journeys
              across India.
            </p>
          </div>

          <OwnerRegistrationForm />
        </div>
      </div>
    </PageLayout>
  );
}
