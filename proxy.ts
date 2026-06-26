import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { resolveAuthenticatedUserRole } from "@/lib/auth/get-role-for-user";
import { normalizeRole } from "@/lib/auth/roles";
import {
  ADMIN_LOGIN_PATH,
  CUSTOMER_HOME_PATH,
  isAdminLoginPath,
  isProtectedAdminPath,
  OWNER_DASHBOARD_PATH,
  redirectPathForWrongAdminAccess,
  homePathForRole,
} from "@/lib/auth/rbac-paths";
import type { UserRole } from "@/types/database";

async function resolveRoleSafe(
  userId: string,
  metadataRole: unknown
): Promise<UserRole> {
  try {
    return await resolveAuthenticatedUserRole(userId, metadataRole);
  } catch {
    return normalizeRole(metadataRole) ?? "rider";
  }
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const role = data.user
    ? await resolveRoleSafe(data.user.id, data.user.user_metadata?.role)
    : null;

  /** Always strip query string on security redirects (blocks /admin?type=self_drive bypass). */
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    return NextResponse.redirect(url);
  };

  const redirectToLoginWithReturnTo = (returnPath: string) => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `returnTo=${encodeURIComponent(returnPath)}`;
    return NextResponse.redirect(url);
  };

  // --- Admin login: always show login unless an authenticated admin session exists ---
  if (isAdminLoginPath(path)) {
    if (path === "/login/admin" || path === "/admin/login") {
      const url = request.nextUrl.clone();
      url.pathname = ADMIN_LOGIN_PATH;
      return NextResponse.redirect(url);
    }
    if (data.user && role === "admin") {
      return redirectTo("/admin");
    }
    return response;
  }

  // --- Admin routes: role=admin only; query strings never grant access ---
  if (isProtectedAdminPath(path)) {
    if (!data.user) {
      return redirectTo(ADMIN_LOGIN_PATH);
    }
    if (role !== "admin") {
      return redirectTo(redirectPathForWrongAdminAccess(role));
    }
  }

  // --- Owner routes ---
  const ownerPublic =
    path === "/login/owner" ||
    path === "/signup/owner" ||
    path === "/owner/login" ||
    path === "/owner/register" ||
    path === OWNER_DASHBOARD_PATH;

  const ownerOnly =
    path.startsWith("/owner/dashboard") ||
    path.startsWith("/owner/action-center") ||
    path.startsWith("/owner/return-journeys") ||
    path.startsWith("/owner/kyc") ||
    path.startsWith("/owner/vehicles") ||
    path.startsWith("/owner/my-vehicles") ||
    path.startsWith("/owner/add-vehicle") ||
    path.startsWith("/owner/edit-vehicle") ||
    path.startsWith("/owner/bookings") ||
    path.startsWith("/owner/earnings") ||
    path.startsWith("/owner/profile") ||
    path.startsWith("/vehicles/add") ||
    path.startsWith("/vehicles/self-drive") ||
    path.startsWith("/vehicles/driver");

  if (ownerOnly && (!data.user || role !== "owner")) {
    return redirectTo("/login/owner");
  }

  if (ownerOnly && data.user && role === "rider") {
    return redirectTo(CUSTOMER_HOME_PATH);
  }

  if (ownerOnly && data.user && role === "admin") {
    return redirectTo("/admin");
  }

  // --- Rider dashboard routes ---
  const riderOnly =
    path.startsWith("/dashboard") ||
    path.startsWith("/user/dashboard") ||
    path.startsWith("/user/bookings") ||
    path.startsWith("/user/trips") ||
    path.startsWith("/user/saved") ||
    path.startsWith("/user/profile") ||
    path.startsWith("/user/wallet") ||
    path.startsWith("/user/referrals") ||
    path.startsWith("/user/dashboard/verification");

  if (riderOnly && !data.user) {
    const returnPath = `${path}${request.nextUrl.search}`;
    const url = request.nextUrl.clone();
    url.pathname = "/login/rider";
    url.search = `redirect=${encodeURIComponent(returnPath)}`;
    return NextResponse.redirect(url);
  }

  if (riderOnly && data.user && role !== "rider") {
    return redirectTo(homePathForRole(role));
  }

  // --- Booking routes — authenticated only (KYC checked on server) ---
  const bookingDetailMatch = path.match(/^\/booking\/([^/]+)$/);
  const bookingConfirmationMatch = path.match(/^\/booking\/confirmation\/([^/]+)$/);

  if ((bookingDetailMatch || bookingConfirmationMatch) && !data.user) {
    const returnPath = `${path}${request.nextUrl.search}`;
    return redirectToLoginWithReturnTo(returnPath);
  }

  // Legacy login redirects (never point customer/owner flows to /admin)
  if (path === "/owner/login") return redirectTo("/login/owner");
  if (path === "/user/login") return redirectTo("/login/rider");
  if (path === "/user/register") return redirectTo("/signup/rider");
  if (path === "/owner/register") return redirectTo("/signup/owner");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
