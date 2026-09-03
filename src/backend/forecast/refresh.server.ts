import { deriveForecast, type LocalityInput } from "./model.server";
import { fetchFlood, fetchWeather } from "../providers/open-meteo.server";

export type RefreshResult = {
  updated: number;
  failed: { locality: string; reason: string }[];
  ranAt: string;
};

/**
 * Fetches Open-Meteo weather + flood data for every locality that has coordinates,
 * runs the derived hazard model and persists the normalized rows into locality_forecasts.
 */
export async function refreshForecasts(regionSlug?: string): Promise<RefreshResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let query = supabaseAdmin
    .from("localities")
    .select("id, name, region_slug, terrain_note, elevation_m, slope_index, latitude, longitude")
    .not("latitude", "is", null)
    .not("longitude", "is", null);
  if (regionSlug) query = query.eq("region_slug", regionSlug);

  const { data: localities, error } = await query;
  if (error) throw new Error(`Could not load localities: ${error.message}`);

  const failed: RefreshResult["failed"] = [];
  const rows = [];

  for (const row of localities ?? []) {
    const lat = row.latitude as number | null;
    const lon = row.longitude as number | null;
    if (lat === null || lon === null) continue;
    try {
      const [weather, flood] = await Promise.all([fetchWeather(lat, lon), fetchFlood(lat, lon)]);
      const locality: LocalityInput = {
        id: row.id,
        name: row.name,
        region_slug: row.region_slug,
        terrain_note: row.terrain_note,
        elevation_m: row.elevation_m ?? 0,
        slope_index: Number(row.slope_index ?? 0.3),
      };
      rows.push({ ...deriveForecast(locality, weather, flood), updated_at: new Date().toISOString() });
    } catch (cause) {
      failed.push({ locality: row.name, reason: cause instanceof Error ? cause.message : "unknown" });
    }
  }

  if (rows.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from("locality_forecasts")
      .upsert(rows, { onConflict: "locality_id" });
    if (upsertError) throw new Error(`Could not save forecasts: ${upsertError.message}`);
  }

  return { updated: rows.length, failed, ranAt: new Date().toISOString() };
}
