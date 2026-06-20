import type { SupabaseClient } from "@supabase/supabase-js";

/** Standard Supabase Storage buckets for KYC documents (separate owner vs rider). */
export const KYC_STORAGE_BUCKETS = {
  owner: "owner-kyc",
  customer: "customer-kyc",
} as const;

export type KycStorageBucketId = (typeof KYC_STORAGE_BUCKETS)[keyof typeof KYC_STORAGE_BUCKETS];

export const KYC_STORAGE_UNAVAILABLE =
  "Document storage is temporarily unavailable. Please try again later.";

const bucketCheckCache = new Map<string, { ok: boolean; checkedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

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
  if (isStorageBucketMissingError(message)) return KYC_STORAGE_UNAVAILABLE;
  return message;
}

async function bucketExists(db: SupabaseClient, bucketId: string): Promise<boolean> {
  const { data, error } = await db.storage.getBucket(bucketId);
  if (!error && data) return true;

  const { data: buckets, error: listError } = await db.storage.listBuckets();
  if (listError) {
    console.error("[bucketExists] listBuckets failed:", listError.message);
    return false;
  }
  return buckets?.some((b) => b.id === bucketId || b.name === bucketId) ?? false;
}

/** Validates bucket exists before upload; caches result for 5 minutes. */
export async function ensureKycBucketExists(db: SupabaseClient, bucketId: KycStorageBucketId): Promise<void> {
  const cached = bucketCheckCache.get(bucketId);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    if (!cached.ok) throw new Error(KYC_STORAGE_UNAVAILABLE);
    return;
  }

  const ok = await bucketExists(db, bucketId);
  bucketCheckCache.set(bucketId, { ok, checkedAt: Date.now() });

  if (!ok) {
    console.error("[ensureKycBucketExists] bucket missing:", bucketId);
    throw new Error(KYC_STORAGE_UNAVAILABLE);
  }
}

export function kycObjectPath(userId: string, key: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  return `${userId}/${key}-${Date.now()}.${ext}`;
}

export async function uploadKycDocument(
  db: SupabaseClient,
  bucketId: KycStorageBucketId,
  objectPath: string,
  file: File
): Promise<string> {
  await ensureKycBucketExists(db, bucketId);

  const { error } = await db.storage.from(bucketId).upload(objectPath, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) throw new Error(mapKycStorageError(error));

  const { data } = db.storage.from(bucketId).getPublicUrl(objectPath);
  return data.publicUrl;
}

/** Clears cached bucket checks (useful after running storage migrations). */
export function clearKycBucketCache(): void {
  bucketCheckCache.clear();
}
