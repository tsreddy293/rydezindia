import { SELF_DRIVE_GST_ON_PLATFORM_FEE_PERCENT } from "@/lib/pricing/self-drive-pricing";

/** Display-only tax breakup for invoice / PDF — amounts are read from stored booking fields. */
export interface InvoiceTaxBreakdown {
  baseFare: number;
  platformFee: number;
  gst: number;
  discountAmount: number;
  tripFareTotal: number;
}

export interface InvoiceTaxBreakdownInput {
  booking_type?: string | null;
  trip_fare_amount?: number | null;
  base_fare?: number | null;
  platform_fee?: number | null;
  discount_amount?: number | null;
  amount?: number | null;
  protection_fee?: number | null;
}

/**
 * Builds invoice line items from persisted booking amounts.
 * Does not recalculate pricing — only formats stored (or residual) values for compliance PDFs.
 */
export function deriveInvoiceTaxBreakdown(input: InvoiceTaxBreakdownInput): InvoiceTaxBreakdown {
  const protectionFee = Math.max(0, Number(input.protection_fee ?? 0));
  const tripFareTotal = Math.max(
    0,
    Number(input.trip_fare_amount ?? 0) ||
      Math.max(0, Number(input.amount ?? 0) - protectionFee)
  );
  const discountAmount = Math.max(0, Number(input.discount_amount ?? 0));

  let baseFare = Math.max(0, Number(input.base_fare ?? 0));
  let platformFee = Math.max(0, Number(input.platform_fee ?? 0));

  if (baseFare <= 0 && platformFee <= 0 && tripFareTotal > 0) {
    if (input.booking_type === "self_drive") {
      const multiplier =
        1 +
        0.05 +
        (0.05 * SELF_DRIVE_GST_ON_PLATFORM_FEE_PERCENT) / 100;
      baseFare = Math.round(tripFareTotal / multiplier);
      platformFee = Math.round(baseFare * 0.05);
    } else {
      platformFee = Math.round(tripFareTotal / 21);
      baseFare = Math.max(0, tripFareTotal - platformFee);
    }
  }

  let gst = Math.max(0, tripFareTotal - baseFare - platformFee);
  if (input.booking_type === "self_drive" && platformFee > 0) {
    const gstOnPlatform = Math.round(
      platformFee * (SELF_DRIVE_GST_ON_PLATFORM_FEE_PERCENT / 100)
    );
    if (gst === 0 || Math.abs(gst - gstOnPlatform) <= 2) {
      gst = gstOnPlatform;
    }
  }

  return {
    baseFare,
    platformFee,
    gst,
    discountAmount,
    tripFareTotal,
  };
}
