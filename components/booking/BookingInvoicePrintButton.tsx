"use client";

export default function BookingInvoicePrintButton() {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 sm:w-auto"
      >
        Download Tax Invoice
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-secondary hover:bg-gray-50 sm:w-auto"
      >
        Print Invoice
      </button>
    </div>
  );
}
