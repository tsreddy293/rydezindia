import { createAdminClient } from "@/lib/supabase/admin";

export type MessageChannel = "sms" | "email" | "whatsapp";

export type MessageTemplate =
  | "otp"
  | "booking_confirmed"
  | "booking_cancelled"
  | "payment_success"
  | "trip_started"
  | "trip_completed"
  | "trip_reminder"
  | "kyc_verified"
  | "kyc_rejected"
  | "document_expiry"
  | "sos_alert"
  | "signup_welcome"
  | "invoice";

const TEMPLATES: Record<MessageTemplate, { sms: string; email: string; whatsapp: string }> = {
  otp: {
    sms: "Your Rydez India OTP is {{otp}}. Valid for 5 minutes.",
    email: "Your Rydez India verification code is {{otp}}.",
    whatsapp: "🔐 Rydez India OTP: *{{otp}}* (valid 5 min)",
  },
  booking_confirmed: {
    sms: "Booking {{bookingRef}} confirmed! {{pickup}} → {{drop}} on {{date}}. Amount: ₹{{amount}}",
    email: "Your booking {{bookingRef}} is confirmed.",
    whatsapp: "✅ *Booking Confirmed*\nRef: {{bookingRef}}\nRoute: {{pickup}} → {{drop}}\nDate: {{date}}\nAmount: ₹{{amount}}",
  },
  booking_cancelled: {
    sms: "Booking {{bookingRef}} has been cancelled. Refund will be processed if applicable.",
    email: "Your booking {{bookingRef}} was cancelled.",
    whatsapp: "❌ Booking {{bookingRef}} cancelled.",
  },
  payment_success: {
    sms: "Payment of ₹{{amount}} received for booking {{bookingRef}}. Thank you!",
    email: "Payment confirmed for booking {{bookingRef}}.",
    whatsapp: "💳 Payment ₹{{amount}} received for {{bookingRef}}",
  },
  trip_started: {
    sms: "Your trip {{bookingRef}} has started. Track on Rydez India app.",
    email: "Your trip has started.",
    whatsapp: "🚗 Trip {{bookingRef}} started!",
  },
  trip_completed: {
    sms: "Trip {{bookingRef}} completed. Rate your experience on Rydez India!",
    email: "Trip completed. We hope you had a great ride!",
    whatsapp: "🏁 Trip {{bookingRef}} completed. Rate us!",
  },
  trip_reminder: {
    sms: "Reminder: Your trip {{bookingRef}} is tomorrow at {{time}}.",
    email: "Trip reminder for {{bookingRef}}.",
    whatsapp: "⏰ Trip reminder: {{bookingRef}} tomorrow {{time}}",
  },
  kyc_verified: {
    sms: "Your Rydez India KYC is verified. You can now book rides!",
    email: "KYC verification successful.",
    whatsapp: "✅ KYC Verified on Rydez India",
  },
  kyc_rejected: {
    sms: "KYC rejected. Please re-upload documents on Rydez India.",
    email: "KYC verification failed. Please re-submit.",
    whatsapp: "⚠️ KYC rejected. Re-upload required.",
  },
  document_expiry: {
    sms: "Vehicle document {{docType}} expires in {{days}} days. Renew on Rydez India.",
    email: "Document expiry alert.",
    whatsapp: "📋 Document {{docType}} expiring in {{days}} days",
  },
  sos_alert: {
    sms: "SOS ALERT: A Rydez India user triggered emergency. Contact support immediately.",
    email: "SOS emergency alert.",
    whatsapp: "🆘 SOS ALERT from Rydez India user",
  },
  signup_welcome: {
    sms: "Welcome to Rydez India! Book smart intercity rides with return journey deals.",
    email: "Welcome to Rydez India!",
    whatsapp: "👋 Welcome to *Rydez India*!",
  },
  invoice: {
    sms: "Invoice for booking {{bookingRef}}: ₹{{amount}}. Download from Rydez India.",
    email: "Your invoice for booking {{bookingRef}}.",
    whatsapp: "🧾 Invoice: {{bookingRef}} — ₹{{amount}}",
  },
};

function interpolate(template: string, payload: Record<string, unknown>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(payload[key] ?? ""));
}

async function logMessage(input: {
  channel: MessageChannel;
  recipient: string;
  template: string;
  payload: Record<string, unknown>;
  status: string;
}) {
  const db = createAdminClient();
  await db.from("message_logs").insert({
    channel: input.channel,
    recipient: input.recipient,
    template: input.template,
    payload: input.payload,
    status: input.status,
  });
}

async function sendSms(to: string, body: string) {
  const apiKey = process.env.SMS_API_KEY;
  const provider = process.env.SMS_PROVIDER || "console";
  if (!apiKey || provider === "console") {
    if (process.env.NODE_ENV !== "production") console.log(`[SMS] ${to}: ${body}`);
    return { ok: true };
  }
  // Plug in MSG91/Twilio/etc via SMS_PROVIDER env
  const response = await fetch(process.env.SMS_API_URL || "https://api.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: { "Content-Type": "application/json", authkey: apiKey },
    body: JSON.stringify({ mobiles: to, message: body }),
  });
  return { ok: response.ok };
}

async function sendEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") console.log(`[EMAIL] ${to}: ${subject} — ${body}`);
    return { ok: true };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Rydez India <noreply@rydezindia.com>",
      to: [to],
      subject,
      html: `<p>${body}</p>`,
    }),
  });
  return { ok: response.ok };
}

async function sendWhatsApp(to: string, body: string) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    if (process.env.NODE_ENV !== "production") console.log(`[WhatsApp] ${to}: ${body}`);
    return { ok: true };
  }
  const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body },
    }),
  });
  return { ok: response.ok };
}

export async function dispatchMessage(input: {
  channel: MessageChannel;
  recipient: string;
  template: MessageTemplate;
  payload?: Record<string, unknown>;
}) {
  const payload = input.payload ?? {};
  const templates = TEMPLATES[input.template];
  const body = interpolate(templates[input.channel], payload);

  let result: { ok: boolean };
  switch (input.channel) {
    case "sms":
      result = await sendSms(input.recipient, body);
      break;
    case "email":
      result = await sendEmail(input.recipient, `Rydez India — ${input.template}`, body);
      break;
    case "whatsapp":
      result = await sendWhatsApp(input.recipient, body);
      break;
  }

  await logMessage({
    channel: input.channel,
    recipient: input.recipient,
    template: input.template,
    payload,
    status: result.ok ? "sent" : "failed",
  });

  return result;
}

export async function dispatchBookingEvent(input: {
  event: "booking_confirmed" | "booking_cancelled" | "payment_success" | "trip_started" | "trip_completed";
  customerMobile?: string;
  customerEmail?: string;
  ownerMobile?: string;
  payload: Record<string, unknown>;
}) {
  const channels: MessageChannel[] = ["sms", "whatsapp"];
  const template = input.event as MessageTemplate;

  if (input.customerMobile) {
    for (const channel of channels) {
      await dispatchMessage({ channel, recipient: input.customerMobile, template, payload: input.payload });
    }
  }
  if (input.customerEmail) {
    await dispatchMessage({ channel: "email", recipient: input.customerEmail, template, payload: input.payload });
  }
  if (input.ownerMobile) {
    await dispatchMessage({ channel: "sms", recipient: input.ownerMobile, template, payload: input.payload });
  }
}
