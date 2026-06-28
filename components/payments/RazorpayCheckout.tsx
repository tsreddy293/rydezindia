"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatINR } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface Props {
  bookingId: string;
  amount: number;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  paymentType?: "advance" | "full";
  onSuccess: (paymentId: string) => void;
  onError: (message: string) => void;
}

export default function RazorpayCheckout({
  bookingId,
  amount,
  customerName,
  customerMobile,
  customerEmail,
  paymentType = "full",
  onSuccess,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || window.Razorpay) {
      setScriptReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => onError("Failed to load Razorpay checkout");
    document.body.appendChild(script);
  }, [onError]);

  async function handlePay() {
    setLoading(true);
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, amount, paymentType }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || "Failed to create order");

      if (!window.Razorpay) throw new Error("Razorpay not loaded");

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: Math.round(amount * 100),
        currency: "INR",
        name: "Rydez India",
        description: paymentType === "advance" ? "Advance Payment" : "Full Payment",
        order_id: orderData.order.id,
        prefill: {
          name: customerName,
          contact: customerMobile,
          email: customerEmail || `${customerMobile}@rydezindia.com`,
        },
        theme: { color: "#007bff" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentType,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyData.success) {
            onError(verifyData.error || "Payment verification failed");
            return;
          }
          onSuccess(response.razorpay_payment_id);
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            onError("Payment was cancelled. You can retry when ready.");
          },
        },
      });

      const rzpWithEvents = rzp as unknown as {
        on: (event: string, cb: (payload: { error?: { description?: string } }) => void) => void;
        open: () => void;
      };
      rzpWithEvents.on("payment.failed", (response) => {
        setLoading(false);
        onError(response.error?.description ?? "Payment failed. Please retry.");
      });

      rzp.open();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-secondary mb-2">Complete Payment</h3>
      <p className="text-sm text-gray-500 mb-4">
        Pay via UPI, Google Pay, PhonePe, Debit Card, or Credit Card
      </p>
      <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 mb-4">
        <span className="text-gray-600">
          {paymentType === "advance" ? "Advance (30%)" : "Full Payment"}
        </span>
        <span className="text-xl font-bold text-primary">{formatINR(amount)}</span>
      </div>
      <Button
        type="button"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={loading || !scriptReady}
        onClick={handlePay}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          "Pay Securely with Razorpay"
        )}
      </Button>
    </div>
  );
}
