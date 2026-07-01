import { deriveInvoiceTaxBreakdown } from "@/lib/booking/invoice-tax-breakdown";
import { formatINR } from "@/lib/utils";
import type { InvoiceTaxBreakdownInput } from "@/lib/booking/invoice-tax-breakdown";

interface Props {
  booking: InvoiceTaxBreakdownInput & { booking_type?: string };
}

export default function InvoiceTaxBreakdownTable({ booking }: Props) {
  const breakdown = deriveInvoiceTaxBreakdown(booking);

  return (
    <div className="mb-6 rounded-xl border border-gray-200 p-5 print:border-gray-300">
      <h2 className="text-lg font-bold mb-4">Tax Invoice Breakdown</h2>
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="py-2 text-gray-500">Base Fare</td>
            <td className="py-2 text-right font-medium">{formatINR(breakdown.baseFare)}</td>
          </tr>
          {breakdown.discountAmount > 0 && (
            <tr className="border-b border-gray-100">
              <td className="py-2 text-gray-500">Discount</td>
              <td className="py-2 text-right font-medium text-emerald-700">
                -{formatINR(breakdown.discountAmount)}
              </td>
            </tr>
          )}
          <tr className="border-b border-gray-100">
            <td className="py-2 text-gray-500">Platform Fee</td>
            <td className="py-2 text-right font-medium">{formatINR(breakdown.platformFee)}</td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-2 text-gray-500">GST</td>
            <td className="py-2 text-right font-medium">{formatINR(breakdown.gst)}</td>
          </tr>
          <tr>
            <td className="py-2 font-semibold text-secondary">Total Trip Fare</td>
            <td className="py-2 text-right font-bold text-primary">
              {formatINR(breakdown.tripFareTotal)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-xs text-gray-500">
        Itemised breakup for GST compliance. Customer checkout displays an all-inclusive trip fare.
      </p>
    </div>
  );
}
