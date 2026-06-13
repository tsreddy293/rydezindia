import { NextResponse } from "next/server";
import { searchSelfDriveVehicles } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { data, error } = await searchSelfDriveVehicles({
    city: searchParams.get("city") || undefined,
    pickupCity: searchParams.get("pickupCity") || searchParams.get("pickup") || undefined,
    dropCity: searchParams.get("dropCity") || searchParams.get("drop") || undefined,
    date: searchParams.get("date") || undefined,
    vehicleType: searchParams.get("vehicleType") || undefined,
  });

  return NextResponse.json({ data, error }, { status: error ? 500 : 200 });
}
