import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

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
  const role = data.user?.user_metadata?.role;

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    return NextResponse.redirect(url);
  };

  if (path.startsWith("/admin") && path !== "/admin/login" && (!data.user || (role && role !== "admin"))) {
    return redirectTo("/admin/login");
  }

  const ownerOnly =
    path.startsWith("/owner/dashboard") ||
    path.startsWith("/owner/kyc") ||
    path.startsWith("/vehicles/add") ||
    path.startsWith("/vehicles/self-drive") ||
    path.startsWith("/vehicles/driver");
  if (ownerOnly && (!data.user || (role && role !== "owner"))) {
    return redirectTo("/owner/login");
  }

  if (path.startsWith("/user/dashboard") && !data.user) {
    return redirectTo("/login");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
