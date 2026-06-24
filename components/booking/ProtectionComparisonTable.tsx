import { PROTECTION_COMPARISON_ROWS } from "@/lib/services/flexible-cancellation-protection";

interface Props {
  compact?: boolean;
  className?: string;
}

export default function ProtectionComparisonTable({ compact = false, className = "" }: Props) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-200 ${className}`}>
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-3 py-2.5 font-semibold text-secondary sm:px-4">Feature</th>
            <th className="px-3 py-2.5 font-semibold text-gray-600 sm:px-4">Regular Policy</th>
            <th className="px-3 py-2.5 font-semibold text-emerald-800 sm:px-4">Protected Policy</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {PROTECTION_COMPARISON_ROWS.map((row) => (
            <tr key={row.feature} className="bg-white">
              <td className="px-3 py-2.5 font-medium text-secondary sm:px-4">{row.feature}</td>
              <td className="px-3 py-2.5 text-gray-600 sm:px-4">{row.regular}</td>
              <td className="px-3 py-2.5 font-medium text-emerald-800 sm:px-4">{row.protected}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!compact && (
        <p className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500 sm:px-4">
          Regular policy applies when protection is not selected. Deposit refunds follow standard inspection rules.
        </p>
      )}
    </div>
  );
}
