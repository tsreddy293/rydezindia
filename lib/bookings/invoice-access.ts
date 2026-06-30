export function isPaymentCompleted(paymentStatus?: string | null) {
  const value = String(paymentStatus ?? "").toLowerCase();
  return value === "paid" || value === "refunded";
}

export function isInvoiceEligibleStatus(bookingStatus?: string | null) {
  const value = String(bookingStatus ?? "").toLowerCase();
  return value === "confirmed" || value === "active" || value === "completed";
}

export function isCancelledStatus(bookingStatus?: string | null) {
  const booking = String(bookingStatus ?? "").toLowerCase();
  return booking === "cancelled" || booking === "already_cancelled";
}

export function canGenerateTaxInvoice(input: {
  paymentStatus?: string | null;
  bookingStatus?: string | null;
}) {
  if (isCancelledStatus(input.bookingStatus)) return false;
  return (
    isPaymentCompleted(input.paymentStatus) &&
    isInvoiceEligibleStatus(input.bookingStatus)
  );
}
