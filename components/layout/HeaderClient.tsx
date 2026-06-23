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

function getAccountLink(
  role: HeaderRole,
  userId: string | null
): { href: string; label: string } | null {
  if (role === "admin") return { href: ADMIN_HOME_PATH, label: "Admin Dashboard" };
  if (role === "owner") return { href: OWNER_DASHBOARD_PATH, label: "Owner Dashboard" };
  if (userId) return { href: "/dashboard", label: "My Dashboard" };
  return null;
}

const NAV_LINK_CLASS =
  "text-sm font-medium text-gray-700 transition-colors hover:text-primary";

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
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const isMobile = useIsMobile();
  const mountedRef = useRef(false);
  const accountLink = getAccountLink(role, userId);
  const isAuthenticated = authChecked && userId !== null;
  const showGuestActions = !isAuthenticated;

  useEffect(() => {
    mountedRef.current = true;
    const supabase = createClient();

    function safeSetRole(nextRole: HeaderRole) {
      if (mountedRef.current) setRole(nextRole);
    }

    function safeSetUserId(nextUserId: string | null) {
      if (mountedRef.current) setUserId(nextUserId);
    }

    function safeSetAuthChecked(checked: boolean) {
      if (mountedRef.current) setAuthChecked(checked);
    }

    async function loadRole() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        if (error || !data.session?.user) {
          safeSetUserId(null);
          safeSetRole(null);
          safeSetAuthChecked(true);
          return;
        }

        const user = data.session.user;
        safeSetUserId(user.id);

        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const dbRole = normalizeRole((profile as { role?: unknown } | null)?.role);
        const metadataRole = normalizeRole(user.user_metadata?.role);

        // Admin/owner links require DB role — never trust metadata alone.
        let nextRole: HeaderRole = null;
        if (dbRole === "admin" || dbRole === "owner") {
          nextRole = dbRole;
        } else if (dbRole === "rider") {
          nextRole = "rider";
        } else if (metadataRole === "rider") {
          nextRole = "rider";
        }

        safeSetRole(nextRole);
      } catch {
        if (mountedRef.current) {
          safeSetUserId(null);
          safeSetRole(null);
        }
      } finally {
        safeSetAuthChecked(true);
      }
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
              <Link key={link.href} href={link.href} className={NAV_LINK_CLASS}>
                {link.label}
              </Link>
            ))}
            {showGuestActions ? (
              <>
                <button type="button" onClick={() => openAuth("login")} className={NAV_LINK_CLASS}>
                  Login
                </button>
                <button type="button" onClick={() => openAuth("signup")} className={NAV_LINK_CLASS}>
                  Sign Up
                </button>
              </>
            ) : null}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {isAuthenticated && accountLink ? (
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
            ) : null}
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
              {showGuestActions ? (
                <>
                  <Link
                    href="/login"
                    className="text-base font-medium text-gray-700"
                    onClick={() => setOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="text-base font-medium text-gray-700"
                    onClick={() => setOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              ) : null}
              {isAuthenticated && accountLink ? (
                <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4">
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
                </div>
              ) : null}
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
