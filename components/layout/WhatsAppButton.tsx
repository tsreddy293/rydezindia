"use client";

import { MessageCircle } from "lucide-react";
import { COMPANY } from "@/lib/data";

export default function WhatsAppButton() {
  const message = encodeURIComponent("Welcome to Rydez India");
  const url = `https://wa.me/${COMPANY.whatsapp.replace("+", "")}?text=${message}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition-transform hover:scale-110 animate-pulse-glow"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
