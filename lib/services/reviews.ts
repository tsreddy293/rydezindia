import { createAdminClient } from "@/lib/supabase/admin";

export interface ReviewInput {
  bookingId?: string;
  userId: string;
  vehicleId?: string;
  ownerId?: string;
  driverId?: string;
  ratingOverall: number;
  ratingSafety?: number;
  ratingCleanliness?: number;
  ratingComfort?: number;
  ratingDriver?: number;
  comment?: string;
}

export async function submitReview(input: ReviewInput) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("reviews")
    .insert({
      booking_id: input.bookingId ?? null,
      user_id: input.userId,
      vehicle_id: input.vehicleId ?? null,
      owner_id: input.ownerId ?? null,
      driver_id: input.driverId ?? null,
      rating_overall: input.ratingOverall,
      rating_safety: input.ratingSafety ?? input.ratingOverall,
      rating_cleanliness: input.ratingCleanliness ?? input.ratingOverall,
      rating_comfort: input.ratingComfort ?? input.ratingOverall,
      rating_driver: input.ratingDriver ?? input.ratingOverall,
      comment: input.comment ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (input.vehicleId) {
    await updateEntityRating("vehicles", input.vehicleId);
  }

  return data.id as string;
}

async function updateEntityRating(table: string, entityId: string) {
  const db = createAdminClient();
  const column = table === "vehicles" ? "vehicle_id" : "owner_id";
  const { data: reviews } = await db
    .from("reviews")
    .select("rating_overall")
    .eq(column, entityId);

  if (!reviews?.length) return;
  const avg =
    reviews.reduce((sum, r) => sum + Number((r as { rating_overall: number }).rating_overall), 0) /
    reviews.length;

  await db.from(table).update({ rating: Math.round(avg * 100) / 100 }).eq("id", entityId);
}

export async function getReviewsForVehicle(vehicleId: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("reviews")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
  if (error) return { reviews: [], average: 0, total: 0 };

  const reviews = data ?? [];
  const average =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + Number((r as { rating_overall: number }).rating_overall), 0) /
        reviews.length
      : 0;

  return { reviews, average: Math.round(average * 10) / 10, total: reviews.length };
}

export async function getReviewSummary(entityType: "vehicle" | "owner", entityId: string) {
  const db = createAdminClient();
  const column = entityType === "vehicle" ? "vehicle_id" : "owner_id";
  const { data } = await db.from("reviews").select("*").eq(column, entityId);
  const reviews = data ?? [];
  if (reviews.length === 0) return null;

  const avg = (key: string) => {
    const vals = reviews.map((r) => Number((r as Record<string, unknown>)[key])).filter(Boolean);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
  };

  return {
    total: reviews.length,
    overall: avg("rating_overall"),
    safety: avg("rating_safety"),
    cleanliness: avg("rating_cleanliness"),
    comfort: avg("rating_comfort"),
    driver: avg("rating_driver"),
  };
}
