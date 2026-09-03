import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Region = {
  slug: string;
  name: string;
  capital: string;
  population: number;
  area_km2: number;
  terrain: string;
};

export type RegionRisk = {
  region_slug: string;
  flood_level: string;
  landslide_level: string;
  rainfall_mm_7d: number;
  soil_saturation_pct: number;
  river_level_m: number;
  forecast_summary: string;
  updated_at: string;
};

export type Alert = {
  id: string;
  region_slug: string;
  hazard: string;
  severity: string;
  title: string;
  body: string;
  issued_at: string;
  expires_at: string | null;
  is_active: boolean;
};

export type Reading = {
  region_slug: string;
  recorded_on: string;
  rainfall_mm: number;
  soil_saturation_pct: number;
  river_level_m: number;
};

export type DisasterEvent = {
  id: string;
  region_slug: string;
  occurred_on: string;
  hazard: string;
  severity: string;
  description: string;
  people_affected: number;
};

export type CommunityReport = {
  id: string;
  region_slug: string;
  locality: string | null;
  hazard: string;
  severity: string;
  description: string;
  reporter_name: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
};

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T;
}

export const regionsQuery = queryOptions({
  queryKey: ["regions"],
  queryFn: async () => unwrap<Region[]>(await supabase.from("regions").select("*").order("name")),
  staleTime: 5 * 60 * 1000,
});

export const riskQuery = queryOptions({
  queryKey: ["region_risk"],
  queryFn: async () => unwrap<RegionRisk[]>(await supabase.from("region_risk").select("*")),
  staleTime: 60 * 1000,
});

export const alertsQuery = queryOptions({
  queryKey: ["alerts"],
  queryFn: async () =>
    unwrap<Alert[]>(
      await supabase
        .from("alerts")
        .select("*")
        .eq("is_active", true)
        .order("issued_at", { ascending: false }),
    ),
  staleTime: 60 * 1000,
});

export const readingsQuery = queryOptions({
  queryKey: ["environmental_readings"],
  queryFn: async () =>
    unwrap<Reading[]>(
      await supabase
        .from("environmental_readings")
        .select("*")
        .order("recorded_on", { ascending: true }),
    ),
  staleTime: 5 * 60 * 1000,
});

export const eventsQuery = queryOptions({
  queryKey: ["disaster_events"],
  queryFn: async () =>
    unwrap<DisasterEvent[]>(
      await supabase.from("disaster_events").select("*").order("occurred_on", { ascending: false }),
    ),
  staleTime: 5 * 60 * 1000,
});

export const reportsQuery = queryOptions({
  queryKey: ["community_reports"],
  queryFn: async () =>
    unwrap<CommunityReport[]>(
      await supabase
        .from("community_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ),
  staleTime: 30 * 1000,
});

export type NewReport = {
  region_slug: string;
  locality: string | null;
  hazard: string;
  severity: string;
  description: string;
  reporter_name: string | null;
  photo_url: string | null;
};

export async function submitReport(input: NewReport) {
  const { error } = await supabase.from("community_reports").insert(input);
  if (error) throw new Error(error.message);
}

export type Locality = {
  id: string;
  region_slug: string;
  slug: string;
  name: string;
  kind: string;
  population: number;
  terrain_note: string;
};

export type LocalityForecast = {
  locality_id: string;
  flood_level: string;
  landslide_level: string;
  lead_hazard: string;
  onset_start: string;
  onset_end: string;
  peak_at: string | null;
  confidence_pct: number;
  rainfall_mm_24h: number;
  soil_saturation_pct: number;
  summary: string;
  updated_at: string;
};

export type SmsSubscription = {
  id: string;
  user_id: string;
  phone: string;
  region_slug: string | null;
  locality_id: string | null;
  min_severity: string;
  frequency: string;
  is_active: boolean;
  created_at: string;
};

export type SmsMessage = {
  id: string;
  user_id: string | null;
  phone: string;
  body: string;
  kind: string;
  status: string;
  provider: string;
  locality_id: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  region_slug: string | null;
  locality_id: string | null;
};

export const localitiesQuery = queryOptions({
  queryKey: ["localities"],
  queryFn: async () =>
    unwrap<Locality[]>(await supabase.from("localities").select("*").order("name")),
  staleTime: 5 * 60 * 1000,
});

export const localityForecastsQuery = queryOptions({
  queryKey: ["locality_forecasts"],
  queryFn: async () =>
    unwrap<LocalityForecast[]>(await supabase.from("locality_forecasts").select("*")),
  staleTime: 60 * 1000,
});

export const subscriptionsQuery = queryOptions({
  queryKey: ["sms_subscriptions"],
  queryFn: async () =>
    unwrap<SmsSubscription[]>(
      await supabase.from("sms_subscriptions").select("*").order("created_at"),
    ),
  staleTime: 30 * 1000,
});

export const smsMessagesQuery = queryOptions({
  queryKey: ["sms_messages"],
  queryFn: async () =>
    unwrap<SmsMessage[]>(
      await supabase
        .from("sms_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ),
  staleTime: 15 * 1000,
});

export function profileQuery(userId: string) {
  return queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as Profile | null;
    },
  });
}

export function rolesQuery(userId: string) {
  return queryOptions({
    queryKey: ["roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => row.role as string);
    },
  });
}
