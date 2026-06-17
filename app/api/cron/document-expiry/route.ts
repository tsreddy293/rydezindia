import { NextRequest, NextResponse } from "next/server";
import { checkDocumentExpiries } from "@/lib/services/document-expiry";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkDocumentExpiries();
  return NextResponse.json({ success: true, ...result });
}
