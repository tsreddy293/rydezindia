import { describe, expect, it } from "vitest";
import {
  calculateRefund,
  hoursBeforeScheduled,
  normalizeBookingTypeForPolicy,
} from "./cancellation-policy";

describe("cancellation-policy", () => {
  const pickupDate = "2026-06-20";
  const pickupTime = "10:00";

  it("self drive 100% refund more than 48h before pickup", () => {
    const cancelledAt = new Date("2026-06-17T09:00:00");
    const result = calculateRefund({
      bookingType: "self_drive",
      tripFareAmount: 5000,
      securityDepositAmount: 3000,
      pickupDate,
      pickupTime,
      cancelledAt,
      paymentStatus: "paid",
    });
    expect(result.tripFareRefundPercent).toBe(100);
    expect(result.tripFareRefundAmount).toBe(5000);
    expect(result.securityDepositRefundAmount).toBe(3000);
    expect(result.totalRefundAmount).toBe(8000);
    expect(result.bookingAmount).toBe(8000);
    expect(result.cancellationCharges).toBe(0);
  });

  it("self drive 90% refund between 24-48 hours", () => {
    const cancelledAt = new Date("2026-06-19T08:00:00");
    const result = calculateRefund({
      bookingType: "self_drive",
      tripFareAmount: 5000,
      securityDepositAmount: 3000,
      pickupDate,
      pickupTime,
      cancelledAt,
      paymentStatus: "paid",
    });
    expect(result.tripFareRefundPercent).toBe(90);
    expect(result.tripFareRefundAmount).toBe(4500);
  });

  it("flexible protection 100% at 6+ hours", () => {
    const cancelledAt = new Date("2026-06-20T03:00:00");
    const result = calculateRefund({
      bookingType: "self_drive",
      tripFareAmount: 5000,
      pickupDate,
      pickupTime,
      cancelledAt,
      protectionSelected: true,
      paymentStatus: "paid",
    });
    expect(result.flexibleApplied).toBe(true);
    expect(result.tripFareRefundPercent).toBe(100);
  });

  it("flexible protection 90% between 3-6 hours", () => {
    const cancelledAt = new Date("2026-06-20T05:00:00");
    const result = calculateRefund({
      bookingType: "self_drive",
      tripFareAmount: 5000,
      pickupDate,
      pickupTime,
      cancelledAt,
      protectionSelected: true,
      paymentStatus: "paid",
    });
    expect(result.tripFareRefundPercent).toBe(90);
    expect(result.tripFareRefundAmount).toBe(4500);
  });

  it("flexible protection 75% within 3 hours", () => {
    const cancelledAt = new Date("2026-06-20T08:00:00");
    const result = calculateRefund({
      bookingType: "self_drive",
      tripFareAmount: 5000,
      pickupDate,
      pickupTime,
      cancelledAt,
      protectionSelected: true,
      paymentStatus: "paid",
    });
    expect(result.tripFareRefundPercent).toBe(75);
    expect(result.tripFareRefundAmount).toBe(3750);
  });

  it("flexible cancellation gives 100% within 6-12h window vs 50% regular", () => {
    const cancelledAt = new Date("2026-06-20T02:00:00");
    const hours = hoursBeforeScheduled(pickupDate, pickupTime, cancelledAt);
    expect(hours).toBeGreaterThanOrEqual(6);
    expect(hours).toBeLessThan(12);

    const result = calculateRefund({
      bookingType: "self_drive",
      tripFareAmount: 5000,
      securityDepositAmount: 3000,
      pickupDate,
      pickupTime,
      cancelledAt,
      flexibleCancellation: true,
      paymentStatus: "paid",
    });
    expect(result.flexibleApplied).toBe(true);
    expect(result.tripFareRefundAmount).toBe(5000);
  });

  it("with driver no refund after journey start", () => {
    const cancelledAt = new Date("2026-06-20T11:00:00");
    const result = calculateRefund({
      bookingType: "with_driver",
      tripFareAmount: 4000,
      pickupDate,
      pickupTime,
      cancelledAt,
      paymentStatus: "paid",
    });
    expect(result.totalRefundAmount).toBe(0);
    expect(result.afterScheduledStart).toBe(true);
  });

  it("return journey 75% within 24 hours", () => {
    const cancelledAt = new Date("2026-06-19T12:00:00");
    const result = calculateRefund({
      bookingType: "return_journey",
      tripFareAmount: 2000,
      pickupDate,
      pickupTime,
      cancelledAt,
      paymentStatus: "paid",
    });
    expect(result.tripFareRefundPercent).toBe(75);
    expect(result.tripFareRefundAmount).toBe(1500);
  });

  it("local rental from trip type", () => {
    expect(normalizeBookingTypeForPolicy("with_driver", "Local Rental")).toBe("local_rental");
  });
});
