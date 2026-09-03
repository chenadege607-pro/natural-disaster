import { cn } from "@/lib/utils";
import {
  asRisk,
  higherRisk,
  regionShapes,
  riskFill,
  type Hazard,
  type RiskLevel,
} from "@/lib/risk";
import type { RegionRisk } from "@/lib/queries";

type Props = {
  risks: RegionRisk[];
  hazard: Hazard | "combined";
  selected?: string | null;
  onSelect?: (slug: string) => void;
  className?: string;
};

function levelFor(risk: RegionRisk | undefined, hazard: Hazard | "combined"): RiskLevel {
  if (!risk) return "low";
  const flood = asRisk(risk.flood_level);
  const slide = asRisk(risk.landslide_level);
  if (hazard === "flood") return flood;
  if (hazard === "landslide") return slide;
  return higherRisk(flood, slide);
}

export function CameroonRiskMap({ risks, hazard, selected, onSelect, className }: Props) {
  const byRegion = new Map(risks.map((r) => [r.region_slug, r]));

  return (
    <svg
      viewBox="0 0 420 610"
      role="img"
      aria-label="Schematic risk map of the ten regions of Cameroon"
      className={cn("h-full w-full", className)}
    >
      {regionShapes.map((shape) => {
        const level = levelFor(byRegion.get(shape.slug), hazard);
        const isSelected = selected === shape.slug;
        return (
          <g
            key={shape.slug}
            role="button"
            tabIndex={0}
            aria-label={`${shape.label} region, risk ${level}`}
            aria-pressed={isSelected}
            onClick={() => onSelect?.(shape.slug)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect?.(shape.slug);
              }
            }}
            className="cursor-pointer outline-none focus-visible:opacity-100"
          >
            <path
              d={shape.path}
              className={cn(
                riskFill[level],
                "stroke-background transition-all duration-200",
                isSelected ? "opacity-100" : "opacity-85 hover:opacity-100",
              )}
              strokeWidth={isSelected ? 4 : 2}
            />
            <text
              x={shape.cx}
              y={shape.cy}
              textAnchor="middle"
              className={cn(
                "pointer-events-none fill-on-risk font-semibold",
                ["northwest", "west", "littoral", "southwest"].includes(shape.slug)
                  ? "text-[8.5px] tracking-tight"
                  : "text-[11px]",
              )}
            >
              {shape.label}
            </text>

          </g>
        );
      })}
    </svg>
  );
}
