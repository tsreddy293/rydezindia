import { createAdminClient } from "@/lib/supabase/admin";

export async function getOrCreateWallet(userId: string) {
  const db = createAdminClient();
  const { data: existing } = await db
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await db
    .from("wallets")
    .insert({ user_id: userId, balance: 0 })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
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
  const walletId = (wallet as { id: string }).id;
  const currentBalance = Number((wallet as { balance: number }).balance);
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
  if (txError) throw new Error(txError.message);

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
  const walletId = (wallet as { id: string }).id;
  const currentBalance = Number((wallet as { balance: number }).balance);

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
  if (txError) throw new Error(txError.message);

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
  if (error) return [];
  return data ?? [];
}

export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await getOrCreateWallet(userId);
  return Number((wallet as { balance: number }).balance);
}
