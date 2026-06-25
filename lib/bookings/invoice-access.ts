export function isPaymentCompleted(paymentStatus?: string | null) {
  const value = String(paymentStatus ?? "").toLowerCase();
  return value === "paid";
}

export function isInvoiceEligibleStatus(bookingStatus?: string | null) {
  const value = String(bookingStatus ?? "").toLowerCase();
  return value === "confirmed" || value === "active" || value === "completed";
}

export function isCancelledStatus(
  bookingStatus?: string | null,
  cancellationStatus?: string | null
) {
  const booking = String(bookingStatus ?? "").toLowerCase();
  const cancellation = String(cancellationStatus ?? "").toLowerCase();
  return booking === "cancelled" || cancellation === "cancelled";
}

export function canGenerateTaxInvoice(input: {
  paymentStatus?: string | null;
  bookingStatus?: string | null;
  cancellationStatus?: string | null;
}) {
  if (isCancelledStatus(input.bookingStatus, input.cancellationStatus)) return false;
  return (
    isPaymentCompleted(input.paymentStatus) &&
    isInvoiceEligibleStatus(input.bookingStatus)
  );
}
