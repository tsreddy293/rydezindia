import {
  isBookingOtpEnabled,
  isLoggedInRiderMobileTrusted,
  isOtpInfrastructureError,
  isValidBookingMobile,
  shouldRequireBookingOtp,
} from "@/lib/booking/booking-mobile-verification";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function runBookingMobileVerificationTests() {
  assert(!isBookingOtpEnabled(), "Booking OTP should be disabled by default");
  assert(!shouldRequireBookingOtp({ loggedInUserId: "user-1" }), "Logged-in riders skip booking OTP");
  assert(!shouldRequireBookingOtp({ loggedInUserId: null }), "Disabled OTP skips guest checkout too");

  assert(isValidBookingMobile("9876543210"), "Valid Indian mobile should pass");
  assert(!isValidBookingMobile("123"), "Short mobile should fail");

  assert(
    isLoggedInRiderMobileTrusted({
      enteredMobile: "98765 43210",
      profileMobile: "9876543210",
    }),
    "Profile mobile should match normalized entered mobile"
  );

  assert(
    isOtpInfrastructureError("Could not find the table public.auth_otps in the schema cache"),
    "Schema cache errors should be detected"
  );

  console.log("booking-mobile-verification tests passed");
}

runBookingMobileVerificationTests();
