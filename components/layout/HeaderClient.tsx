"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  { href: "/", label: "Home", match: (path: string) => path === "/" },
  { href: "/#how-it-works", label: "How It Works", match: (path: string) => path === "/" },
  { href: "/about-us", label: "About", match: (path: string) => path.startsWith("/about") },
  { href: "/contact", label: "Contact", match: (path: string) => path.startsWith("/contact") },
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

const LOGIN_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border-2 border-[#2563eb] px-[22px] py-[10px] text-sm font-semibold text-[#2563eb] transition-all duration-300 hover:bg-[#2563eb] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/30";

const SIGNUP_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#00C6FF,#0072FF)] px-6 py-[10px] text-sm font-bold text-white shadow-[0_10px_25px_rgba(37,99,235,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(37,99,235,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/40 active:translate-y-0";

function useIsMobile(breakpoint = 768) {
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

function NavLink({
  href,
  label,
  active,
  onNavigate,
  compact = false,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group relative font-semibold text-[#334155] transition-colors duration-300 hover:text-[#2563eb] ${
        compact ? "text-[15px] lg:text-base" : "text-base"
      } ${active ? "text-[#2563eb]" : ""}`}
    >
      {label}
      <span
        className={`absolute -bottom-1 left-0 h-0.5 rounded-full bg-[#2563eb] transition-all duration-300 ease-out ${
          active ? "w-full" : "w-0 group-hover:w-full"
        }`}
        aria-hidden
      />
    </Link>
  );
}

export default function HeaderClient() {
  const pathname = usePathname();
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

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function openAuth(mode: "login" | "signup") {
    setOpen(false);
    if (isMobile) {
      window.location.href = mode === "login" ? "/login" : "/signup";
      return;
    }
    setAuthModal(mode);
  }

  function closeMobile() {
    setOpen(false);
  }

  const authButtons = showGuestActions ? (
    <>
      <button type="button" onClick={() => openAuth("login")} className={LOGIN_BTN}>
        <span aria-hidden>🔐</span>
        Login
      </button>
      <Link href="/signup/owner" className={SIGNUP_BTN}>
        Register Vehicle
      </Link>
    </>
  ) : accountLink ? (
    <>
      <Button href={accountLink.href} variant="outline" size="sm">
        {accountLink.label}
      </Button>
      <form action={signOutUser}>
        <button
          type="submit"
          className="rounded-[10px] px-4 py-2 text-sm font-semibold text-[#334155] transition-colors duration-300 hover:bg-gray-50 hover:text-[#2563eb]"
        >
          Logout
        </button>
      </form>
    </>
  ) : null;

  return (
    <>
      <header className="sticky top-0 z-50 h-20 border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center px-4 md:grid md:grid-cols-[auto_1fr_auto] md:gap-4 lg:gap-6 md:px-6">
          {/* LEFT — Logo */}
          <Link
            href="/"
            className="relative z-10 flex shrink-0 items-center"
            onClick={closeMobile}
          >
            <Image
              src="/images/logo copy 2.png"
              alt="Rydez India"
              width={240}
              height={60}
              priority
              unoptimized
              className="navbar-logo-image h-[48px] w-auto md:h-[56px] lg:h-[60px]"
            />
          </Link>

          {/* CENTER — Desktop & tablet navigation */}
          <nav
            className="hidden md:flex items-center justify-center gap-6 lg:gap-10"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={link.match(pathname)}
                compact
              />
            ))}
          </nav>

          {/* RIGHT — Auth (desktop & tablet) */}
          <div className="hidden md:flex items-center justify-end gap-3 shrink-0">
            {authButtons}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="relative z-10 ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-[#334155] transition-colors hover:bg-gray-50 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile drawer */}
        <div
          className={`md:hidden overflow-hidden border-t border-[#e5e7eb] bg-white transition-all duration-300 ease-out ${
            open ? "max-h-[85vh] opacity-100" : "max-h-0 opacity-0 border-t-transparent"
          }`}
        >
          <nav className="flex flex-col gap-1 px-4 py-5" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobile}
                className={`rounded-lg px-3 py-3 text-base font-semibold transition-colors duration-300 ${
                  link.match(pathname)
                    ? "bg-blue-50 text-[#2563eb]"
                    : "text-[#334155] hover:bg-gray-50 hover:text-[#2563eb]"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-4 flex flex-col gap-3 border-t border-[#e5e7eb] pt-5">
              {showGuestActions ? (
                <>
                  <button
                    type="button"
                    className={`${LOGIN_BTN} w-full py-3`}
                    onClick={() => openAuth("login")}
                  >
                    <span aria-hidden>🔐</span>
                    Login
                  </button>
                  <Link
                    href="/signup/owner"
                    className={`${SIGNUP_BTN} w-full py-3`}
                    onClick={closeMobile}
                  >
                    Register Vehicle
                  </Link>
                </>
              ) : accountLink ? (
                <>
                  <Button href={accountLink.href} variant="outline" size="sm" onClick={closeMobile}>
                    {accountLink.label}
                  </Button>
                  <form action={signOutUser}>
                    <button
                      type="submit"
                      className="w-full rounded-[10px] px-4 py-3 text-left text-sm font-semibold text-[#334155] hover:bg-gray-50"
                    >
                      Logout
                    </button>
                  </form>
                </>
              ) : null}
            </div>
          </nav>
        </div>
      </header>

      {authModal && (
        <AuthRoleModal open={!!authModal} mode={authModal} onClose={() => setAuthModal(null)} />
      )}
    </>
  );
}
