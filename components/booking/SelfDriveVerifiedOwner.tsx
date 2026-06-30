"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle, Phone, User } from "lucide-react";
import { getSelfDriveOwnerContact } from "@/server/actions/selfDriveBooking";

interface Props {
  bookingId?: string;
  revealContact?: boolean;
}

export default function SelfDriveVerifiedOwner({ bookingId, revealContact = false }: Props) {
  const [contact, setContact] = useState<{ name: string; mobile: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!revealContact || !bookingId) return;
    let cancelled = false;
    setLoading(true);
    void getSelfDriveOwnerContact(bookingId).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) {
        setContact(result.data);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [revealContact, bookingId]);

  if (!revealContact) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="font-semibold">Verified Vehicle Owner</span>
      </div>
    );
  }

  const digits = String(contact?.mobile ?? "").replace(/\D/g, "");
  const tel = digits.length >= 10 ? `tel:+91${digits.slice(-10)}` : undefined;
  const wa = digits.length >= 10 ? `https://wa.me/91${digits.slice(-10)}` : undefined;

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Verified Vehicle Owner
      </div>
      {loading ? (
        <p className="mt-2 text-xs text-gray-500">Loading owner contact...</p>
      ) : contact ? (
        <div className="mt-2 space-y-2 text-sm text-gray-700">
          <p className="flex items-center gap-1.5 font-medium text-secondary">
            <User className="h-3.5 w-3.5 text-primary" />
            {contact.name}
          </p>
          {contact.mobile && (
            <p className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-primary" />
              {contact.mobile}
            </p>
          )}
          {(tel || wa) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {tel && (
                <a
                  href={tel}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20"
                >
                  <Phone className="h-3 w-3" />
                  Call
                </a>
              )}
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
                >
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-500">
          Owner contact will appear on your booking confirmation.
        </p>
      )}
    </div>
  );
}
