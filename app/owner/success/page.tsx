import { CheckCircle } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";

export const metadata = {
  title: "Registration Successful",
};

export default function OwnerSuccessPage() {
  return (
    <PageLayout>
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-secondary mb-4">
          Registration Submitted Successfully
        </h1>
        <p className="text-gray-600 mb-4">
          Thank you for registering with Rydez India.
        </p>
        <p className="text-gray-500 text-sm mb-10">
          Please verify your email before logging in. Our team will also review your owner details.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button href="/owner/login" variant="primary" size="lg">
            Go to Owner Login
          </Button>
          <Button href="/" variant="outline" size="lg">
            Back to Home
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
