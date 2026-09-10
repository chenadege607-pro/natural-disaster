import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { groqApiKey } from "@/backend/config.server";

const coordinates = z.object({ latitude: z.number(), longitude: z.number() });

export type PlaceResult = {
  name: string;
  displayName: string;
  region: string;
  latitude: number;
  longitude: number;
};

export type CurrentWeather = { temperature: number | null; rain: number | null };
export type HazardReading = {
  label: string;
  value: number;
  unit: string;
  level: "low" | "moderate" | "high";
};
export type HazardResult = {
  type: "flood" | "landslide";
  readings: HazardReading[];
  soilMoisture: number | null;
};

export const askGroq = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        location: z.string().max(120),
        hazardData: z.string().max(12000),
        messages: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
          .max(20),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const apiKey = groqApiKey();
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured on the server.");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        temperature: 0.4,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content: `You are SentinelCM's disaster information assistant. Give brief, practical answers in no more than 3 short sentences or 3 bullets. Lead with the direct answer, avoid repetition, and do not present model readings as official warnings. Location: ${data.location}. Hazard data: ${data.hazardData}`,
          },
          ...data.messages,
        ],
      }),
    });
    if (!response.ok) throw new Error(`Groq request failed (${response.status})`);
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return body.choices?.[0]?.message?.content ?? "No answer returned.";
  });

export const searchPlaces = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ query: z.string().min(2).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      format: "jsonv2",
      country: "Cameroon",
      city: data.query,
      limit: "8",
      addressdetails: "1",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { accept: "application/json", "user-agent": "SentinelCM/1.0" },
    });
    if (!response.ok) throw new Error(`Place search failed (${response.status})`);
    const places = (await response.json()) as Array<{
      name?: string;
      display_name?: string;
      lat: string;
      lon: string;
      address?: { state?: string };
    }>;
    return places.map((place) => ({
      name: place.name || place.display_name?.split(",")[0] || "Unknown place",
      displayName: place.display_name || "Cameroon",
      region: place.address?.state || "Cameroon",
      latitude: Number(place.lat),
      longitude: Number(place.lon),
    })) satisfies PlaceResult[];
  });

export const getPlaceWeather = createServerFn({ method: "GET" })
  .inputValidator((data) => coordinates.parse(data))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      latitude: String(data.latitude),
      longitude: String(data.longitude),
      current: "temperature_2m,rain",
      timezone: "auto",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
    const body = (await response.json()) as {
      current?: { temperature_2m?: number; rain?: number };
    };
    return {
      temperature: body.current?.temperature_2m ?? null,
      rain: body.current?.rain ?? null,
    } satisfies CurrentWeather;
  });

export const getPlaceHazard = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    coordinates.extend({ type: z.enum(["flood", "landslide"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      latitude: String(data.latitude),
      longitude: String(data.longitude),
    });
    let readings: HazardReading[] = [];
    let soilMoisture: number | null = null;
    if (data.type === "flood") {
      params.set("daily", "river_discharge,river_discharge_max");
      params.set("forecast_days", "5");
      const response = await fetch(`https://flood-api.open-meteo.com/v1/flood?${params}`);
      if (!response.ok) throw new Error(`Flood request failed (${response.status})`);
      const body = (await response.json()) as {
        daily?: { time?: string[]; river_discharge?: Array<number | null> };
      };
      readings = (body.daily?.time ?? []).slice(0, 5).map((date, index) => {
        const value = body.daily?.river_discharge?.[index] ?? 0;
        return {
          label: date,
          value,
          unit: "m3/s",
          level: value >= 200 ? "high" : value >= 60 ? "moderate" : "low",
        };
      });
    } else {
      params.set("hourly", "precipitation,soil_moisture_0_to_7cm");
      params.set("forecast_days", "1");
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error(`Landslide request failed (${response.status})`);
      const body = (await response.json()) as {
        hourly?: {
          time?: string[];
          precipitation?: Array<number | null>;
          soil_moisture_0_to_7cm?: Array<number | null>;
        };
      };
      const hourly = body.hourly;
      soilMoisture = hourly?.soil_moisture_0_to_7cm?.[0] ?? null;
      readings = (hourly?.time ?? []).slice(0, 5).map((time, index) => {
        const value = hourly?.precipitation?.[index] ?? 0;
        return {
          label: time,
          value,
          unit: "mm",
          level: value >= 8 ? "high" : value >= 3 ? "moderate" : "low",
        };
      });
    }
    return { type: data.type, readings, soilMoisture } satisfies HazardResult;
  });
