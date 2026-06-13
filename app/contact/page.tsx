"use client";

import { useState } from "react";
import { Phone, Mail, Globe, MapPin, Send } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { COMPANY } from "@/lib/data";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <Send className="h-16 w-16 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-secondary mb-4">Message Sent!</h1>
          <p className="text-gray-600">We&apos;ll get back to you within 24 hours.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-secondary">Contact Us</h1>
          <p className="text-gray-600 mt-2">We&apos;d love to hear from you</p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            {[
              { icon: Phone, label: "Phone", value: `+91 ${COMPANY.phone}`, href: `tel:${COMPANY.phone}` },
              { icon: Mail, label: "Email", value: COMPANY.email, href: `mailto:${COMPANY.email}` },
              { icon: Globe, label: "Website", value: COMPANY.website, href: `https://${COMPANY.website}` },
              { icon: MapPin, label: "Headquarters", value: "Hyderabad, Telangana, India", href: undefined },
            ].map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-start gap-4 rounded-2xl bg-gray-50 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-secondary">{label}</p>
                  {href ? (
                    <a href={href} className="text-gray-600 hover:text-primary transition-colors">{value}</a>
                  ) : (
                    <p className="text-gray-600">{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); setSent(true); }}
            className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6"
          >
            <FormField label="Name" name="name" required />
            <FormField label="Email" name="email" type="email" required />
            <FormField label="Phone" name="phone" type="tel" />
            <FormField label="Subject" name="subject" required />
            <FormField label="Message" name="message" as="textarea" required rows={5} />
            <Button type="submit" variant="primary" size="lg" className="w-full">
              <Send className="h-5 w-5" /> Send Message
            </Button>
          </form>
        </div>
      </div>
    </PageLayout>
  );
}
