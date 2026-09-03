import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, BellRing, FileText, Loader2, Radio, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { RiskBadge, RiskLegend } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/hooks/useSession";
import {
  alertsQuery,
  localitiesQuery,
  localityForecastsQuery,
  regionsQuery,
  reportsQuery,
  rolesQuery,
  smsMessagesQuery,
} from "@/lib/queries";
import { broadcastLocalityAlert } from "@/lib/sms.functions";
import {
  asRisk,
  countdown,
  exactTime,
  higherRisk,
  onsetWindow,
  relativeTime,
  riskOrder,
} from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — locality forecasts, alerts & SMS broadcast | SentinelCM" },
      {
        name: "description",
        content:
          "Civil-protection admin console: neighbourhood forecasts with onset timing, community report queue, and SMS broadcasts to subscribers.",
      },
      { property: "og:title", content: "SentinelCM admin console" },
      {
        property: "og:description",
        content: "Locality-level forecasts, report triage and SMS broadcast controls.",
      },
    ],
  }),
  component: AdminConsole,
});

function AdminConsole() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const roles = useQuery({ ...rolesQuery(user?.id ?? ""), enabled: Boolean(user?.id) });
  const regions = useQuery(regionsQuery);
  const localities = useQuery(localitiesQuery);
  const forecasts = useQuery(localityForecastsQuery);
  const alerts = useQuery(alertsQuery);
  const reports = useQuery(reportsQuery);
  const messages = useQuery(smsMessagesQuery);

  const [broadcastLocality, setBroadcastLocality] = useState("");
  const [note, setNote] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const broadcast = useServerFn(broadcastLocalityAlert);

  const isAdmin = (roles.data ?? []).includes("admin");
  const isOfficial = isAdmin || (roles.data ?? []).includes("official");

  const rows = useMemo(() => {
    return (localities.data ?? [])
      .filter((l) => regionFilter === "all" || l.region_slug === regionFilter)
      .map((l) => ({
        locality: l,
        forecast: (forecasts.data ?? []).find((f) => f.locality_id === l.id) ?? null,
      }))
      .sort((a, b) => {
        const rank = (row: typeof a) =>
          row.forecast
            ? riskOrder[
                higherRisk(asRisk(row.forecast.flood_level), asRisk(row.forecast.landslide_level))
              ]
            : -1;
        return rank(b) - rank(a);
      });
  }, [localities.data, forecasts.data, regionFilter]);

  const send = useMutation({
    mutationFn: async () => broadcast({ data: { localityId: broadcastLocality, note } }),
    onSuccess: (result) => {
      toast.success(
        result.simulated
          ? `${result.sent} message(s) simulated (no SMS provider configured)`
          : `${result.sent} SMS broadcast`,
      );
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["sms_messages"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (roles.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-16">
        <Skeleton className="h-10" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!isOfficial) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <ShieldAlert className="mx-auto size-10 text-risk-high" />
        <h1 className="mt-4 font-display text-2xl font-bold">Restricted console</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is limited to civil-protection officials and administrators. Your account does
          not currently hold that role.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Back to my dashboard
        </Link>
      </div>
    );
  }

  const pending = (reports.data ?? []).filter((r) => r.status === "pending").length;
  const stats = [
    {
      label: "Localities monitored",
      value: String(localities.data?.length ?? "—"),
      icon: Activity,
    },
    { label: "Active alerts", value: String(alerts.data?.length ?? "—"), icon: BellRing },
    { label: "Reports awaiting review", value: String(pending), icon: FileText },
    { label: "SMS sent (recent)", value: String(messages.data?.length ?? "—"), icon: Radio },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={isAdmin ? "Admin console" : "Officials console"}
        title="Neighbourhood forecast operations"
        description="Every monitored town and neighbourhood ranked by risk, with predicted onset windows, the report review queue and SMS broadcast controls."
        actions={<RiskLegend className="text-deep-foreground/85" />}
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <stat.icon className="size-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="font-display text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <h2 className="font-display text-lg font-bold">Locality forecasts, ranked by risk</h2>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {(regions.data ?? []).map((r) => (
                    <SelectItem key={r.slug} value={r.slug}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {localities.isLoading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Locality</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Overall</TableHead>
                      <TableHead>Lead hazard</TableHead>
                      <TableHead>Expected window</TableHead>
                      <TableHead>Peak</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead className="text-right">Rain 24h</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(({ locality, forecast }) => (
                      <TableRow key={locality.id}>
                        <TableCell className="font-semibold">
                          {locality.name}
                          <span className="ml-2 text-xs capitalize text-muted-foreground">
                            {locality.kind}
                          </span>
                        </TableCell>
                        <TableCell className="capitalize">
                          {locality.region_slug.replace("-", " ")}
                        </TableCell>
                        <TableCell>
                          {forecast ? (
                            <RiskBadge
                              level={higherRisk(
                                asRisk(forecast.flood_level),
                                asRisk(forecast.landslide_level),
                              )}
                              variant="solid"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{forecast?.lead_hazard ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {forecast ? (
                            <>
                              {onsetWindow(forecast.onset_start, forecast.onset_end)}
                              <span className="block text-muted-foreground">
                                {countdown(forecast.onset_start)}
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {forecast?.peak_at ? exactTime(forecast.peak_at) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {forecast ? `${forecast.confidence_pct}%` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {forecast ? `${forecast.rainfall_mm_24h} mm` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-bold">Broadcast an SMS warning</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sends the current locality forecast — hazard, window, peak and confidence — to every
                active subscriber for that neighbourhood or its region.
              </p>
              <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label>Locality</Label>
                  <Select value={broadcastLocality} onValueChange={setBroadcastLocality}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a locality" />
                    </SelectTrigger>
                    <SelectContent>
                      {(localities.data ?? []).map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name} · {l.region_slug.replace("-", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="note">Extra instruction (optional)</Label>
                  <Input
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Move to the Bonaberi school shelter before 20:00."
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => send.mutate()}
                  disabled={send.isPending || !isAdmin}
                >
                  {send.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Radio className="size-4" />
                  )}
                  {isAdmin ? "Broadcast now" : "Admin role required"}
                </Button>
              </div>

              <ul className="mt-6 space-y-2">
                {(messages.data ?? []).slice(0, 4).map((msg) => (
                  <li key={msg.id} className="rounded-lg border p-3 text-xs">
                    <span className="font-semibold uppercase tracking-wide">{msg.kind}</span> ·{" "}
                    {msg.status} · {relativeTime(msg.created_at)}
                    <p className="mt-1 text-sm text-muted-foreground">{msg.body}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-bold">Community report queue</h2>
              <ul className="mt-4 space-y-3">
                {(reports.data ?? []).slice(0, 8).map((report) => (
                  <li key={report.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskBadge level={asRisk(report.severity)} />
                      <span className="text-sm font-semibold capitalize">
                        {report.region_slug.replace("-", " ")}
                      </span>
                      <span className="ml-auto text-xs font-medium uppercase tracking-wide">
                        {report.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{report.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {report.locality ?? "Location not given"} · {relativeTime(report.created_at)}
                    </p>
                  </li>
                ))}
                {(reports.data ?? []).length === 0 ? (
                  <li className="text-sm text-muted-foreground">No community reports yet.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
