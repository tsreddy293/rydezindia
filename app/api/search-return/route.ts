import { NextResponse } from "next/server";
import { searchReturnJourneys } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { data, error } = await searchReturnJourneys({
    fromCity: searchParams.get("fromCity") || searchParams.get("pickupCity") || searchParams.get("pickup") || undefined,
    toCity: searchParams.get("toCity") || searchParams.get("dropCity") || searchParams.get("drop") || undefined,
    date: searchParams.get("date") || undefined,
    vehicleType: searchParams.get("vehicleType") || undefined,
  });

  return NextResponse.json({ data, error }, { status: error ? 500 : 200 });
}
