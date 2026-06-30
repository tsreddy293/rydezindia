import {
  calculateSelfDrivePricing,
  computeSelfDriveRentalDays,
  getLongDurationDiscountPercent,
  resolveSelfDriveDepositInfo,
} from "@/lib/pricing/self-drive-pricing";

const explicitDeposit = resolveSelfDriveDepositInfo({ security_deposit: 8000, vehicle_type: "Sedan" });
const pricing = calculateSelfDrivePricing(1500, explicitDeposit, 1);

if (pricing.dailyRent !== 1500) throw new Error(`dailyRent: ${pricing.dailyRent}`);
if (pricing.rentalDays !== 1) throw new Error(`rentalDays: ${pricing.rentalDays}`);
if (pricing.vehicleRentTotal !== 1500) throw new Error(`vehicleRentTotal: ${pricing.vehicleRentTotal}`);
if (pricing.platformFee !== 75) throw new Error(`platformFee: ${pricing.platformFee}`);
if (pricing.gst !== 14) throw new Error(`gst: ${pricing.gst}`);
if (pricing.payableAmount !== 1589) throw new Error(`payableAmount: ${pricing.payableAmount}`);
if (pricing.deposit.amount !== 8000) throw new Error(`deposit.amount: ${pricing.deposit.amount}`);
if (pricing.deposit.collectedAtPickup) throw new Error("explicit deposit should not be at pickup");
if (pricing.securityDeposit !== 8000) throw new Error(`securityDeposit: ${pricing.securityDeposit}`);

const twoDayPricing = calculateSelfDrivePricing(1799, explicitDeposit, 2);
if (twoDayPricing.vehicleRentTotal !== 3598) {
  throw new Error(`2-day vehicleRentTotal: ${twoDayPricing.vehicleRentTotal}`);
}
if (twoDayPricing.platformFee !== 180) throw new Error(`2-day platformFee: ${twoDayPricing.platformFee}`);
if (twoDayPricing.payableAmount !== 3598 + 180 + Math.round(180 * 0.18)) {
  throw new Error(`2-day payableAmount: ${twoDayPricing.payableAmount}`);
}

const days25h = computeSelfDriveRentalDays({
  pickupDate: "2026-06-17",
  pickupTime: "10:00",
  returnDate: "2026-06-18",
  returnTime: "11:00",
});
if (days25h !== 2) throw new Error(`25h rental days: ${days25h}`);

const days23h = computeSelfDriveRentalDays({
  pickupDate: "2026-06-17",
  pickupTime: "10:00",
  returnDate: "2026-06-18",
  returnTime: "09:00",
});
if (days23h !== 1) throw new Error(`23h rental days: ${days23h}`);

const pickupDeposit = resolveSelfDriveDepositInfo({ vehicle_type: "SUV" });
const pickupPricing = calculateSelfDrivePricing(1500, pickupDeposit, 1);
if (!pickupPricing.deposit.collectedAtPickup) throw new Error("tier-2 deposit should be at pickup");
if (pickupPricing.deposit.min !== 5000 || pickupPricing.deposit.max !== 7500) {
  throw new Error(`SUV range: ${pickupPricing.deposit.min}-${pickupPricing.deposit.max}`);
}
if (pickupPricing.securityDeposit !== 0) throw new Error("pickup deposit must not be in online total");

if (getLongDurationDiscountPercent(2) !== 0) throw new Error("2 days should be 0%");
if (getLongDurationDiscountPercent(3) !== 5) throw new Error("3 days should be 5%");
if (getLongDurationDiscountPercent(6) !== 5) throw new Error("6 days should be 5%");
if (getLongDurationDiscountPercent(7) !== 10) throw new Error("7 days should be 10%");
if (getLongDurationDiscountPercent(14) !== 10) throw new Error("14 days should be 10%");
if (getLongDurationDiscountPercent(15) !== 15) throw new Error("15 days should be 15%");
if (getLongDurationDiscountPercent(29) !== 15) throw new Error("29 days should be 15%");
if (getLongDurationDiscountPercent(30) !== 20) throw new Error("30 days should be 20%");
if (getLongDurationDiscountPercent(31) !== 20) throw new Error("31 days should be 20%");

const longRental = calculateSelfDrivePricing(1799, explicitDeposit, 29);
if (longRental.longDurationDiscountPercent !== 15) {
  throw new Error(`29-day discount percent: ${longRental.longDurationDiscountPercent}`);
}
if (longRental.longDurationDiscountAmount !== Math.floor(1799 * 29 * 0.15)) {
  throw new Error(`29-day discount amount: ${longRental.longDurationDiscountAmount}`);
}

console.log("self-drive-pricing tests passed");
