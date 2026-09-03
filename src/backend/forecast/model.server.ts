import type { FloodSignal, WeatherSignal } from "../providers/open-meteo.server";

export type RiskLevel = "low" | "moderate" | "high" | "severe";

export type LocalityInput = {
  id: string;
  name: string;
  region_slug: string;
  terrain_note: string;
  elevation_m: number;
  slope_index: number;
};

export type DerivedForecast = {
  locality_id: string;
  flood_level: RiskLevel;
  landslide_level: RiskLevel;
  lead_hazard: "flood" | "landslide";
  onset_start: string;
  onset_end: string;
  peak_at: string | null;
  confidence_pct: number;
  rainfall_mm_24h: number;
  rainfall_mm_72h: number;
  soil_saturation_pct: number;
  river_discharge: number;
  summary: string;
  source: string;
  fetched_at: string;
};

function level(score: number): RiskLevel {
  if (score >= 78) return "severe";
  if (score >= 55) return "high";
  if (score >= 32) return "moderate";
  return "low";
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Derived hazard model: forecast rainfall intensity + accumulation, soil saturation,
 * river discharge anomaly and local slope/elevation. Deterministic and auditable.
 */
export function deriveForecast(
  locality: LocalityInput,
  weather: WeatherSignal,
  flood: FloodSignal,
): DerivedForecast {
  const soilPct = clamp(Math.round(weather.soilMoisture * 200));

  // Peak 3-hour rainfall intensity drives flash flooding and slope failure.
  let peakIntensity = 0;
  let peakIndex = 0;
  for (let i = 0; i + 3 <= weather.hourlyPrecip.length && i < 72; i += 1) {
    const window = weather.hourlyPrecip.slice(i, i + 3).reduce((s, r) => s + r.mm, 0);
    if (window > peakIntensity) {
      peakIntensity = window;
      peakIndex = i;
    }
  }

  const dischargeAnomaly =
    flood.baselineDischarge > 0
      ? (flood.peakDischarge - flood.baselineDischarge) / flood.baselineDischarge
      : 0;
  const lowLying = locality.elevation_m < 100 ? 12 : locality.elevation_m < 400 ? 6 : 0;

  const floodScore = clamp(
    weather.rain24h * 1.6 +
      weather.rain72h * 0.35 +
      soilPct * 0.28 +
      clamp(dischargeAnomaly * 100, 0, 45) +
      lowLying,
  );

  const landslideScore = clamp(
    peakIntensity * 2.1 * (0.4 + locality.slope_index) +
      weather.rain72h * 0.5 * locality.slope_index +
      soilPct * 0.45 * locality.slope_index +
      (locality.slope_index > 0.6 ? 8 : 0),
  );

  const floodLevel = level(floodScore);
  const landslideLevel = level(landslideScore);
  const leadHazard = landslideScore > floodScore ? "landslide" : "flood";

  // Onset window: first hour crossing a meaningful rainfall threshold.
  const trigger = weather.hourlyPrecip.findIndex((r) => r.mm >= 2);
  const startIdx = trigger >= 0 ? trigger : Math.max(0, peakIndex);
  const startIso =
    weather.hourlyPrecip[startIdx]?.time ?? new Date(Date.now() + 3600_000).toISOString();
  const start = new Date(startIso);
  const endIdx = Math.min(weather.hourlyPrecip.length - 1, startIdx + 12);
  const endIso =
    weather.hourlyPrecip[endIdx]?.time ?? new Date(start.getTime() + 12 * 3600_000).toISOString();
  const peakIso = weather.hourlyPrecip[peakIndex + 1]?.time ?? weather.hourlyPrecip[peakIndex]?.time;

  const dataStrength = clamp(
    40 + Math.min(30, weather.hourlyPrecip.length / 2) + (flood.baselineDischarge > 0 ? 15 : 0),
    35,
    92,
  );
  const confidence = Math.round(
    clamp(dataStrength - (leadHazard === "landslide" ? 6 : 0) + peakIntensity * 0.4, 35, 95),
  );

  const summary =
    `Open-Meteo forecast for ${locality.name}: ${weather.rain24h.toFixed(0)} mm rain in 24 h ` +
    `(peak ${peakIntensity.toFixed(0)} mm/3 h), soil saturation ${soilPct}%, ` +
    `river discharge ${flood.peakDischarge.toFixed(1)} m³/s ` +
    `(${dischargeAnomaly >= 0 ? "+" : ""}${Math.round(dischargeAnomaly * 100)}% vs normal). ` +
    `${locality.terrain_note}`;

  return {
    locality_id: locality.id,
    flood_level: floodLevel,
    landslide_level: landslideLevel,
    lead_hazard: leadHazard,
    onset_start: start.toISOString(),
    onset_end: new Date(endIso).toISOString(),
    peak_at: peakIso ? new Date(peakIso).toISOString() : null,
    confidence_pct: confidence,
    rainfall_mm_24h: Math.round(weather.rain24h * 10) / 10,
    rainfall_mm_72h: Math.round(weather.rain72h * 10) / 10,
    soil_saturation_pct: soilPct,
    river_discharge: Math.round(flood.peakDischarge * 100) / 100,
    summary,
    source: "open-meteo",
    fetched_at: new Date().toISOString(),
  };
}
