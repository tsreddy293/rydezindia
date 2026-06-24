"use client";

export default function BookingInvoicePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 sm:w-auto"
    >
      Download / Print PDF
    </button>
  );
}
