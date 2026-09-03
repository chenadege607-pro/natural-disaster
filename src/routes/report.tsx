import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Camera, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { regionsQuery, reportsQuery, submitReport } from "@/lib/queries";
import { asRisk, relativeTime } from "@/lib/risk";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a flood or landslide incident | SentinelCM" },
      {
        name: "description",
        content:
          "Send a short community report about flooding or a landslide you observed in your region of Cameroon, and read recent reports from neighbours.",
      },
      { property: "og:title", content: "Report a flood or landslide in your community" },
      {
        property: "og:description",
        content: "Local observations are the fastest early warning. Submit a report in one minute.",
      },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const regions = useQuery(regionsQuery);
  const reports = useQuery(reportsQuery);
  const queryClient = useQueryClient();

  const [regionSlug, setRegionSlug] = useState("");
  const [hazard, setHazard] = useState("flood");
  const [severity, setSeverity] = useState("moderate");
  const [locality, setLocality] = useState("");
  const [description, setDescription] = useState("");
  const [reporter, setReporter] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: submitReport,
    onSuccess: async () => {
      toast.success("Report received", {
        description: "Officials in your region can now see it on the monitoring dashboard.",
      });
      setDone(true);
      setLocality("");
      setDescription("");
      setPhotoUrl("");
      await queryClient.invalidateQueries({ queryKey: ["community_reports"] });
    },
    onError: (error: Error) => toast.error("Could not send report", { description: error.message }),
  });

  const nameOf = (slug: string) => regions.data?.find((r) => r.slug === slug)?.name ?? slug;
  const valid = regionSlug !== "" && description.trim().length >= 10;

  return (
    <div>
      <PageHeader
        eyebrow="Community reporting"
        title="Report what you are seeing"
        description="A short, factual report helps officials verify conditions faster than any sensor. Never put yourself at risk to collect information."
      />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px]">
        <Card>
          <CardContent className="p-6 sm:p-8">
            {done ? (
              <div className="flex flex-col items-start gap-4 rounded-lg border border-risk-low/30 bg-risk-low-soft p-6">
                <CheckCircle2 className="size-8 text-risk-low" />
                <div>
                  <h2 className="font-display text-lg font-bold">Thank you — report submitted</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your report appears in the feed and awaits review by the regional monitoring
                    team.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setDone(false)}>
                  Submit another report
                </Button>
              </div>
            ) : null}

            <form
              className="mt-6 grid gap-5 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!valid) return;
                mutation.mutate({
                  region_slug: regionSlug,
                  hazard,
                  severity,
                  locality: locality.trim() || null,
                  description: description.trim(),
                  reporter_name: reporter.trim() || null,
                  photo_url: photoUrl.trim() || null,
                });
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="region">Region *</Label>
                <Select value={regionSlug} onValueChange={setRegionSlug}>
                  <SelectTrigger id="region">
                    <SelectValue placeholder="Select your region" />
                  </SelectTrigger>
                  <SelectContent>
                    {(regions.data ?? []).map((region) => (
                      <SelectItem key={region.slug} value={region.slug}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="locality">Locality or neighbourhood</Label>
                <Input
                  id="locality"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g. Douala, Ndogpassi III"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="hazard">What happened? *</Label>
                <Select value={hazard} onValueChange={setHazard}>
                  <SelectTrigger id="hazard">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flood">Flooding / standing water</SelectItem>
                    <SelectItem value="landslide">Landslide / slope failure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="severity">How serious is it? *</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger id="severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low — minor, no damage</SelectItem>
                    <SelectItem value="moderate">Moderate — movement disrupted</SelectItem>
                    <SelectItem value="high">High — homes or roads affected</SelectItem>
                    <SelectItem value="severe">Severe — people in danger</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="description">Describe what you see *</Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Water depth, streets affected, cracks in the ground, whether people have moved to safety…"
                />
                <p className="text-xs text-muted-foreground">
                  {description.trim().length}/10 characters minimum
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reporter">Your name (optional)</Label>
                <Input
                  id="reporter"
                  value={reporter}
                  onChange={(e) => setReporter(e.target.value)}
                  placeholder="Initials are fine"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="photo" className="flex items-center gap-1.5">
                  <Camera className="size-4" /> Photo link (optional)
                </Label>
                <Input
                  id="photo"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>

              <div className="sm:col-span-2">
                <Button type="submit" size="lg" disabled={!valid || mutation.isPending}>
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    "Submit report"
                  )}
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Reports are reviewed before being treated as confirmed. In an emergency, call your
                  local civil protection services first.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside>
          <h2 className="font-display text-lg font-bold">Recent community reports</h2>
          <div className="mt-4 space-y-3">
            {reports.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : (reports.data ?? []).slice(0, 8).map((report) => (
                  <article key={report.id} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskBadge level={asRisk(report.severity)} />
                      <span className="text-xs font-medium capitalize text-muted-foreground">
                        {report.hazard}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {relativeTime(report.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
                      <MapPin className="size-3.5 text-primary" />
                      {report.locality ?? nameOf(report.region_slug)}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {report.description}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                      {nameOf(report.region_slug)} · {report.status}
                    </p>
                  </article>
                ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
