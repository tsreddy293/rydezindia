"use client";

import { useCallback, useState } from "react";

export function useOwnerToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const show = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const Toast = toast ? (
    <div
      className={`fixed bottom-6 right-6 z-[100] max-w-sm rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
        toast.type === "success" ? "bg-emerald-600" : toast.type === "error" ? "bg-red-600" : "bg-secondary"
      }`}
      role="status"
    >
      {toast.message}
    </div>
  ) : null;

  return { show, Toast };
}
