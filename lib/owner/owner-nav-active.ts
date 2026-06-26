import type { OwnerNavItem } from "@/lib/owner/owner-nav";

export type OwnerNavItemId = OwnerNavItem["id"];

/**
 * Exactly one sidebar item should be active for a given route.
 */
export function isOwnerNavItemActive(
  pathname: string,
  searchParams: URLSearchParams | null,
  item: OwnerNavItem
): boolean {
  const hasActionCenterQuery =
    searchParams?.has("action-center") === true ||
    searchParams?.get("section") === "action-center";

  const isActionCenterRoute =
    pathname === "/owner/action-center" || pathname.startsWith("/owner/action-center/");

  const isDashboardRoute =
    pathname === "/owner/dashboard" || pathname.startsWith("/owner/dashboard/");

  if (item.id === "dashboard") {
    return isDashboardRoute && !hasActionCenterQuery && !isActionCenterRoute;
  }

  if (item.id === "action-center") {
    return isActionCenterRoute || (pathname === "/owner/dashboard" && hasActionCenterQuery);
  }

  if (item.matchPrefixes?.length) {
    return item.matchPrefixes.some((prefix) => pathname.startsWith(prefix));
  }

  if (item.matchPrefix) {
    return pathname.startsWith(item.matchPrefix);
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
