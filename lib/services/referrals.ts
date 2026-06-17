import { createAdminClient } from "@/lib/supabase/admin";
import { creditWallet } from "@/lib/services/wallet";

const REFERRER_REWARD = 100;
const REFEREE_REWARD = 50;

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const db = createAdminClient();
  const { data: user } = await db.from("users").select("referral_code").eq("id", userId).maybeSingle();
  const existing = (user as { referral_code?: string } | null)?.referral_code;
  if (existing) return existing;

  const code = `RYD${userId.replace(/-/g, "").slice(0, 5).toUpperCase()}`;
  await db.from("users").update({ referral_code: code }).eq("id", userId);
  return code;
}

export async function applyReferralCode(input: {
  newUserId: string;
  referralCode: string;
  mobile?: string;
}) {
  const db = createAdminClient();
  const code = input.referralCode.trim().toUpperCase();

  const { data: referrer } = await db
    .from("users")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();

  if (!referrer) throw new Error("Invalid referral code");
  const referrerId = (referrer as { id: string }).id;
  if (referrerId === input.newUserId) throw new Error("You cannot use your own referral code");

  const { data: existing } = await db
    .from("referrals")
    .select("id")
    .eq("referred_user_id", input.newUserId)
    .maybeSingle();
  if (existing) throw new Error("Referral already applied");

  const { data, error } = await db
    .from("referrals")
    .insert({
      referrer_id: referrerId,
      referral_code: code,
      referred_user_id: input.newUserId,
      referred_mobile: input.mobile ?? null,
      status: "pending",
      referrer_reward: REFERRER_REWARD,
      referee_reward: REFEREE_REWARD,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await db.from("users").update({ referred_by: referrerId }).eq("id", input.newUserId);

  await creditWallet({
    userId: input.newUserId,
    amount: REFEREE_REWARD,
    source: "referral_signup",
    referenceId: data.id as string,
    description: `Welcome bonus via referral ${code}`,
  });

  return { referralId: data.id as string, refereeReward: REFEREE_REWARD };
}

export async function completeReferral(referredUserId: string) {
  const db = createAdminClient();
  const { data: referral } = await db
    .from("referrals")
    .select("*")
    .eq("referred_user_id", referredUserId)
    .eq("status", "pending")
    .maybeSingle();

  if (!referral) return null;

  const row = referral as {
    id: string;
    referrer_id: string;
    referrer_reward: number;
  };

  await db
    .from("referrals")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", row.id);

  await creditWallet({
    userId: row.referrer_id,
    amount: Number(row.referrer_reward),
    source: "referral_completed",
    referenceId: row.id,
    description: "Referral reward — friend completed first booking",
  });

  return row;
}

export async function getReferralStats(userId: string) {
  const db = createAdminClient();
  const code = await getOrCreateReferralCode(userId);
  const { data: referrals } = await db
    .from("referrals")
    .select("*")
    .eq("referrer_id", userId);

  const rows = referrals ?? [];
  const completed = rows.filter((r) => (r as { status: string }).status === "completed");
  const earnings = completed.reduce(
    (sum, r) => sum + Number((r as { referrer_reward: number }).referrer_reward),
    0
  );

  return {
    referralCode: code,
    totalReferrals: rows.length,
    successfulReferrals: completed.length,
    earnings,
  };
}
