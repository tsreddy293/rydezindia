"use client";

import Link from "next/link";
import { Car, User, IndianRupee } from "lucide-react";
import Button from "@/components/ui/Button";

type Mode = "login" | "signup";

interface Props {
  mode: Mode;
  /** When true, used inside the header modal (tighter outer shell, same card sizing). */
  compact?: boolean;
}

const LOGIN_OPTIONS = [
  {
    role: "rider" as const,
    icon: User,
    title: "Rider Login",
    description:
      "Book rides, self-drive cars, local rentals, return journeys and vehicle-with-driver services.",
    href: "/login/rider",
    button: "Continue as Rider",
    accent: "border-primary/30 hover:border-primary/50 bg-primary/5 hover:shadow-md",
  },
  {
    role: "owner" as const,
    icon: Car,
    title: "Vehicle Owner Login",
    description: "List your vehicle, manage bookings, track earnings and grow your monthly income.",
    href: "/login/owner",
    button: "Continue as Vehicle Owner",
    accent: "border-secondary/30 hover:border-secondary/50 bg-secondary/5 hover:shadow-md",
    highlight: true,
  },
];

const SIGNUP_OPTIONS = [
  {
    role: "rider" as const,
    icon: User,
    title: "Join as Rider",
    description: "Search and book vehicles across India.",
    benefits: ["Easy Booking", "Return Journey Deals", "Secure Payments"],
    href: "/signup/rider",
    button: "Create Rider Account",
    accent: "border-primary/30 hover:border-primary/50 bg-primary/5 hover:shadow-md",
  },
  {
    role: "owner" as const,
    icon: Car,
    title: "Join as Vehicle Owner",
    description: "Turn your vehicle into monthly income.",
    benefits: ["List Vehicle", "Receive Bookings", "Track Earnings"],
    href: "/signup/owner",
    button: "Register as Vehicle Owner",
    accent: "border-secondary/30 hover:border-secondary/50 bg-secondary/5 hover:shadow-md",
    highlight: true,
  },
];

export default function AuthRolePicker({ mode, compact = false }: Props) {
  const isLogin = mode === "login";
  const title = isLogin ? "Welcome to Rydez India" : "Join Rydez India";
  const subtitle = isLogin ? "Choose how you want to continue" : "Choose your account type";
  const options = isLogin ? LOGIN_OPTIONS : SIGNUP_OPTIONS;

  return (
    <div
      className={
        compact
          ? "px-6 py-8 sm:px-10 sm:py-10 md:px-12 md:py-12"
          : "mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-16"
      }
    >
      <div className="text-center mb-10 md:mb-12">
        <h1
          id="auth-role-modal-title"
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-secondary tracking-tight"
        >
          {title}
        </h1>
        <p className="text-gray-600 mt-3 text-base md:text-lg max-w-xl mx-auto">{subtitle}</p>
      </div>

      <div className="grid gap-6 sm:gap-8 md:grid-cols-2 max-w-4xl mx-auto">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <article
              key={option.role}
              className={`relative flex flex-col rounded-3xl border-2 p-8 md:p-10 min-h-[320px] md:min-h-[360px] shadow-sm transition-all ${option.accent}`}
            >
              {"highlight" in option && option.highlight && (
                <div className="mb-5 rounded-xl bg-accent/15 border border-accent/25 px-4 py-3 text-sm font-medium text-secondary">
                  <span className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-accent shrink-0" />
                    Earn up to ₹50,000/month — turn your idle vehicle into income
                  </span>
                </div>
              )}

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md mb-6">
                <Icon className="h-8 w-8 text-primary" />
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-secondary mb-3">{option.title}</h2>
              <p className="text-base text-gray-600 flex-1 mb-6 leading-relaxed">{option.description}</p>

              {"benefits" in option && Array.isArray(option.benefits) && (
                <ul className="mb-6 space-y-2.5 text-sm md:text-base text-gray-600">
                  {option.benefits.map((b: string) => (
                    <li key={b} className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              <Button href={option.href} variant="primary" size="lg" className="w-full mt-auto">
                {option.button}
              </Button>

              {"highlight" in option && option.highlight && !isLogin && (
                <Link
                  href="/signup/owner"
                  className="mt-4 text-center text-sm font-semibold text-primary hover:underline"
                >
                  Register Vehicle &amp; Start Earning →
                </Link>
              )}
            </article>
          );
        })}
      </div>

      {isLogin && (
        <p className="mt-10 md:mt-12 text-center text-sm md:text-base text-gray-500">
          New to Rydez?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      )}

      {!isLogin && (
        <p className="mt-10 md:mt-12 text-center text-sm md:text-base text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
