import type { OwnerStatus } from "@/lib/admin/owner-status";

/** Normalize raw owner_profiles.kyc_status / owner_status for admin UI. */
export function normalizeProfileStatus(value: unknown, fallback: OwnerStatus = "pending"): OwnerStatus {
  const raw = String(value ?? fallback).toLowerCase();
  if (raw === "approved" || raw === "verified") return "approved";
  if (raw === "rejected") return "rejected";
  if (raw === "pending" || raw === "not_submitted" || raw === "submitted") return "pending";
  return fallback;
}

export function profileKycIsApproved(value: unknown): boolean {
  return normalizeProfileStatus(value) === "approved";
}
