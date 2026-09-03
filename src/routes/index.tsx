import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CloudRain, Mountain, Radio, Users } from "lucide-react";

import { CameroonRiskMap } from "@/components/CameroonRiskMap";
import { RiskBadge, RiskLegend } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { alertsQuery, regionsQuery, reportsQuery, riskQuery } from "@/lib/queries";
import { asRisk, higherRisk, relativeTime, riskText, type RiskLevel } from "@/lib/risk";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SentinelCM — Flood & landslide risk for Cameroon's 10 regions" },
      {
        name: "description",
        content:
          "Live-style flood and landslide risk levels, alerts and historical trends for all ten regions of Cameroon, for citizens and local officials.",
      },
      { property: "og:title", content: "SentinelCM — Cameroon flood & landslide risk watch" },
      {
        property: "og:description",
        content:
          "Regional risk map, active warnings, environmental trends and community incident reports across Cameroon.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const regions = useQuery(regionsQuery);
  const risks = useQuery(riskQuery);
  const alerts = useQuery(alertsQuery);
  const reports = useQuery(reportsQuery);

  const riskRows = risks.data ?? [];
  const counts: Record<RiskLevel, number> = { low: 0, moderate: 0, high: 0, severe: 0 };
  for (const row of riskRows) {
    counts[higherRisk(asRisk(row.flood_level), asRisk(row.landslide_level))] += 1;
  }
  const nameOf = (slug: string) => regions.data?.find((r) => r.slug === slug)?.name ?? slug;
  const topAlerts = (alerts.data ?? []).slice(0, 3);
  const watchList = [...riskRows]
    .sort(
      (a, b) =>
        Number(b.rainfall_mm_7d) +
        Number(b.soil_saturation_pct) -
        (Number(a.rainfall_mm_7d) + Number(a.soil_saturation_pct)),
    )
    .slice(0, 4);

  return (
    <div>
      <section className="border-b bg-deep text-deep-foreground">
        <div className="grid-backdrop">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                <Radio className="size-3.5" /> National hazard watch
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
                Know the flood and landslide risk where you live.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-deep-foreground/80 sm:text-lg">
                SentinelCM brings rainfall, soil saturation and river levels together into one clear
                risk picture for all ten regions of Cameroon — so families can prepare early and
                local officials can act with confidence.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/map">
                    Open the risk map <ArrowRight className="ml-1.5 size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-deep-foreground/25 bg-transparent text-deep-foreground hover:bg-deep-foreground/10 hover:text-deep-foreground"
                >
                  <Link to="/alerts">See active alerts</Link>
                </Button>
              </div>

              <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Regions covered", value: "10" },
                  { label: "Active alerts", value: String(alerts.data?.length ?? "—") },
                  { label: "Severe regions", value: String(counts.severe) },
                  { label: "Community reports", value: String(reports.data?.length ?? "—") },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-deep-foreground/12 bg-deep-foreground/5 p-3"
                  >
                    <dt className="text-[11px] uppercase tracking-wider text-deep-foreground/60">
                      {stat.label}
                    </dt>
                    <dd className="mt-1 font-display text-2xl font-bold">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-xl border border-deep-foreground/12 bg-deep-foreground/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-sm font-semibold uppercase tracking-wider">
                  Current national snapshot
                </p>
                <RiskLegend className="text-deep-foreground/80" />
              </div>
              <div className="mx-auto mt-4 max-w-sm">
                {risks.isLoading ? (
                  <Skeleton className="mx-auto aspect-[7/10] w-full" />
                ) : (
                  <CameroonRiskMap risks={riskRows} hazard="combined" />
                )}
              </div>
              <p className="mt-3 text-center text-xs text-deep-foreground/60">
                Highest of flood and landslide risk per region. Sample data for design review.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Regions to watch this week</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Ranked by combined 7-day rainfall and soil saturation — the two signals that most
              often precede flooding and slope failure.
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/dashboard">
              My alert dashboard <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>

        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {risks.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)
            : watchList.map((row) => (
                <Card key={row.region_slug} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-bold">{nameOf(row.region_slug)}</h3>
                      <RiskBadge
                        level={higherRisk(asRisk(row.flood_level), asRisk(row.landslide_level))}
                        variant="solid"
                      />
                    </div>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <CloudRain className="size-4" /> Flood
                        </dt>
                        <dd className={riskText[asRisk(row.flood_level)] + " font-semibold"}>
                          {asRisk(row.flood_level)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <Mountain className="size-4" /> Landslide
                        </dt>
                        <dd className={riskText[asRisk(row.landslide_level)] + " font-semibold"}>
                          {asRisk(row.landslide_level)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2 text-muted-foreground">
                        <dt>Rain (7 days)</dt>
                        <dd className="font-medium text-foreground">{row.rainfall_mm_7d} mm</dd>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <dt>Soil saturation</dt>
                        <dd className="font-medium text-foreground">{row.soil_saturation_pct}%</dd>
                      </div>
                    </dl>
                    <Link
                      to="/regions/$slug"
                      params={{ slug: row.region_slug }}
                      className="mt-4 inline-flex items-center text-sm font-semibold text-primary hover:underline"
                    >
                      Region detail <ArrowRight className="ml-1 size-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
        </div>
      </section>

      <section className="border-y bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Latest warnings</h2>
            <div className="mt-6 space-y-4">
              {alerts.isLoading
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)
                : topAlerts.map((alert) => (
                    <article
                      key={alert.id}
                      className="rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <RiskBadge level={asRisk(alert.severity)} variant="solid" />
                        <span className="text-sm font-semibold">{nameOf(alert.region_slug)}</span>
                        <span className="text-xs text-muted-foreground">
                          {relativeTime(alert.issued_at)}
                        </span>
                      </div>
                      <h3 className="mt-3 font-display text-base font-bold">{alert.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {alert.body}
                      </p>
                    </article>
                  ))}
            </div>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/alerts">All alerts</Link>
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <span className="flex size-10 items-center justify-center rounded-md bg-accent/15 text-accent-foreground">
              <Users className="size-5" />
            </span>
            <h2 className="mt-4 text-2xl font-bold">Seen water rising or a slope give way?</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Local observations are the fastest early warning there is. Send a short report with
              your region, locality and — if it is safe — a photo. Reports appear in the community
              feed and on the officials dashboard for review.
            </p>
            <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
              <Link to="/report">Report an incident</Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              For life-threatening emergencies, always contact local civil protection services
              directly first.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
