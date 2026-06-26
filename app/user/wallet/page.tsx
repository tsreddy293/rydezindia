import Button from "@/components/ui/Button";
import { fetchWalletData } from "@/server/actions/phase2";
import { formatDate, formatINR } from "@/lib/utils";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Rydez Wallet",
  description: "View your Rydez India wallet balance and transactions.",
  path: "/dashboard/wallet",
  noIndex: true,
});

export default async function WalletPage() {
  await requireRole("user");
  const { balance, transactions } = await fetchWalletData();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Rydez Wallet</h1>
        <p className="mt-1 text-sm text-gray-500">Balance and transaction history</p>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-secondary to-primary p-8 text-white shadow-lg">
        <p className="text-sm text-white/70">Available Balance</p>
        <p className="mt-1 text-4xl font-bold">{formatINR(balance)}</p>
      </div>

      <h2 className="font-semibold text-secondary">Transactions</h2>
      {transactions.length === 0 ? (
        <p className="text-sm text-gray-500">No transactions yet. Earn credits via referrals!</p>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const row = tx as Record<string, unknown>;
            const isCredit = row.type === "credit";
            return (
              <div key={String(row.id)} className="flex justify-between rounded-xl border bg-white p-4 text-sm shadow-sm">
                <div>
                  <p className="font-medium">{String(row.description ?? row.source)}</p>
                  <p className="text-xs text-gray-400">{formatDate(String(row.created_at))}</p>
                </div>
                <p className={`font-semibold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                  {isCredit ? "+" : "-"}
                  {formatINR(Number(row.amount))}
                </p>
              </div>
            );
          })}
        </div>
      )}
      <Button href="/dashboard/referrals" variant="outline">
        Earn via Referrals
      </Button>
    </div>
  );
}
