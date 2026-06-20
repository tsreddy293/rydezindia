import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { resolveAuthenticatedUserRole } from "@/lib/auth/get-role-for-user";

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
    ? await resolveAuthenticatedUserRole(data.user.id, data.user.user_metadata?.role)
    : null;

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    return NextResponse.redirect(url);
  };

  const authSelectionPaths = ["/login", "/signup"];
  const isAuthSelection = authSelectionPaths.includes(path);

  // --- Admin routes ---
  const adminPublic = path === "/login/admin" || path === "/admin/login";
  if (path.startsWith("/admin") && !adminPublic) {
    if (!data.user || role !== "admin") {
      return redirectTo("/login/admin");
    }
  }

  // --- Owner routes ---
  const ownerPublic =
    path === "/login/owner" ||
    path === "/signup/owner" ||
    path === "/owner/login" ||
    path === "/owner/register";
  const ownerOnly =
    path.startsWith("/owner/dashboard") ||
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

  // --- Rider routes ---
  const riderPublic =
    path === "/login/rider" ||
    path === "/signup/rider" ||
    path === "/user/login" ||
    path === "/user/register";
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

  if (riderOnly && data.user && role === "owner") {
    return redirectTo("/owner/dashboard");
  }

  if (riderOnly && data.user && role === "admin") {
    return redirectTo("/admin");
  }

  if (ownerOnly && data.user && role === "rider") {
    return redirectTo("/dashboard");
  }

  if (path.startsWith("/admin") && !adminPublic && data.user && role === "rider") {
    return redirectTo("/dashboard");
  }

  if (path.startsWith("/admin") && !adminPublic && data.user && role === "owner") {
    return redirectTo("/owner/dashboard");
  }

  // Legacy login redirects
  if (path === "/admin/login") return redirectTo("/login/admin");
  if (path === "/owner/login") return redirectTo("/login/owner");
  if (path === "/user/login") return redirectTo("/login/rider");
  if (path === "/user/register") return redirectTo("/signup/rider");
  if (path === "/owner/register") return redirectTo("/signup/owner");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
