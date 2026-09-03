import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CloudRain, Droplets, Mountain } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { CameroonRiskMap } from "@/components/CameroonRiskMap";
import { RiskBadge, RiskLegend } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { regionsQuery, riskQuery } from "@/lib/queries";
import { asRisk, higherRisk, riskSoft, riskText, type Hazard } from "@/lib/risk";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Interactive risk map — Cameroon's 10 regions | SentinelCM" },
      {
        name: "description",
        content:
          "Colour-coded flood and landslide risk map of Cameroon. Tap any region for current risk levels, rainfall and forecast summary.",
      },
      { property: "og:title", content: "Interactive Cameroon flood & landslide risk map" },
      {
        property: "og:description",
        content: "Compare flood and landslide risk across all ten regions of Cameroon.",
      },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const [hazard, setHazard] = useState<Hazard | "combined">("combined");
  const [selected, setSelected] = useState<string>("far-north");
  const regions = useQuery(regionsQuery);
  const risks = useQuery(riskQuery);

  const region = regions.data?.find((r) => r.slug === selected);
  const risk = risks.data?.find((r) => r.region_slug === selected);
  const nameOf = (slug: string) => regions.data?.find((r) => r.slug === slug)?.name ?? slug;

  return (
    <div>
      <PageHeader
        eyebrow="Risk map"
        title="Regional risk map of Cameroon"
        description="Each region is shaded by its current risk level. Switch between flood and landslide views, then select a region for the full picture."
        actions={<RiskLegend className="text-deep-foreground/85" />}
      />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_400px]">
        <div>
          <Tabs value={hazard} onValueChange={(v) => setHazard(v as Hazard | "combined")}>
            <TabsList>
              <TabsTrigger value="combined">Combined</TabsTrigger>
              <TabsTrigger value="flood">Flood</TabsTrigger>
              <TabsTrigger value="landslide">Landslide</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card className="mt-4">
            <CardContent className="p-4 sm:p-6">
              <div className="mx-auto max-w-md">
                {risks.isLoading ? (
                  <Skeleton className="aspect-[7/10] w-full" />
                ) : (
                  <CameroonRiskMap
                    risks={risks.data ?? []}
                    hazard={hazard}
                    selected={selected}
                    onSelect={setSelected}
                  />
                )}
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Schematic map — region shapes are simplified for clarity on small screens.
              </p>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(risks.data ?? []).map((row) => {
              const level =
                hazard === "flood"
                  ? asRisk(row.flood_level)
                  : hazard === "landslide"
                    ? asRisk(row.landslide_level)
                    : higherRisk(asRisk(row.flood_level), asRisk(row.landslide_level));
              return (
                <button
                  key={row.region_slug}
                  type="button"
                  onClick={() => setSelected(row.region_slug)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                    selected === row.region_slug
                      ? "border-primary bg-secondary"
                      : "bg-card hover:bg-secondary/60",
                  )}
                >
                  <span className="font-medium">{nameOf(row.region_slug)}</span>
                  <RiskBadge level={level} />
                </button>
              );
            })}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          {!region || !risk ? (
            <Skeleton className="h-96" />
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Region detail
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">{region.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {region.capital} · {region.terrain}
                </p>

                <div className="mt-5 grid gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3",
                      riskSoft[asRisk(risk.flood_level)],
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <CloudRain className="size-4" /> Flood risk
                    </span>
                    <span className="text-sm font-bold uppercase">{risk.flood_level}</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3",
                      riskSoft[asRisk(risk.landslide_level)],
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Mountain className="size-4" /> Landslide risk
                    </span>
                    <span className="text-sm font-bold uppercase">{risk.landslide_level}</span>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Rain 7d", value: `${risk.rainfall_mm_7d}mm` },
                    { label: "Soil sat.", value: `${risk.soil_saturation_pct}%` },
                    { label: "River", value: `${risk.river_level_m}m` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-surface p-3">
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {item.label}
                      </dt>
                      <dd className="mt-1 font-display text-base font-bold">{item.value}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-5 flex gap-2 text-sm leading-relaxed text-muted-foreground">
                  <Droplets className={cn("mt-0.5 size-4 shrink-0", riskText.high)} />
                  {risk.forecast_summary}
                </p>

                <Button asChild className="mt-6 w-full">
                  <Link to="/regions/$slug" params={{ slug: region.slug }}>
                    Full region view <ArrowRight className="ml-1.5 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
