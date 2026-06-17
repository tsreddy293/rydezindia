import { calculateSelfDrivePricing } from "@/lib/pricing/self-drive-pricing";

const pricing = calculateSelfDrivePricing(1500, 8000);

if (pricing.dailyRent !== 1500) throw new Error(`dailyRent: ${pricing.dailyRent}`);
if (pricing.platformFee !== 75) throw new Error(`platformFee: ${pricing.platformFee}`);
if (pricing.gst !== 14) throw new Error(`gst: ${pricing.gst}`);
if (pricing.payableAmount !== 1589) throw new Error(`payableAmount: ${pricing.payableAmount}`);
if (pricing.securityDeposit !== 8000) throw new Error(`securityDeposit: ${pricing.securityDeposit}`);
if (pricing.payableAmount + pricing.securityDeposit === pricing.payableAmount) {
  throw new Error("security deposit must not be included in payable");
}

console.log("self-drive-pricing tests passed");
