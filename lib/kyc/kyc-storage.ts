import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableError } from "@/lib/supabase/errors";
import { KycSubmitError, supabaseErrorToDetail } from "@/lib/kyc/kyc-errors";

/** Standard Supabase Storage buckets for KYC documents (separate owner vs rider). */
export const KYC_STORAGE_BUCKETS = {
  owner: "owner-kyc",
  customer: "customer-kyc",
} as const;

export type KycStorageBucketId = (typeof KYC_STORAGE_BUCKETS)[keyof typeof KYC_STORAGE_BUCKETS];

export const KYC_STORAGE_UNAVAILABLE =
  "Document storage is temporarily unavailable. Please try again later.";

export const KYC_DATABASE_UNAVAILABLE =
  "KYC verification is temporarily unavailable. Please try again later or contact support.";

type StorageApiError = {
  message?: string;
  name?: string;
  statusCode?: number | string;
  error?: string;
};

const bucketCheckCache = new Map<string, { ok: boolean; checkedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function serializeStorageError(error: StorageApiError | null | undefined) {
  if (!error) return null;
  return {
    message: error.message ?? null,
    name: error.name ?? null,
    statusCode: error.statusCode ?? null,
    error: error.error ?? null,
  };
}

export function isStorageBucketMissingError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("bucket not found") ||
    lower.includes("bucket does not exist") ||
    (lower.includes("not found") && lower.includes("bucket"))
  );
}

export function mapKycStorageError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (isMissingTableError({ message })) return KYC_DATABASE_UNAVAILABLE;
  if (isStorageBucketMissingError(message)) return KYC_STORAGE_UNAVAILABLE;
  return message;
}

type BucketProbeResult =
  | { ok: true; method: "getBucket" | "listBuckets" | "upload-skipped-check" }
  | { ok: false; method: "getBucket" | "listBuckets"; detail: ReturnType<typeof serializeStorageError> };

async function probeBucketExists(
  db: SupabaseClient,
  bucketId: KycStorageBucketId
): Promise<BucketProbeResult> {
  const { data: bucket, error: getBucketError } = await db.storage.getBucket(bucketId);

  console.info("[kyc-storage] getBucket", {
    bucketId,
    found: Boolean(bucket),
    bucketName: bucket?.name ?? null,
    public: bucket?.public ?? null,
    error: serializeStorageError(getBucketError as StorageApiError),
  });

  if (!getBucketError && bucket) {
    return { ok: true, method: "getBucket" };
  }

  if (getBucketError && isStorageBucketMissingError(getBucketError.message ?? "")) {
    return {
      ok: false,
      method: "getBucket",
      detail: serializeStorageError(getBucketError as StorageApiError),
    };
  }

  const { data: buckets, error: listError } = await db.storage.listBuckets();

  console.info("[kyc-storage] listBuckets", {
    bucketId,
    count: buckets?.length ?? 0,
    ids: buckets?.map((b) => b.id) ?? [],
    error: serializeStorageError(listError as StorageApiError),
  });

  if (!listError && buckets?.some((b) => b.id === bucketId || b.name === bucketId)) {
    return { ok: true, method: "listBuckets" };
  }

  if (listError) {
    // Do not treat listBuckets auth/API failures as "bucket missing" — attempt upload and log real error.
    console.warn("[kyc-storage] listBuckets failed; skipping negative bucket cache", {
      bucketId,
      error: serializeStorageError(listError as StorageApiError),
    });
    return { ok: true, method: "upload-skipped-check" };
  }

  return {
    ok: false,
    method: "listBuckets",
    detail: serializeStorageError(getBucketError as StorageApiError),
  };
}

/** Validates bucket exists before upload; caches positive results and confirmed-missing only. */
export async function ensureKycBucketExists(
  db: SupabaseClient,
  bucketId: KycStorageBucketId
): Promise<void> {
  const cached = bucketCheckCache.get(bucketId);
  if (cached?.ok && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return;
  }
  if (cached && !cached.ok && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    console.error("[kyc-storage] bucket check cached as missing", { bucketId });
    throw new KycSubmitError({
      phase: "storage",
      functionName: "ensureKycBucketExists",
      code: "BUCKET_MISSING_CACHED",
      message: `Storage bucket '${bucketId}' not found (cached probe)`,
    });
  }

  const probe = await probeBucketExists(db, bucketId);

  if (probe.ok) {
    bucketCheckCache.set(bucketId, { ok: true, checkedAt: Date.now() });
    return;
  }

  bucketCheckCache.set(bucketId, { ok: false, checkedAt: Date.now() });
  console.error("[kyc-storage] bucket confirmed missing", {
    bucketId,
    method: probe.method,
    detail: probe.detail,
  });
  throw new KycSubmitError({
    phase: "storage",
    functionName: "ensureKycBucketExists",
    code: "BUCKET_MISSING",
    message: `Storage bucket '${bucketId}' not found`,
    supabaseResponse: probe.detail ?? undefined,
  });
}

export function kycObjectPath(userId: string, key: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  return `${userId}/${key}-${Date.now()}.${ext}`;
}

export async function uploadKycDocument(
  db: SupabaseClient,
  bucketId: KycStorageBucketId,
  objectPath: string,
  file: File,
  context?: { userId?: string; field?: string }
): Promise<string> {
  console.info("[kyc-storage] upload start", {
    bucketId,
    objectPath,
    userId: context?.userId ?? objectPath.split("/")[0] ?? null,
    field: context?.field ?? null,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || "application/octet-stream",
  });

  await ensureKycBucketExists(db, bucketId);

  const { data: uploadData, error } = await db.storage.from(bucketId).upload(objectPath, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  console.info("[kyc-storage] upload response", {
    bucketId,
    objectPath,
    success: !error,
    path: uploadData?.path ?? null,
    error: serializeStorageError(error as StorageApiError),
  });

  if (error) {
    console.error("[kyc-storage] upload failed", {
      bucketId,
      objectPath,
      error: serializeStorageError(error as StorageApiError),
    });
    const detail = supabaseErrorToDetail(
      {
        code: String((error as StorageApiError).statusCode ?? (error as StorageApiError).name ?? "STORAGE"),
        message: error.message,
      },
      "storage",
      "uploadKycDocument"
    );
    throw new KycSubmitError(detail);
  }

  const { data } = db.storage.from(bucketId).getPublicUrl(objectPath);
  console.info("[kyc-storage] public url", { bucketId, objectPath, publicUrl: data.publicUrl });

  return data.publicUrl;
}

/** Clears cached bucket checks (useful after running storage migrations). */
export function clearKycBucketCache(): void {
  bucketCheckCache.clear();
}

/** Server-side diagnostic helper (logs only; does not upload). */
export async function diagnoseKycStorage(db: SupabaseClient): Promise<void> {
  for (const bucketId of Object.values(KYC_STORAGE_BUCKETS)) {
    await probeBucketExists(db, bucketId);
  }
}
