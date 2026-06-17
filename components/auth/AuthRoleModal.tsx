"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import AuthRolePicker from "@/components/auth/AuthRolePicker";

interface Props {
  open: boolean;
  mode: "login" | "signup";
  onClose: () => void;
}

export default function AuthRoleModal({ open, mode, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center overflow-y-auto bg-black/55 p-0 sm:p-6">
      <div
        className="relative w-full sm:max-w-3xl lg:max-w-5xl rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[96vh] sm:max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-role-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2.5 text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <AuthRolePicker mode={mode} compact />
      </div>
    </div>
  );
}
