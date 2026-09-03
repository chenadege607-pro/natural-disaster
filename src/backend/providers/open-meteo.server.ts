import { openMeteo } from "../config.server";

export type WeatherSignal = {
  /** Hourly precipitation in mm, from now forward. */
  hourlyPrecip: { time: string; mm: number }[];
  /** Mean soil moisture 0-7cm over the next 24h (m3/m3). */
  soilMoisture: number;
  rain24h: number;
  rain72h: number;
};

export type FloodSignal = {
  /** Peak simulated river discharge (m3/s) in the next 7 days. */
  peakDischarge: number;
  /** Median discharge over the window, used as a baseline. */
  baselineDischarge: number;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Open-Meteo request failed (${res.status})`);
  return (await res.json()) as T;
}

/** Hourly rainfall + soil moisture for one locality (no API key required). */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherSignal> {
  const url =
    `${openMeteo.weatherUrl}?latitude=${lat}&longitude=${lon}` +
    `&hourly=precipitation,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm` +
    `&forecast_days=4&past_days=1&timezone=${encodeURIComponent(openMeteo.timezone)}`;

  const json = await getJson<{
    hourly?: {
      time?: string[];
      precipitation?: (number | null)[];
      soil_moisture_0_to_1cm?: (number | null)[];
      soil_moisture_1_to_3cm?: (number | null)[];
    };
  }>(url);

  const times = json.hourly?.time ?? [];
  const precip = json.hourly?.precipitation ?? [];
  const sm0 = json.hourly?.soil_moisture_0_to_1cm ?? [];
  const sm1 = json.hourly?.soil_moisture_1_to_3cm ?? [];

  const now = Date.now();
  const hourlyPrecip = times
    .map((time, i) => ({ time, mm: precip[i] ?? 0 }))
    .filter((row) => new Date(row.time).getTime() >= now - 3600_000);

  const rain24h = hourlyPrecip.slice(0, 24).reduce((sum, r) => sum + r.mm, 0);
  const rain72h = hourlyPrecip.slice(0, 72).reduce((sum, r) => sum + r.mm, 0);

  const moistureValues = times
    .map((_, i) => ((sm0[i] ?? 0) + (sm1[i] ?? 0)) / 2)
    .filter((v) => v > 0)
    .slice(0, 24);
  const soilMoisture =
    moistureValues.length > 0
      ? moistureValues.reduce((a, b) => a + b, 0) / moistureValues.length
      : 0.25;

  return { hourlyPrecip, soilMoisture, rain24h, rain72h };
}

/** GloFAS-based river discharge forecast for one locality. */
export async function fetchFlood(lat: number, lon: number): Promise<FloodSignal> {
  const url =
    `${openMeteo.floodUrl}?latitude=${lat}&longitude=${lon}` +
    `&daily=river_discharge&forecast_days=7&past_days=7`;

  const json = await getJson<{ daily?: { river_discharge?: (number | null)[] } }>(url);
  const series = (json.daily?.river_discharge ?? []).map((v) => v ?? 0);
  if (series.length === 0) return { peakDischarge: 0, baselineDischarge: 0 };

  const past = series.slice(0, 7);
  const future = series.slice(7);
  const sorted = [...past].sort((a, b) => a - b);
  return {
    peakDischarge: Math.max(...(future.length > 0 ? future : series)),
    baselineDischarge: sorted[Math.floor(sorted.length / 2)] ?? 0,
  };
}
