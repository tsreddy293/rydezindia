import Link from "next/link";
import { formatDate, formatINR } from "@/lib/utils";
import type { RiderDashboardData } from "@/lib/rider/dashboard-types";

export default function WalletSummary({ wallet }: { wallet: RiderDashboardData["wallet"] }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-secondary">Wallet</h2>
        <Link href="/dashboard/wallet" className="text-sm font-medium text-primary hover:underline">
          View All
        </Link>
      </div>
      <div className="mb-4 rounded-2xl bg-gradient-to-br from-secondary to-primary p-5 text-white">
        <p className="text-sm text-white/80">Available Balance</p>
        <p className="text-3xl font-bold">{formatINR(wallet.balance)}</p>
      </div>
      {wallet.recentTransactions.length === 0 ? (
        <p className="text-sm text-gray-500">No transactions yet. Earn via referrals!</p>
      ) : (
        <ul className="space-y-2">
          {wallet.recentTransactions.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-secondary">{tx.description}</p>
                <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
              </div>
              <p className={`font-semibold ${tx.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                {tx.type === "credit" ? "+" : "-"}
                {formatINR(tx.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
