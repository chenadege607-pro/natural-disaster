import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { eventsQuery, readingsQuery, regionsQuery } from "@/lib/queries";
import { asRisk, formatNumber } from "@/lib/risk";

export const Route = createFileRoute("/trends")({
  head: () => ({
    meta: [
      { title: "Historical trends — rainfall, soil saturation & past disasters | SentinelCM" },
      {
        name: "description",
        content:
          "Twelve months of rainfall and soil-saturation data plus recorded flood and landslide events for each region of Cameroon.",
      },
      { property: "og:title", content: "Historical hazard trends for Cameroon" },
      {
        property: "og:description",
        content: "Compare rainfall, soil saturation and past disaster events region by region.",
      },
    ],
  }),
  component: TrendsPage,
});

const metrics = {
  rainfall_mm: { label: "Rainfall (mm)", unit: "mm" },
  soil_saturation_pct: { label: "Soil saturation (%)", unit: "%" },
  river_level_m: { label: "River level (m)", unit: "m" },
} as const;
type MetricKey = keyof typeof metrics;

const palette = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function TrendsPage() {
  const [metric, setMetric] = useState<MetricKey>("rainfall_mm");
  const [compare, setCompare] = useState<string[]>(["far-north", "littoral", "southwest"]);
  const regions = useQuery(regionsQuery);
  const readings = useQuery(readingsQuery);
  const events = useQuery(eventsQuery);

  const nameOf = (slug: string) => regions.data?.find((r) => r.slug === slug)?.name ?? slug;

  const series = useMemo(() => {
    const byMonth = new Map<string, Record<string, string | number>>();
    for (const row of readings.data ?? []) {
      const key = row.recorded_on;
      const label = new Date(key).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      const entry = byMonth.get(key) ?? { month: label };
      entry[row.region_slug] = Number(row[metric]);
      byMonth.set(key, entry);
    }
    return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [readings.data, metric]);

  const eventsByRegion = useMemo(() => {
    const map = new Map<string, { flood: number; landslide: number; affected: number }>();
    for (const event of events.data ?? []) {
      const entry = map.get(event.region_slug) ?? { flood: 0, landslide: 0, affected: 0 };
      if (event.hazard === "flood") entry.flood += 1;
      else entry.landslide += 1;
      entry.affected += event.people_affected;
      map.set(event.region_slug, entry);
    }
    return (regions.data ?? []).map((region) => ({
      region: region.name,
      ...(map.get(region.slug) ?? { flood: 0, landslide: 0, affected: 0 }),
    }));
  }, [events.data, regions.data]);

  const toggle = (slug: string) =>
    setCompare((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug].slice(-5),
    );

  return (
    <div>
      <PageHeader
        eyebrow="Historical trends"
        title="What the last year of data tells us"
        description="Environmental signals and recorded disaster events, so communities can see how this season compares with the last one."
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-lg font-bold">Environmental trend by region</h2>
              <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
                <TabsList>
                  <TabsTrigger value="rainfall_mm">Rainfall</TabsTrigger>
                  <TabsTrigger value="soil_saturation_pct">Soil</TabsTrigger>
                  <TabsTrigger value="river_level_m">Rivers</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(regions.data ?? []).map((region) => {
                const active = compare.includes(region.slug);
                return (
                  <button
                    key={region.slug}
                    type="button"
                    onClick={() => toggle(region.slug)}
                    aria-pressed={active}
                    className={
                      active
                        ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                        : "rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
                    }
                  >
                    {region.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 h-80">
              {series.length === 0 ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" fontSize={11} stroke="var(--color-muted-foreground)" />
                    <YAxis
                      fontSize={11}
                      stroke="var(--color-muted-foreground)"
                      unit={metrics[metric].unit}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {compare.map((slug, i) => (
                      <Line
                        key={slug}
                        type="monotone"
                        dataKey={slug}
                        name={nameOf(slug)}
                        stroke={palette[i % palette.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Select up to five regions. Showing {metrics[metric].label.toLowerCase()}.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-bold">Recorded events per region</h2>
              <div className="mt-4 h-80">
                {eventsByRegion.length === 0 ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventsByRegion}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="region"
                        fontSize={10}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={70}
                        stroke="var(--color-muted-foreground)"
                      />
                      <YAxis
                        fontSize={11}
                        allowDecimals={false}
                        stroke="var(--color-muted-foreground)"
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="flood"
                        name="Floods"
                        fill="var(--color-chart-1)"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="landslide"
                        name="Landslides"
                        fill="var(--color-chart-3)"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">Event log</h2>
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All hazards</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
                {(events.data ?? []).map((event) => (
                  <li key={event.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskBadge level={asRisk(event.severity)} />
                      <span className="text-sm font-semibold">{nameOf(event.region_slug)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(event.occurred_on).toLocaleDateString("en-GB", {
                          dateStyle: "medium",
                        })}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatNumber(event.people_affected)} people affected
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
