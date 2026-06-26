"use client";

import Link from "next/link";
import { BookOpen, Headphones, MessageCircle, Phone, Ticket, Video } from "lucide-react";
import OwnerTabs from "@/components/owner/shared/OwnerTabs";
import { useState } from "react";
import { useOwnerToast } from "@/components/owner/shared/useOwnerToast";

type Tab = "help" | "tickets" | "faq";

const FAQS = [
  { q: "How do I get my vehicle approved?", a: "Upload RC, insurance, and a clear photo. Admin reviews within 24–48 hours." },
  { q: "When do I receive payouts?", a: "Earnings settle after trip completion. Check Wallet for withdrawable balance." },
  { q: "How do return journeys work?", a: "After completing a trip, create a discounted return listing from Bookings." },
  { q: "What commission does Rydez charge?", a: "Platform commission is shown on each payment in the Payments section." },
];

export default function OwnerSupportHub() {
  const [tab, setTab] = useState<Tab>("help");
  const { show, Toast } = useOwnerToast();

  return (
    <div className="space-y-6">
      {Toast}
      <OwnerTabs
        tabs={[
          { id: "help" as const, label: "Help Center" },
          { id: "tickets" as const, label: "Tickets" },
          { id: "faq" as const, label: "FAQ" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "help" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button type="button" onClick={() => show("Ticket #RZ-" + Date.now().toString().slice(-6) + " created", "success")} className="flex items-center gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm hover:shadow-md">
            <Ticket className="h-8 w-8 text-primary" />
            <div><p className="font-bold">Raise Ticket</p><p className="text-sm text-gray-500">Get help from our team</p></div>
          </button>
          <a href="https://wa.me/919000000000" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md">
            <MessageCircle className="h-8 w-8 text-emerald-600" />
            <div><p className="font-bold">WhatsApp / Live Chat</p><p className="text-sm text-gray-500">Instant messaging</p></div>
          </a>
          <a href="tel:+919000000000" className="flex items-center gap-4 rounded-2xl border border-red-100 bg-red-50 p-5 hover:shadow-md">
            <Phone className="h-8 w-8 text-red-600" />
            <div><p className="font-bold text-red-900">Emergency Call</p><p className="text-sm text-red-700">24/7 host line</p></div>
          </a>
          <Link href="/contact" className="flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md">
            <Headphones className="h-8 w-8 text-blue-600" />
            <div><p className="font-bold">Call Support</p><p className="text-sm text-gray-500">Business hours</p></div>
          </Link>
          <button type="button" onClick={() => show("Video tutorials coming soon", "info")} className="flex items-center gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm hover:shadow-md sm:col-span-2">
            <Video className="h-8 w-8 text-violet-600" />
            <div><p className="font-bold">Video Tutorials</p><p className="text-sm text-gray-500">Learn how to maximize earnings</p></div>
          </button>
          <Link href="/owner-agreement" className="flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md sm:col-span-2">
            <BookOpen className="h-8 w-8 text-gray-600" />
            <div><p className="font-bold">Knowledge Base</p><p className="text-sm text-gray-500">Owner agreement & policies</p></div>
          </Link>
        </div>
      )}

      {tab === "tickets" && (
        <div className="rounded-2xl border bg-gray-50 py-12 text-center">
          <Ticket className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-600">No open tickets</p>
          <button type="button" onClick={() => show("Support ticket created", "success")} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
            Raise New Ticket
          </button>
        </div>
      )}

      {tab === "faq" && (
        <dl className="space-y-4">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border bg-white p-5 shadow-sm">
              <dt className="font-semibold text-secondary">{f.q}</dt>
              <dd className="mt-2 text-sm text-gray-600">{f.a}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
