export type RiskLevel = "low" | "moderate" | "high" | "severe";
export type Hazard = "flood" | "landslide";

export const RISK_LEVELS: RiskLevel[] = ["low", "moderate", "high", "severe"];

export const riskOrder: Record<RiskLevel, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  severe: 3,
};

export function asRisk(value: string | null | undefined): RiskLevel {
  return RISK_LEVELS.includes(value as RiskLevel) ? (value as RiskLevel) : "low";
}

export const riskLabel: Record<RiskLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  severe: "Severe",
};

/** Solid chip / marker styling per risk level (semantic tokens only). */
export const riskSolid: Record<RiskLevel, string> = {
  low: "bg-risk-low text-on-risk",
  moderate: "bg-risk-moderate text-on-risk",
  high: "bg-risk-high text-on-risk",
  severe: "bg-risk-severe text-on-risk",
};

/** Soft background with strong text, for cards and list rows. */
export const riskSoft: Record<RiskLevel, string> = {
  low: "bg-risk-low-soft text-risk-low border-risk-low/30",
  moderate: "bg-risk-moderate-soft text-risk-moderate border-risk-moderate/30",
  high: "bg-risk-high-soft text-risk-high border-risk-high/30",
  severe: "bg-risk-severe-soft text-risk-severe border-risk-severe/30",
};

export const riskFill: Record<RiskLevel, string> = {
  low: "fill-risk-low",
  moderate: "fill-risk-moderate",
  high: "fill-risk-high",
  severe: "fill-risk-severe",
};

export const riskText: Record<RiskLevel, string> = {
  low: "text-risk-low",
  moderate: "text-risk-moderate",
  high: "text-risk-high",
  severe: "text-risk-severe",
};

export function higherRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return riskOrder[a] >= riskOrder[b] ? a : b;
}

export function riskAdvice(hazard: Hazard, level: RiskLevel): string[] {
  if (hazard === "flood") {
    switch (level) {
      case "severe":
        return [
          "Move to higher ground now — do not wait for water to reach your home.",
          "Cut electricity at the mains before leaving, and take documents in a sealed bag.",
          "Never walk or drive through moving floodwater, even if it looks shallow.",
          "Follow instructions from your local council and civil protection teams.",
        ];
      case "high":
        return [
          "Prepare a go-bag with water, medicine, documents and a phone charger.",
          "Raise furniture, stock and livestock feed above expected water level.",
          "Clear drains and gutters around your compound where it is safe to do so.",
          "Agree a meeting point with your family in case you are separated.",
        ];
      case "moderate":
        return [
          "Avoid crossing culverts and low bridges during and after storms.",
          "Keep children away from drainage channels and flooded streets.",
          "Check alerts each morning and evening during the rainy season.",
        ];
      default:
        return [
          "No action needed — stay informed through the alerts feed.",
          "Use the calm period to clear blocked drains near your home.",
        ];
    }
  }
  switch (level) {
    case "severe":
      return [
        "Leave houses built directly below steep or cut slopes immediately.",
        "Listen for cracking sounds, tilting trees or sudden muddy water — signs of imminent failure.",
        "Avoid slope roads and cuttings, especially at night and during rainfall.",
        "Report new ground cracks to your council so neighbours can be warned.",
      ];
    case "high":
      return [
        "Inspect slopes above your home for fresh cracks, bulges or seeping water.",
        "Do not dig into or dump soil on saturated slopes.",
        "Identify a safe route away from the slope and share it with your household.",
      ];
    case "moderate":
      return [
        "Divert roof and yard runoff away from slope faces.",
        "Watch for small slips on roadside cuttings after heavy rain.",
      ];
    default:
      return [
        "Conditions stable — maintain slope drainage and vegetation cover.",
        "Report any new ground movement even during dry periods.",
      ];
  }
}

/**
 * Schematic map of Cameroon's 10 regions. Deliberately simplified geometry
 * (clear, tappable shapes) laid out in true relative positions.
 */
export type RegionShape = { slug: string; label: string; path: string; cx: number; cy: number };

export const regionShapes: RegionShape[] = [
  {
    slug: "far-north",
    label: "Far North",
    path: "M216 12 L258 74 L236 124 L184 112 L170 58 Z",
    cx: 214,
    cy: 74,
  },
  {
    slug: "north",
    label: "North",
    path: "M170 58 L184 112 L236 124 L302 192 L214 218 L140 152 Z",
    cx: 214,
    cy: 155,
  },
  {
    slug: "adamawa",
    label: "Adamawa",
    path: "M140 152 L214 218 L332 212 L346 292 L152 302 L116 216 Z",
    cx: 236,
    cy: 258,
  },
  {
    slug: "northwest",
    label: "Northwest",
    path: "M116 216 L152 302 L96 292 L58 256 L82 214 Z",
    cx: 104,
    cy: 258,
  },
  {
    slug: "west",
    label: "West",
    path: "M152 302 L108 362 L74 332 L96 292 Z",
    cx: 113,
    cy: 322,
  },
  {
    slug: "east",
    label: "East",
    path: "M346 292 L368 302 L372 432 L302 472 L266 302 Z",
    cx: 325,
    cy: 366,
  },
  {
    slug: "centre",
    label: "Centre",
    path: "M266 302 L302 472 L232 502 L176 432 L166 320 Z",
    cx: 235,
    cy: 396,
  },
  {
    slug: "littoral",
    label: "Littoral",
    path: "M152 302 L166 320 L176 432 L176 506 L122 472 L108 362 Z",
    cx: 152,
    cy: 400,
  },
  {
    slug: "southwest",
    label: "Southwest",
    path: "M108 362 L122 472 L92 522 L46 470 L62 380 Z",
    cx: 92,
    cy: 442,
  },
  {
    slug: "south",
    label: "South",
    path: "M232 502 L302 472 L292 572 L202 586 L176 506 Z",
    cx: 240,
    cy: 528,
  },
];

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** "Tue 21:00 → Wed 09:00" style window for a predicted onset. */
export function onsetWindow(startIso: string, endIso: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(startIso)} → ${fmt(endIso)}`;
}

export function exactTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

/** "in 6 h 20 min" / "now" / "passed". */
export function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "under way";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours < 48) return rest ? `in ${hours} h ${rest} min` : `in ${hours} h`;
  return `in ${Math.round(hours / 24)} days`;
}
