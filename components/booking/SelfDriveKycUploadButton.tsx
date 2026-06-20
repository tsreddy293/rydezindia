"use client";

import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import { resolveSelfDriveKycHref } from "@/lib/kyc/self-drive-nav";

interface Props {
  isRiderLoggedIn: boolean;
  bookingReturnPath: string;
  variant?: "primary" | "outline";
  label?: string;
}

export default function SelfDriveKycUploadButton({
  isRiderLoggedIn,
  bookingReturnPath,
  variant = "primary",
  label = "Upload KYC Documents",
}: Props) {
  const router = useRouter();

  function handleClick() {
    const href = resolveSelfDriveKycHref(isRiderLoggedIn, bookingReturnPath);
    router.push(href);
  }

  return (
    <Button type="button" variant={variant} onClick={handleClick}>
      <Upload className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
