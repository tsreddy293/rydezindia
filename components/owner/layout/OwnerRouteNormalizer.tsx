"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Legacy hash/query links → dedicated owner routes */
export default function OwnerRouteNormalizer() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/owner/dashboard") return;
    const hash = window.location.hash;
    if (hash === "#action-center") {
      router.replace("/owner/action-center");
    }
  }, [pathname, router]);

  return null;
}
