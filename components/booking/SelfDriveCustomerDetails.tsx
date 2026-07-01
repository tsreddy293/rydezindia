"use client";

import BookingCustomerDetails from "@/components/booking/BookingCustomerDetails";

interface Props {
  name: string;
  mobile?: string;
  email?: string;
}

/** Self-drive checkout customer block — always KYC + mobile verified after gate. */
export default function SelfDriveCustomerDetails({ name, mobile, email }: Props) {
  return (
    <BookingCustomerDetails
      name={name}
      mobile={mobile}
      email={email}
      kycApproved
      mobileVerified
    />
  );
}
