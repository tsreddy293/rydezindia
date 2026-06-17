import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import Button from "@/components/ui/Button";
import { fetchWalletData } from "@/server/actions/phase2";
import { formatDate, formatINR } from "@/lib/utils";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Rydez Wallet",
  description: "View your Rydez India wallet balance and transactions.",
  path: "/user/wallet",
  noIndex: true,
});

export default async function WalletPage() {
  await requireRole("user");
  const { balance, transactions } = await fetchWalletData();

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <UserDashboardNav />
        <h1 className="text-3xl font-bold text-secondary mb-8">Rydez Wallet</h1>

        <div className="rounded-2xl bg-gradient-to-br from-secondary to-primary text-white p-8 mb-8">
          <p className="text-white/70 text-sm">Available Balance</p>
          <p className="text-4xl font-bold mt-1">{formatINR(balance)}</p>
        </div>

        <h2 className="font-semibold text-secondary mb-4">Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">No transactions yet. Earn credits via referrals!</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const row = tx as Record<string, unknown>;
              const isCredit = row.type === "credit";
              return (
                <div key={String(row.id)} className="flex justify-between rounded-xl border bg-white p-4 text-sm">
                  <div>
                    <p className="font-medium">{String(row.description ?? row.source)}</p>
                    <p className="text-gray-400 text-xs">{formatDate(String(row.created_at))}</p>
                  </div>
                  <p className={`font-semibold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                    {isCredit ? "+" : "-"}{formatINR(Number(row.amount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-6">
          <Button href="/user/referrals" variant="outline">Earn via Referrals</Button>
        </div>
      </div>
    </PageLayout>
  );
}
