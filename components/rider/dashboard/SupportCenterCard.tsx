import Link from "next/link";
import { Headphones, MessageCircle, Phone, Shield } from "lucide-react";

export default function SupportCenterCard() {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-secondary">Support Center</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/support"
          className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 hover:bg-gray-50"
        >
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-secondary">Safety & SOS</p>
            <p className="text-xs text-gray-500">Emergency contacts</p>
          </div>
        </Link>
        <Link
          href="/contact"
          className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 hover:bg-gray-50"
        >
          <Headphones className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-secondary">Help Center</p>
            <p className="text-xs text-gray-500">Contact support</p>
          </div>
        </Link>
        <a
          href="https://wa.me/919000000000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 hover:bg-gray-50"
        >
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-medium text-secondary">WhatsApp</p>
            <p className="text-xs text-gray-500">Chat with us</p>
          </div>
        </a>
        <a
          href="tel:+919000000000"
          className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 hover:bg-gray-50"
        >
          <Phone className="h-5 w-5 text-blue-600" />
          <div>
            <p className="font-medium text-secondary">Call Support</p>
            <p className="text-xs text-gray-500">24/7 assistance</p>
          </div>
        </a>
      </div>
    </section>
  );
}
