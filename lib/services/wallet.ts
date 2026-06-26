import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";

type WalletRow = { id: string; user_id: string; balance: number };

function offlineWallet(userId: string): WalletRow {
  return { id: "offline", user_id: userId, balance: 0 };
}

export async function getOrCreateWallet(userId: string): Promise<WalletRow> {
  const db = createAdminClient();
  const { data: existing, error: selectError } = await db
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError && isMissingTableError(selectError)) {
    console.warn("[getOrCreateWallet] wallets table missing — using zero balance");
    return offlineWallet(userId);
  }

  if (existing) return existing as WalletRow;

  const { data, error } = await db
    .from("wallets")
    .insert({ user_id: userId, balance: 0 })
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      console.warn("[getOrCreateWallet] wallets table missing — using zero balance");
      return offlineWallet(userId);
    }
    throw new Error(error.message);
  }
  return data as WalletRow;
}

export async function creditWallet(input: {
  userId: string;
  amount: number;
  source: string;
  referenceId?: string;
  description?: string;
}) {
  const db = createAdminClient();
  const wallet = await getOrCreateWallet(input.userId);
  if (wallet.id === "offline") {
    console.warn("[creditWallet] wallets table missing — skipping credit");
    return 0;
  }

  const walletId = wallet.id;
  const currentBalance = Number(wallet.balance);
  const newBalance = currentBalance + input.amount;

  const { error: txError } = await db.from("wallet_transactions").insert({
    wallet_id: walletId,
    user_id: input.userId,
    type: "credit",
    amount: input.amount,
    source: input.source,
    reference_id: input.referenceId ?? null,
    description: input.description ?? null,
  });
  if (txError) {
    if (isMissingTableError(txError)) {
      console.warn("[creditWallet] wallet_transactions table missing — skipping credit");
      return currentBalance;
    }
    throw new Error(txError.message);
  }

  await db
    .from("wallets")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", walletId);

  return newBalance;
}

export async function debitWallet(input: {
  userId: string;
  amount: number;
  source: string;
  referenceId?: string;
  description?: string;
}) {
  const db = createAdminClient();
  const wallet = await getOrCreateWallet(input.userId);
  if (wallet.id === "offline") {
    throw new Error("Wallet is not available yet. Please try again later.");
  }

  const walletId = wallet.id;
  const currentBalance = Number(wallet.balance);

  if (currentBalance < input.amount) {
    throw new Error("Insufficient wallet balance");
  }

  const newBalance = currentBalance - input.amount;

  const { error: txError } = await db.from("wallet_transactions").insert({
    wallet_id: walletId,
    user_id: input.userId,
    type: "debit",
    amount: input.amount,
    source: input.source,
    reference_id: input.referenceId ?? null,
    description: input.description ?? null,
  });
  if (txError) {
    if (isMissingTableError(txError)) {
      throw new Error("Wallet is not available yet. Please try again later.");
    }
    throw new Error(txError.message);
  }

  await db
    .from("wallets")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", walletId);

  return newBalance;
}

export async function getWalletTransactions(userId: string, limit = 50) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingTableError(error)) return [];
    return [];
  }
  return data ?? [];
}

export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await getOrCreateWallet(userId);
  return Number(wallet.balance);
}
