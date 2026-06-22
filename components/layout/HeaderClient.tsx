"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import Button from "@/components/ui/Button";
import AuthRoleModal from "@/components/auth/AuthRoleModal";
import { createClient } from "@/lib/supabase/client";
import { normalizeRole } from "@/lib/auth/roles";
import { OWNER_DASHBOARD_PATH, ADMIN_HOME_PATH } from "@/lib/auth/rbac-paths";
import { signOutUser } from "@/server/actions/auth";
import type { UserRole } from "@/types/database";

export type HeaderRole = UserRole | null;

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About" },
  { href: "/contact", label: "Contact" },
];

function getAccountLink(role: HeaderRole) {
  if (role === "owner") return { href: OWNER_DASHBOARD_PATH, label: "Owner Dashboard" };
  if (role === "admin") return { href: ADMIN_HOME_PATH, label: "Admin Dashboard" };
  return { href: "/dashboard", label: "My Dashboard" };
}

function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

export default function HeaderClient() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<HeaderRole>(null);
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const isMobile = useIsMobile();
  const mountedRef = useRef(false);
  const accountLink = getAccountLink(role);

  useEffect(() => {
    mountedRef.current = true;
    const supabase = createClient();

    function safeSetRole(nextRole: HeaderRole) {
      if (mountedRef.current) setRole(nextRole);
    }

    async function loadRole() {
      const { data, error } = await supabase.auth.getUser();
      if (!mountedRef.current) return;
      if (error || !data.user) {
        safeSetRole(null);
        return;
      }
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      const nextRole =
        normalizeRole((profile as { role?: unknown } | null)?.role) ??
        normalizeRole(data.user.user_metadata?.role) ??
        "rider";
      safeSetRole(nextRole);
    }

    loadRole();
    const { data: listener } = supabase.auth.onAuthStateChange(() => loadRole());
    return () => {
      mountedRef.current = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  function openAuth(mode: "login" | "signup") {
    setOpen(false);
    if (isMobile) {
      window.location.href = mode === "login" ? "/login" : "/signup";
      return;
    }
    setAuthModal(mode);
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 min-h-20 glass border-b border-gray-200/50">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
            <Image
              src="/images/logo copy 2.png"
              alt="Rydez India"
              width={240}
              height={60}
              priority
              unoptimized
              className="navbar-logo-image"
            />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
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
                  <button
                    type="submit"
                    className="rounded-xl px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={() => openAuth("login")}>
                  Login
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={() => openAuth("signup")}>
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
              {NAV_LINKS.map((link) => (
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
                      <button
                        type="submit"
                        className="w-full rounded-xl px-4 py-2 text-left text-sm font-medium text-secondary hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Button href="/login" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                      Login
                    </Button>
                    <Button href="/signup" variant="primary" size="sm" onClick={() => setOpen(false)}>
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {authModal && (
        <AuthRoleModal open={!!authModal} mode={authModal} onClose={() => setAuthModal(null)} />
      )}
    </>
  );
}
