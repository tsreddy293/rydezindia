import Link from "next/link";
import { Headphones, MessageCircle, Phone, Ticket } from "lucide-react";
import OwnerSection from "@/components/owner/dashboard/ui/OwnerSection";

export default function OwnerSupportCard() {
  return (
    <OwnerSection title="Support Center" description="Get help when you need it">
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/owner/support"
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <Ticket className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold text-secondary dark:text-white">Raise Ticket</p>
            <p className="text-xs text-gray-500">Get help from our team</p>
          </div>
        </Link>
        <a
          href="tel:+919000000000"
          className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-4 transition hover:shadow-md"
        >
          <Phone className="h-5 w-5 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">Emergency Support</p>
            <p className="text-xs text-red-700">24/7 host line</p>
          </div>
        </a>
        <a
          href="https://wa.me/919000000000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-semibold text-secondary dark:text-white">Live Chat</p>
            <p className="text-xs text-gray-500">WhatsApp support</p>
          </div>
        </a>
        <Link
          href="/contact"
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <Headphones className="h-5 w-5 text-blue-600" />
          <div>
            <p className="font-semibold text-secondary dark:text-white">Call Support</p>
            <p className="text-xs text-gray-500">Business hours</p>
          </div>
        </Link>
      </div>
    </OwnerSection>
  );
}
