import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Loader2, MapPin, MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import {
  localitiesQuery,
  localityForecastsQuery,
  regionsQuery,
  rolesQuery,
  smsMessagesQuery,
  subscriptionsQuery,
} from "@/lib/queries";
import { sendLocalityReport, sendMyDigest } from "@/lib/sms.functions";
import { asRisk, countdown, exactTime, higherRisk, onsetWindow, relativeTime } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My alert dashboard — neighbourhood forecasts & SMS | SentinelCM" },
      {
        name: "description",
        content:
          "Your personal dashboard: watched towns and neighbourhoods, predicted onset windows, SMS subscriptions and on-demand SMS reports.",
      },
      { property: "og:title", content: "My SentinelCM alert dashboard" },
      {
        property: "og:description",
        content: "Neighbourhood-level forecasts with exact timing plus your SMS alert settings.",
      },
    ],
  }),
  component: UserDashboard,
});

function UserDashboard() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const regions = useQuery(regionsQuery);
  const localities = useQuery(localitiesQuery);
  const forecasts = useQuery(localityForecastsQuery);
  const subs = useQuery(subscriptionsQuery);
  const messages = useQuery(smsMessagesQuery);
  const roles = useQuery({ ...rolesQuery(user?.id ?? ""), enabled: Boolean(user?.id) });

  const [phone, setPhone] = useState("");
  const [regionSlug, setRegionSlug] = useState("");
  const [localityId, setLocalityId] = useState("");
  const [minSeverity, setMinSeverity] = useState("high");
  const [frequency, setFrequency] = useState("daily");
  const [demandLocality, setDemandLocality] = useState("");
  const [demandPhone, setDemandPhone] = useState("");

  const sendReport = useServerFn(sendLocalityReport);
  const sendDigest = useServerFn(sendMyDigest);

  const watched = useMemo(() => {
    const rows = (subs.data ?? []).filter((s) => s.is_active);
    const ids = new Set(rows.map((s) => s.locality_id).filter(Boolean) as string[]);
    const regionSet = new Set(rows.map((s) => s.region_slug).filter(Boolean) as string[]);
    return (localities.data ?? [])
      .filter((l) => ids.has(l.id) || regionSet.has(l.region_slug))
      .map((l) => ({
        locality: l,
        forecast: (forecasts.data ?? []).find((f) => f.locality_id === l.id) ?? null,
      }))
      .filter((row) => row.forecast)
      .sort(
        (a, b) =>
          new Date(a.forecast!.onset_start).getTime() - new Date(b.forecast!.onset_start).getTime(),
      );
  }, [subs.data, localities.data, forecasts.data]);

  const addSub = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!/^\+?[0-9\s-]{8,18}$/.test(phone.trim())) throw new Error("Enter a valid phone number");
      if (!regionSlug) throw new Error("Choose a region");
      const { error } = await supabase.from("sms_subscriptions").insert({
        user_id: user.id,
        phone: phone.trim(),
        region_slug: regionSlug,
        locality_id: localityId || null,
        min_severity: minSeverity,
        frequency,
        is_active: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("SMS subscription saved");
      setPhone("");
      setLocalityId("");
      void queryClient.invalidateQueries({ queryKey: ["sms_subscriptions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleSub = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("sms_subscriptions")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["sms_subscriptions"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const removeSub = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_subscriptions").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Subscription removed");
      void queryClient.invalidateQueries({ queryKey: ["sms_subscriptions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onDemand = useMutation({
    mutationFn: async () =>
      sendReport({ data: { localityId: demandLocality, phone: demandPhone.trim() } }),
    onSuccess: (result) => {
      toast.success(
        result.simulated
          ? "SMS simulated (no SMS provider configured yet)"
          : "SMS report sent to your phone",
        { description: result.preview.slice(0, 120) },
      );
      void queryClient.invalidateQueries({ queryKey: ["sms_messages"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const digest = useMutation({
    mutationFn: async () => sendDigest({}),
    onSuccess: (result) => {
      toast.success(
        result.simulated ? `${result.sent} digest message(s) simulated` : `${result.sent} SMS sent`,
      );
      void queryClient.invalidateQueries({ queryKey: ["sms_messages"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const localityOptions = (localities.data ?? []).filter(
    (l) => !regionSlug || l.region_slug === regionSlug,
  );
  const isAdmin = (roles.data ?? []).includes("admin");

  return (
    <div>
      <PageHeader
        eyebrow="My dashboard"
        title={`Welcome${user?.email ? `, ${user.email.split("@")[0]}` : ""}`}
        description="Your watched neighbourhoods, the exact windows when hazards are expected, and the SMS channels keeping you informed."
        actions={
          isAdmin ? (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-md bg-deep-foreground/10 px-3 py-2 text-sm font-semibold text-deep-foreground"
            >
              Open admin console
            </Link>
          ) : null
        }
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold">Watched neighbourhoods</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => digest.mutate()}
                disabled={digest.isPending}
              >
                {digest.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Send my digest now
              </Button>
            </div>

            {subs.isLoading || localities.isLoading ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : watched.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No watch areas yet. Add an SMS subscription below to start tracking specific towns
                and neighbourhoods.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {watched.slice(0, 8).map(({ locality, forecast }) => {
                  const level = higherRisk(
                    asRisk(forecast!.flood_level),
                    asRisk(forecast!.landslide_level),
                  );
                  return (
                    <li key={locality.id} className="rounded-lg border bg-card p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <RiskBadge level={level} variant="solid" />
                        <span className="text-sm font-semibold">{locality.name}</span>
                        <span className="text-xs capitalize text-muted-foreground">
                          {locality.kind} · {locality.region_slug.replace("-", " ")}
                        </span>
                      </div>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold">
                        <Clock className="size-3.5" />
                        {onsetWindow(forecast!.onset_start, forecast!.onset_end)} ·{" "}
                        {countdown(forecast!.onset_start)}
                      </p>
                      {forecast!.peak_at ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Peak expected {exactTime(forecast!.peak_at)} · confidence{" "}
                          {forecast!.confidence_pct}%
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm text-muted-foreground">{forecast!.summary}</p>
                      <Link
                        to="/regions/$slug"
                        params={{ slug: locality.region_slug }}
                        className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
                      >
                        View region detail
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-bold">SMS life-support subscriptions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Regular digests plus immediate warnings when a hazard reaches your threshold.
              </p>

              <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Region</Label>
                    <Select
                      value={regionSlug}
                      onValueChange={(v) => {
                        setRegionSlug(v);
                        setLocalityId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose region" />
                      </SelectTrigger>
                      <SelectContent>
                        {(regions.data ?? []).map((r) => (
                          <SelectItem key={r.slug} value={r.slug}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Town / neighbourhood (optional)</Label>
                    <Select value={localityId} onValueChange={setLocalityId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Whole region" />
                      </SelectTrigger>
                      <SelectContent>
                        {localityOptions.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Alert from severity</Label>
                    <Select value={minSeverity} onValueChange={setMinSeverity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["low", "moderate", "high", "severe"].map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Digest frequency</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["hourly", "daily", "weekly"].map((f) => (
                          <SelectItem key={f} value={f} className="capitalize">
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={() => addSub.mutate()}
                  disabled={addSub.isPending}
                  className="w-full"
                >
                  {addSub.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save subscription
                </Button>
              </div>

              <ul className="mt-6 space-y-3">
                {(subs.data ?? []).map((sub) => {
                  const loc = (localities.data ?? []).find((l) => l.id === sub.locality_id);
                  return (
                    <li
                      key={sub.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                    >
                      <MapPin className="size-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {loc ? loc.name : (sub.region_slug ?? "All areas")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sub.phone} · from {sub.min_severity} · {sub.frequency}
                        </p>
                      </div>
                      <Switch
                        checked={sub.is_active}
                        onCheckedChange={(v) => toggleSub.mutate({ id: sub.id, active: v })}
                        aria-label="Toggle subscription"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSub.mutate(sub.id)}
                        aria-label="Remove subscription"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-bold">Request a report by SMS</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get the current forecast for one neighbourhood — hazard, expected window and
                  confidence — delivered to any phone.
                </p>
                <div className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Town / neighbourhood</Label>
                    <Select value={demandLocality} onValueChange={setDemandLocality}>
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
                    <Label htmlFor="demandPhone">Send to</Label>
                    <Input
                      id="demandPhone"
                      value={demandPhone}
                      onChange={(e) => setDemandPhone(e.target.value)}
                      placeholder="+237 6XX XXX XXX"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => onDemand.mutate()}
                    disabled={onDemand.isPending}
                  >
                    {onDemand.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <MessageSquare className="size-4" />
                    )}
                    Send SMS report
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-bold">SMS history</h2>
                <ul className="mt-4 space-y-3">
                  {(messages.data ?? []).slice(0, 6).map((msg) => (
                    <li key={msg.id} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold uppercase tracking-wide">{msg.kind}</span>
                        <span>· {msg.status}</span>
                        <span className="ml-auto">{relativeTime(msg.created_at)}</span>
                      </div>
                      <p className="mt-1.5 text-sm">{msg.body}</p>
                    </li>
                  ))}
                  {(messages.data ?? []).length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      No messages yet — send a digest or an on-demand report to test delivery.
                    </li>
                  ) : null}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
