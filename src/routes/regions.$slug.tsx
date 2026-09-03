import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CloudRain,
  Droplets,
  Mountain,
  ShieldCheck,
  TriangleAlert,
  Waves,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  alertsQuery,
  eventsQuery,
  readingsQuery,
  regionsQuery,
  reportsQuery,
  riskQuery,
} from "@/lib/queries";
import {
  asRisk,
  formatNumber,
  relativeTime,
  riskAdvice,
  riskSoft,
  type RiskLevel,
} from "@/lib/risk";

export const Route = createFileRoute("/regions/$slug")({
  head: ({ params }) => {
    const label = params.slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${label} region — flood & landslide risk | SentinelCM` },
        {
          name: "description",
          content: `Current flood and landslide risk, rainfall trend, forecast summary and safety advice for the ${label} region of Cameroon.`,
        },
        { property: "og:title", content: `${label} region hazard outlook` },
        {
          property: "og:description",
          content: `Risk levels, environmental trend and safety recommendations for ${label}, Cameroon.`,
        },
      ],
    };
  },
  component: RegionDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Region not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We monitor the ten regions of Cameroon. Pick one from the risk map.
      </p>
      <Button asChild className="mt-6">
        <Link to="/map">Back to risk map</Link>
      </Button>
    </div>
  ),
});

const monthLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

function RegionDetail() {
  const { slug } = Route.useParams();
  const regions = useQuery(regionsQuery);
  const risks = useQuery(riskQuery);
  const readings = useQuery(readingsQuery);
  const alerts = useQuery(alertsQuery);
  const events = useQuery(eventsQuery);
  const reports = useQuery(reportsQuery);

  if (regions.data && !regions.data.some((r) => r.slug === slug)) throw notFound();

  const region = regions.data?.find((r) => r.slug === slug);
  const risk = risks.data?.find((r) => r.region_slug === slug);
  const series = (readings.data ?? [])
    .filter((r) => r.region_slug === slug)
    .map((r) => ({
      month: monthLabel(r.recorded_on),
      rainfall: Number(r.rainfall_mm),
      soil: Number(r.soil_saturation_pct),
      river: Number(r.river_level_m),
    }));
  const regionAlerts = (alerts.data ?? []).filter((a) => a.region_slug === slug);
  const regionEvents = (events.data ?? []).filter((e) => e.region_slug === slug);
  const regionReports = (reports.data ?? []).filter((r) => r.region_slug === slug).slice(0, 4);

  const flood = asRisk(risk?.flood_level);
  const slide = asRisk(risk?.landslide_level);

  return (
    <div>
      <PageHeader
        eyebrow="Region detail"
        title={region ? `${region.name} region` : "Loading region"}
        description={
          region
            ? `${region.capital} · ${region.terrain} · ${formatNumber(region.population)} residents · ${formatNumber(region.area_km2)} km²`
            : undefined
        }
        actions={
          <Button
            asChild
            variant="outline"
            className="border-deep-foreground/25 bg-transparent text-deep-foreground hover:bg-deep-foreground/10 hover:text-deep-foreground"
          >
            <Link to="/map">
              <ArrowLeft className="mr-1.5 size-4" /> All regions
            </Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              { hazard: "flood" as const, level: flood, icon: CloudRain, title: "Flood risk" },
              {
                hazard: "landslide" as const,
                level: slide,
                icon: Mountain,
                title: "Landslide risk",
              },
            ] satisfies {
              hazard: "flood" | "landslide";
              level: RiskLevel;
              icon: typeof CloudRain;
              title: string;
            }[]
          ).map((item) => (
            <Card key={item.hazard} className={cn("border-l-4", riskSoft[item.level])}>
              <CardContent className="bg-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                    <item.icon className="size-5" /> {item.title}
                  </h2>
                  <RiskBadge level={item.level} variant="solid" />
                </div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {riskAdvice(item.hazard, item.level).map((line) => (
                    <li key={line} className="flex gap-2">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-display text-lg font-bold">Forecast summary</h2>
            {risk ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {risk.forecast_summary}
                </p>
                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "Rainfall, last 7 days",
                      value: `${risk.rainfall_mm_7d} mm`,
                      icon: CloudRain,
                    },
                    {
                      label: "Soil saturation proxy",
                      value: `${risk.soil_saturation_pct}%`,
                      icon: Droplets,
                    },
                    { label: "River level", value: `${risk.river_level_m} m`, icon: Waves },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-surface p-4">
                      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                        <item.icon className="size-3.5" /> {item.label}
                      </dt>
                      <dd className="mt-1.5 font-display text-2xl font-bold">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-xs text-muted-foreground">
                  Updated {relativeTime(risk.updated_at)} · sample data pending live environmental
                  feeds
                </p>
              </>
            ) : (
              <Skeleton className="mt-4 h-32" />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-bold">Monthly rainfall (12 months)</h2>
              <div className="mt-4 h-64">
                {series.length === 0 ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series}>
                      <defs>
                        <linearGradient id="rainfall" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="month" fontSize={11} stroke="var(--color-muted-foreground)" />
                      <YAxis fontSize={11} stroke="var(--color-muted-foreground)" unit="mm" />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="rainfall"
                        name="Rainfall (mm)"
                        stroke="var(--color-chart-1)"
                        fill="url(#rainfall)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-bold">Soil saturation & river level</h2>
              <div className="mt-4 h-64">
                {series.length === 0 ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="month" fontSize={11} stroke="var(--color-muted-foreground)" />
                      <YAxis
                        yAxisId="left"
                        fontSize={11}
                        stroke="var(--color-muted-foreground)"
                        unit="%"
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        fontSize={11}
                        stroke="var(--color-muted-foreground)"
                        unit="m"
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="soil"
                        name="Soil saturation (%)"
                        stroke="var(--color-chart-3)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="river"
                        name="River level (m)"
                        stroke="var(--color-chart-2)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-bold">Alerts in force</h2>
              {regionAlerts.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No active alerts for this region.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {regionAlerts.map((alert) => (
                    <li key={alert.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <RiskBadge level={asRisk(alert.severity)} variant="solid" />
                        <span className="text-xs text-muted-foreground">
                          {relativeTime(alert.issued_at)}
                        </span>
                      </div>
                      <p className="mt-2 font-semibold">{alert.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{alert.body}</p>
                    </li>
                  ))}
                </ul>
              )}

              <h2 className="mt-8 font-display text-lg font-bold">Past events</h2>
              <ul className="mt-4 space-y-3">
                {regionEvents.map((event) => (
                  <li key={event.id} className="flex gap-3 rounded-lg bg-surface p-4">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-risk-high" />
                    <div>
                      <p className="text-sm font-semibold capitalize">
                        {event.hazard} ·{" "}
                        {new Date(event.occurred_on).toLocaleDateString("en-GB", {
                          dateStyle: "medium",
                        })}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatNumber(event.people_affected)} people affected
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-bold">Community reports</h2>
              {regionReports.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No reports from this region yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {regionReports.map((report) => (
                    <li key={report.id} className="rounded-lg border p-4">
                      <div className="flex items-center gap-2">
                        <RiskBadge level={asRisk(report.severity)} />
                        <span className="text-xs text-muted-foreground">
                          {relativeTime(report.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium">{report.locality ?? "Unspecified"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild variant="outline" className="mt-5 w-full">
                <Link to="/report">Add a report</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
