import { queryOptions } from "@tanstack/react-query";
import { mysqlApi, mysqlSession } from "@/lib/mysql-api";

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

export const regionsQuery = queryOptions({
  queryKey: ["regions"],
  queryFn: () => mysqlApi.get<Region[]>("regions"),
  staleTime: 5 * 60 * 1000,
});

export const riskQuery = queryOptions({
  queryKey: ["region_risk"],
  queryFn: () => mysqlApi.get<RegionRisk[]>("risk"),
  staleTime: 60 * 1000,
});

export const alertsQuery = queryOptions({
  queryKey: ["alerts"],
  queryFn: () => mysqlApi.get<Alert[]>("alerts"),
  staleTime: 60 * 1000,
});

export const readingsQuery = queryOptions({
  queryKey: ["environmental_readings"],
  queryFn: () => mysqlApi.get<Reading[]>("readings"),
  staleTime: 5 * 60 * 1000,
});

export const eventsQuery = queryOptions({
  queryKey: ["disaster_events"],
  queryFn: () => mysqlApi.get<DisasterEvent[]>("events"),
  staleTime: 5 * 60 * 1000,
});

export const reportsQuery = queryOptions({
  queryKey: ["community_reports"],
  queryFn: () => mysqlApi.get<CommunityReport[]>("reports"),
  staleTime: 30 * 1000,
});

export type NewReport = {
  region_slug: string;
  locality_id: string | null;
  locality: string | null;
  hazard: string;
  severity: string;
  description: string;
  reporter_name: string | null;
  photo_url: string | null;
};

export async function submitReport(input: NewReport) {
  await mysqlApi.post("reports", input);
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
  queryFn: () => mysqlApi.get<Locality[]>("localities"),
  staleTime: 5 * 60 * 1000,
});

export const localityForecastsQuery = queryOptions({
  queryKey: ["locality_forecasts"],
  queryFn: () => mysqlApi.get<LocalityForecast[]>("forecasts"),
  staleTime: 60 * 1000,
});

export const subscriptionsQuery = queryOptions({
  queryKey: ["sms_subscriptions"],
  queryFn: () => mysqlApi.get<SmsSubscription[]>("subscriptions"),
  staleTime: 30 * 1000,
});

export const smsMessagesQuery = queryOptions({
  queryKey: ["sms_messages"],
  queryFn: () => mysqlApi.get<SmsMessage[]>("messages"),
  staleTime: 15 * 1000,
});

export function profileQuery(userId: string) {
  return queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () => (await mysqlSession()) as Profile | null,
  });
}

export function rolesQuery(userId: string) {
  return queryOptions({
    queryKey: ["roles", userId],
    queryFn: async () => {
      const user = await mysqlSession();
      return user ? [user.role] : [];
    },
  });
}
