import { deriveInvoiceTaxBreakdown } from "@/lib/booking/invoice-tax-breakdown";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function runInvoiceTaxBreakdownTests() {
  const stored = deriveInvoiceTaxBreakdown({
    booking_type: "self_drive",
    trip_fare_amount: 1589,
    base_fare: 1500,
    platform_fee: 75,
    discount_amount: 0,
  });

  assert(stored.tripFareTotal === 1589, "Trip fare total must match stored amount");
  assert(stored.gst === 14, `GST residual should be 14, got ${stored.gst}`);
  assert(stored.baseFare + stored.platformFee + stored.gst === 1589, "Breakdown must sum to trip fare");

  const derived = deriveInvoiceTaxBreakdown({
    booking_type: "with_driver",
    trip_fare_amount: 4482,
  });

  assert(derived.tripFareTotal === 4482, "Derived trip fare must match input");
  assert(derived.baseFare + derived.platformFee + derived.gst === 4482, "Derived lines must sum to total");

  console.log("invoice-tax-breakdown tests passed");
}

runInvoiceTaxBreakdownTests();
