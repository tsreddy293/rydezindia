import { describe, expect, it } from "vitest";
import { calculateSelfDrivePaymentWorkflow } from "./self-drive-payment-workflow";

describe("calculateSelfDrivePaymentWorkflow", () => {
  it("computes 30% advance, 70% balance, and full deposit payable now", () => {
    const result = calculateSelfDrivePaymentWorkflow({
      tripFare: 3810,
      securityDeposit: 4000,
    });

    expect(result.advanceAmount).toBe(1143);
    expect(result.balanceAmount).toBe(2667);
    expect(result.securityDeposit).toBe(4000);
    expect(result.amountPayableNow).toBe(5143);
    expect(result.amountDue).toBe(2667);
    expect(result.longDurationDiscountAmount).toBe(0);
  });

  it("applies advance on discounted trip fare after long-duration discount", () => {
    const result = calculateSelfDrivePaymentWorkflow({
      tripFare: 12346,
      securityDeposit: 4000,
      tripFareBeforeDiscount: 13718,
      longDurationDiscountAmount: 1372,
      longDurationDiscountPercent: 10,
      rentalDays: 10,
    });

    expect(result.advanceAmount).toBe(3704);
    expect(result.balanceAmount).toBe(8642);
    expect(result.amountPayableNow).toBe(7704);
  });

  it("includes protection fee in amount payable now", () => {
    const result = calculateSelfDrivePaymentWorkflow({
      tripFare: 3000,
      securityDeposit: 3000,
      protectionFee: 199,
    });

    expect(result.amountPayableNow).toBe(900 + 3000 + 199);
  });
});
