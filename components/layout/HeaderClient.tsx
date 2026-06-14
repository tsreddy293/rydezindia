"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, Menu, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { signOutUser } from "@/server/actions/auth";

export type HeaderRole = "user" | "owner" | "admin" | null;

const PUBLIC_NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/contact", label: "Contact" },
];

const AUTH_NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/contact", label: "Contact" },
];

function normalizeRole(value: unknown): HeaderRole {
  return value === "user" || value === "owner" || value === "admin" ? value : null;
}

function getAccountLink(role: HeaderRole) {
  if (role === "owner") return { href: "/owner/dashboard", label: "Owner Dashboard" };
  if (role === "admin") return { href: "/admin", label: "Admin Dashboard" };
  return { href: "/user/dashboard", label: "My Account" };
}

export default function HeaderClient() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<HeaderRole>(null);
  const navLinks = role ? AUTH_NAV_LINKS : PUBLIC_NAV_LINKS;
  const accountLink = getAccountLink(role);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadRole() {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;

      if (error || !data.user) {
        setRole(null);
        return;
      }

      let nextRole = normalizeRole(data.user.user_metadata?.role);

      if (!nextRole) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        nextRole = normalizeRole((profile as { role?: unknown } | null)?.role);
      }

      setRole(nextRole ?? "user");
    }

    loadRole();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadRole();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 group" onClick={() => setOpen(false)}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white transition-transform group-hover:scale-105">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-secondary">Rydez</span>
            <span className="text-xl font-bold text-primary"> India</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-700 transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {role ? (
            <>
              <Button href={accountLink.href} variant="outline" size="sm">
                {accountLink.label}
              </Button>
              <form action={signOutUser}>
                <button type="submit" className="rounded-xl px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-100">
                  Logout
                </button>
              </form>
            </>
          ) : (
            <>
              <Button href="/login" variant="ghost" size="sm">
                Login
              </Button>
              <Button href="/user/register" variant="primary" size="sm">
                Sign Up
              </Button>
            </>
          )}
        </div>

        <button
          className="lg:hidden p-2 text-secondary"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-6">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base font-medium text-gray-700"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-4 flex flex-col gap-3">
              {role ? (
                <>
                  <Button href={accountLink.href} variant="outline" size="sm" onClick={() => setOpen(false)}>
                    {accountLink.label}
                  </Button>
                  <form action={signOutUser}>
                    <button type="submit" className="w-full rounded-xl px-4 py-2 text-left text-sm font-medium text-secondary hover:bg-gray-100">
                      Logout
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Button href="/login" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Login
                  </Button>
                  <Button href="/user/register" variant="primary" size="sm" onClick={() => setOpen(false)}>
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
