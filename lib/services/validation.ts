import { NextRequest } from "next/server";

export const MOBILE_REGEX = /^[6-9]\d{9}$/;

export function normalizeMobile(mobile: string) {
  return mobile.replace(/\D/g, "").slice(-10);
}

export function isValidIndianMobile(mobile: string) {
  return MOBILE_REGEX.test(normalizeMobile(mobile));
}

export function requireValidMobile(mobile: string) {
  const normalized = normalizeMobile(mobile);
  if (!isValidIndianMobile(normalized)) {
    throw new Error("Enter a valid 10-digit Indian mobile number");
  }
  return normalized;
}

export function requireString(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

export function requireAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  return amount;
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return;
  const expected = new URL(origin).host;
  if (expected !== host) throw new Error("Invalid request origin");
}
