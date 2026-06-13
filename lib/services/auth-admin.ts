import { createAdminClient } from "@/lib/supabase/admin";

export type AuthAccountRow = {
  id: string;
  email: string;
  verified: boolean;
  lastLogin: string;
  status: string;
};

export async function getAuthAccounts(): Promise<AuthAccountRow[]> {
  const db = createAdminClient();
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return [];
  return data.users.map((user) => ({
    id: user.id,
    email: user.email ?? "",
    verified: Boolean(user.email_confirmed_at || user.confirmed_at),
    lastLogin: user.last_sign_in_at ?? "",
    status: user.banned_until && new Date(user.banned_until) > new Date() ? "blocked" : "active",
  }));
}

export async function getAuthStats() {
  const accounts = await getAuthAccounts();
  const verified = accounts.filter((account) => account.verified).length;
  const unverified = accounts.length - verified;
  const blocked = accounts.filter((account) => account.status === "blocked").length;
  return { total: accounts.length, verified, unverified, blocked };
}
