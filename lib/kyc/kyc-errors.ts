import { isMissingTableError, isMissingColumnError } from "@/lib/supabase/errors";

export type KycFailurePhase = "auth" | "validation" | "storage" | "database" | "profile" | "notification" | "unknown";

export type KycFailureDetail = {
  phase: KycFailurePhase;
  functionName: string;
  code?: string;
  message: string;
  hint?: string;
  supabaseResponse?: Record<string, unknown>;
};

export class KycSubmitError extends Error {
  readonly phase: KycFailurePhase;
  readonly code?: string;
  readonly hint?: string;
  readonly functionName: string;
  readonly supabaseResponse?: Record<string, unknown>;

  constructor(detail: KycFailureDetail) {
    super(detail.message);
    this.name = "KycSubmitError";
    this.phase = detail.phase;
    this.code = detail.code;
    this.hint = detail.hint;
    this.functionName = detail.functionName;
    this.supabaseResponse = detail.supabaseResponse;
  }

  toDetail(): KycFailureDetail {
    return {
      phase: this.phase,
      functionName: this.functionName,
      code: this.code,
      message: this.message,
      hint: this.hint,
      supabaseResponse: this.supabaseResponse,
    };
  }
}

export function isKycDevMode(): boolean {
  return process.env.NODE_ENV === "development";
}

function isStorageBucketMissingMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("bucket not found") ||
    lower.includes("bucket does not exist") ||
    (lower.includes("not found") && lower.includes("bucket"))
  );
}

const KYC_STORAGE_UNAVAILABLE =
  "Document storage is temporarily unavailable. Please try again later.";

const KYC_DATABASE_UNAVAILABLE =
  "KYC verification is temporarily unavailable. Please try again later or contact support.";

const PHASE_LABEL: Record<KycFailurePhase, string> = {
  auth: "Auth",
  validation: "Validation",
  storage: "Storage",
  database: "Database",
  profile: "Profile",
  notification: "Notification",
  unknown: "Unknown",
};

function friendlyMessage(detail: KycFailureDetail): string {
  if (detail.phase === "storage" && isStorageBucketMissingMessage(detail.message)) {
    return KYC_STORAGE_UNAVAILABLE;
  }
  if (detail.phase === "database" && isMissingTableError({ code: detail.code, message: detail.message })) {
    return KYC_DATABASE_UNAVAILABLE;
  }
  if (detail.phase === "validation") return detail.message;
  if (detail.phase === "auth") return "Please sign in as a rider to submit KYC.";
  return detail.message.length > 200 ? `${detail.message.slice(0, 200)}…` : detail.message;
}

export function formatKycFailureForClient(detail: KycFailureDetail): string {
  if (isKycDevMode()) {
    const label = PHASE_LABEL[detail.phase];
    const codePart = detail.code ? `[${detail.code}] ` : "";
    const hintPart = detail.hint ? `\nHint: ${detail.hint}` : "";
    const fnPart = `\nFunction: ${detail.functionName}`;
    const respPart = detail.supabaseResponse
      ? `\nSupabase: ${JSON.stringify(detail.supabaseResponse)}`
      : "";
    return `${label} Error: ${codePart}${detail.message}${hintPart}${fnPart}${respPart}`;
  }
  return friendlyMessage(detail);
}

export function supabaseErrorToDetail(
  error: { code?: string; message?: string; hint?: string; details?: string } | null | undefined,
  phase: KycFailurePhase,
  functionName: string
): KycFailureDetail {
  return {
    phase,
    functionName,
    code: error?.code,
    message: error?.message ?? "Unknown Supabase error",
    hint: error?.hint,
    supabaseResponse: error
      ? {
          code: error.code ?? null,
          message: error.message ?? null,
          hint: error.hint ?? null,
          details: error.details ?? null,
        }
      : undefined,
  };
}

export function toKycSubmitFailure(error: unknown, functionName: string): KycFailureDetail {
  if (error instanceof KycSubmitError) return error.toDetail();

  const message = error instanceof Error ? error.message : String(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code ?? "")
      : undefined;

  if (message.toLowerCase().includes("sign in") || message.toLowerCase().includes("unauthorized")) {
    return { phase: "auth", functionName, message, code: code || undefined };
  }

  if (isStorageBucketMissingMessage(message)) {
    return { phase: "storage", functionName, message, code: code || "STORAGE" };
  }

  if (
    isMissingTableError({ code, message }) ||
    isMissingColumnError({ message }) ||
    code === "PGRST205" ||
    code === "42P01"
  ) {
    return {
      phase: "database",
      functionName,
      message,
      code: code || "PGRST205",
      hint: message.includes("customer_profiles")
        ? "Perhaps you meant the table 'public.customer_profiles'"
        : undefined,
    };
  }

  return { phase: "unknown", functionName, message, code: code || undefined };
}

export function logKycFailure(label: string, detail: KycFailureDetail): void {
  console.error(`[${label}] KYC submit failure`, {
    phase: detail.phase,
    functionName: detail.functionName,
    code: detail.code ?? null,
    message: detail.message,
    hint: detail.hint ?? null,
    supabaseResponse: detail.supabaseResponse ?? null,
  });
}
