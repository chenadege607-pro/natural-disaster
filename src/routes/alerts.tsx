import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing, CloudRain, Clock, Mountain } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { alertsQuery, regionsQuery } from "@/lib/queries";
import { asRisk, relativeTime, riskLabel, riskSoft, type RiskLevel } from "@/lib/risk";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Active flood & landslide alerts by region | SentinelCM" },
      {
        name: "description",
        content:
          "Feed of active flood and landslide warnings across Cameroon, ordered by time issued and marked by severity.",
      },
      { property: "og:title", content: "Active hazard alerts across Cameroon" },
      {
        property: "og:description",
        content: "Severity-coded flood and landslide warnings with timestamps for every region.",
      },
    ],
  }),
  component: AlertsPage,
});

const filters = ["all", "severe", "high", "moderate", "low"] as const;

function AlertsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const alerts = useQuery(alertsQuery);
  const regions = useQuery(regionsQuery);
  const nameOf = (slug: string) => regions.data?.find((r) => r.slug === slug)?.name ?? slug;

  const rows = (alerts.data ?? []).filter((a) => filter === "all" || a.severity === filter);
  const counts = (["severe", "high", "moderate", "low"] as RiskLevel[]).map((level) => ({
    level,
    count: (alerts.data ?? []).filter((a) => a.severity === level).length,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Alerts"
        title="Active warnings and advisories"
        description="Every alert currently in force, newest first. Severe and high warnings require immediate action from affected communities."
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {counts.map((item) => (
            <div
              key={item.level}
              className={cn("rounded-lg border p-4", riskSoft[item.level])}
              aria-label={`${item.count} ${item.level} alerts`}
            >
              <p className="font-display text-3xl font-bold">{item.count}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide">
                {riskLabel[item.level]}
              </p>
            </div>
          ))}
        </div>

        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as (typeof filters)[number])}
          className="mt-8"
        >
          <TabsList className="flex-wrap">
            {filters.map((f) => (
              <TabsTrigger key={f} value={f} className="capitalize">
                {f}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mt-6 space-y-4">
          {alerts.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No alerts at this severity right now.
              </CardContent>
            </Card>
          ) : (
            rows.map((alert) => {
              const level = asRisk(alert.severity);
              const urgent = level === "severe" || level === "high";
              return (
                <article
                  key={alert.id}
                  className={cn(
                    "relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm sm:p-6",
                    urgent && "border-l-4",
                    level === "severe" && "border-l-risk-severe",
                    level === "high" && "border-l-risk-high",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge level={level} variant={urgent ? "solid" : "soft"} />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-secondary-foreground">
                      {alert.hazard === "flood" ? (
                        <CloudRain className="size-3.5" />
                      ) : (
                        <Mountain className="size-3.5" />
                      )}
                      {alert.hazard}
                    </span>
                    <span className="text-sm font-semibold">{nameOf(alert.region_slug)}</span>
                    <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      {relativeTime(alert.issued_at)}
                    </span>
                  </div>

                  <h2 className="mt-3 flex items-start gap-2 font-display text-lg font-bold">
                    {level === "severe" ? (
                      <BellRing className="mt-0.5 size-5 shrink-0 text-risk-severe" />
                    ) : null}
                    {alert.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{alert.body}</p>
                  {alert.expires_at ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      In force until{" "}
                      {new Date(alert.expires_at).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
