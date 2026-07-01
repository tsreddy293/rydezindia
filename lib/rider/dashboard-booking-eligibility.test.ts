import {
  hasActiveRefundReminder,
  isExcludedFromRiderDashboardAlerts,
  isUpcomingRiderTripBooking,
  requiresRiderPaymentReminder,
} from "@/lib/rider/dashboard-booking-eligibility";

const activeBooking = {
  id: "active-1",
  bookingStatus: "confirmed",
  paymentStatus: "partial",
  bookingType: "self_drive",
  selfDrivePayment: { balanceDue: 5000, amountPaid: 2000, advancePaid: 2000, depositAmount: 4000, depositRefundStatus: "none" },
};

if (isExcludedFromRiderDashboardAlerts(activeBooking)) {
  throw new Error("Active confirmed booking should not be excluded");
}
if (!isUpcomingRiderTripBooking(activeBooking)) {
  throw new Error("Confirmed booking should count as upcoming");
}
if (!requiresRiderPaymentReminder(activeBooking)) {
  throw new Error("Partial self-drive booking with balance due should require payment reminder");
}

const advancePaidBooking = {
  id: "advance-1",
  bookingStatus: "confirmed",
  paymentStatus: "partial",
  bookingType: "self_drive",
  selfDrivePayment: { balanceDue: 3000, amountPaid: 7000, advancePaid: 3000, depositAmount: 4000, depositRefundStatus: "none" },
};
if (!requiresRiderPaymentReminder(advancePaidBooking)) {
  throw new Error("Advance-paid booking with remaining balance should require payment reminder");
}

const completedBooking = {
  id: "done-1",
  bookingStatus: "completed",
  paymentStatus: "paid",
};
if (!isExcludedFromRiderDashboardAlerts(completedBooking)) {
  throw new Error("Completed booking should be excluded");
}
if (requiresRiderPaymentReminder(completedBooking)) {
  throw new Error("Completed booking should not require payment reminder");
}

const cancelledBooking = {
  id: "cancel-1",
  bookingStatus: "cancelled",
  paymentStatus: "partial",
  bookingType: "self_drive",
  selfDrivePayment: { balanceDue: 9000, amountPaid: 1000, advancePaid: 1000, depositAmount: 4000, depositRefundStatus: "none" },
};
if (!isExcludedFromRiderDashboardAlerts(cancelledBooking)) {
  throw new Error("Cancelled booking should be excluded");
}
if (isUpcomingRiderTripBooking(cancelledBooking)) {
  throw new Error("Cancelled booking should not be upcoming");
}
if (requiresRiderPaymentReminder(cancelledBooking)) {
  throw new Error("Cancelled booking should not require payment reminder");
}

const cancelledAfterAdvance = {
  id: "cancel-2",
  bookingStatus: "cancelled",
  paymentStatus: "partial",
  cancelledAt: "2026-06-01T10:00:00Z",
  refundStatus: "processing",
};
if (!hasActiveRefundReminder(cancelledAfterAdvance)) {
  throw new Error("Cancelled booking with processing refund should show refund reminder");
}
if (requiresRiderPaymentReminder(cancelledAfterAdvance)) {
  throw new Error("Cancelled after advance should not require payment reminder");
}

const refundedBooking = {
  id: "refund-1",
  bookingStatus: "cancelled",
  paymentStatus: "refunded",
  refundStatus: "refunded",
};
if (!isExcludedFromRiderDashboardAlerts(refundedBooking)) {
  throw new Error("Refunded booking should be excluded");
}
if (hasActiveRefundReminder(refundedBooking)) {
  throw new Error("Refunded booking should not show refund reminder");
}
if (requiresRiderPaymentReminder(refundedBooking)) {
  throw new Error("Refunded booking should not require payment reminder");
}

const paymentPendingBooking = {
  id: "pending-1",
  bookingStatus: "payment_pending",
  paymentStatus: "pending",
};
if (!requiresRiderPaymentReminder(paymentPendingBooking)) {
  throw new Error("Payment pending booking should require payment reminder");
}

console.log("rider dashboard-booking-eligibility tests passed");
