import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SendResult = { sent: number; simulated: boolean; preview: string };

const severityRank: Record<string, number> = { low: 0, moderate: 1, high: 2, severe: 3 };

function windowLabel(startIso: string, endIso: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      timeZone: "Africa/Douala",
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(startIso)} to ${fmt(endIso)} (WAT)`;
}

type ForecastRow = {
  locality_id: string;
  flood_level: string;
  landslide_level: string;
  lead_hazard: string;
  onset_start: string;
  onset_end: string;
  peak_at: string | null;
  confidence_pct: number;
  summary: string;
};

function composeMessage(
  locality: { name: string; region_slug: string },
  forecast: ForecastRow | null,
): string {
  if (!forecast) {
    return `SentinelCM: no active forecast for ${locality.name}. Reply later or check the app.`;
  }
  const lead = forecast.lead_hazard === "landslide" ? "LANDSLIDE" : "FLOOD";
  const level = (
    forecast.lead_hazard === "landslide" ? forecast.landslide_level : forecast.flood_level
  ).toUpperCase();
  const peak = forecast.peak_at
    ? ` Peak approx ${new Date(forecast.peak_at).toLocaleString("en-GB", {
        timeZone: "Africa/Douala",
        hour: "2-digit",
        minute: "2-digit",
      })}.`
    : "";
  return [
    `SentinelCM ${lead} ${level} - ${locality.name}`,
    `Expected window: ${windowLabel(forecast.onset_start, forecast.onset_end)}.${peak}`,
    `Confidence ${forecast.confidence_pct}%. Flood ${forecast.flood_level}, landslide ${forecast.landslide_level}.`,
    forecast.summary,
    "Emergency: contact your local civil protection office.",
  ].join(" ");
}

/** Sends through Twilio when credentials exist, otherwise logs a simulated message. */
async function deliver(
  rows: {
    phone: string;
    body: string;
    userId: string | null;
    localityId: string | null;
    kind: string;
  }[],
): Promise<SendResult> {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_PHONE_NUMBER"];
  const live = Boolean(sid && token && from);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const logs: {
    user_id: string | null;
    phone: string;
    body: string;
    kind: string;
    status: string;
    provider: string;
    locality_id: string | null;
  }[] = [];
  for (const row of rows) {
    let status = "simulated";
    if (live) {
      try {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: row.phone, From: from!, Body: row.body }),
        });
        status = res.ok ? "sent" : "failed";
        if (!res.ok) console.error("[sms] twilio error", res.status);
      } catch (error) {
        console.error("[sms] twilio request failed", error);
        status = "failed";
      }
    }
    logs.push({
      user_id: row.userId,
      phone: row.phone,
      body: row.body,
      kind: row.kind,
      status,
      provider: live ? "twilio" : "simulated",
      locality_id: row.localityId,
    });
  }

  if (logs.length > 0) {
    const { error } = await supabaseAdmin.from("sms_messages").insert(logs);
    if (error) console.error("[sms] log insert failed", error.message);
  }

  return {
    sent: rows.length,
    simulated: !live,
    preview: rows[0]?.body ?? "",
  };
}

/** On-demand SMS report for one locality, to the caller's phone. */
export const sendLocalityReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { localityId: string; phone: string }) => {
    const phone = input.phone.trim();
    if (!/^\+?[0-9\s-]{8,18}$/.test(phone)) throw new Error("Enter a valid phone number");
    if (!input.localityId) throw new Error("Choose a locality");
    return { localityId: input.localityId, phone };
  })
  .handler(async ({ data, context }) => {
    const { data: locality, error } = await context.supabase
      .from("localities")
      .select("id, name, region_slug")
      .eq("id", data.localityId)
      .maybeSingle();
    if (error || !locality) throw new Error("Locality not found");

    const { data: forecast } = await context.supabase
      .from("locality_forecasts")
      .select("*")
      .eq("locality_id", data.localityId)
      .maybeSingle();

    const body = composeMessage(locality, (forecast as ForecastRow | null) ?? null);
    return deliver([
      {
        phone: data.phone,
        body,
        userId: context.userId,
        localityId: data.localityId,
        kind: "on_demand",
      },
    ]);
  });

/** Sends the regular life-support digest for every active subscription of the caller. */
export const sendMyDigest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: subs } = await context.supabase
      .from("sms_subscriptions")
      .select("*")
      .eq("user_id", context.userId)
      .eq("is_active", true);

    if (!subs || subs.length === 0) throw new Error("Add an SMS subscription first");

    const { data: localities } = await context.supabase
      .from("localities")
      .select("id, name, region_slug");
    const { data: forecasts } = await context.supabase.from("locality_forecasts").select("*");

    const rows = subs.flatMap((sub) => {
      const scope = (localities ?? []).filter((l) =>
        sub.locality_id ? l.id === sub.locality_id : l.region_slug === sub.region_slug,
      );
      const min = severityRank[sub.min_severity] ?? 2;
      const picked = scope
        .map((l) => ({
          l,
          f: ((forecasts ?? []) as ForecastRow[]).find((f) => f.locality_id === l.id) ?? null,
        }))
        .filter(({ f }) => {
          if (!f) return false;
          const worst = Math.max(
            severityRank[f.flood_level] ?? 0,
            severityRank[f.landslide_level] ?? 0,
          );
          return worst >= min;
        })
        .sort((a, b) => (b.f?.confidence_pct ?? 0) - (a.f?.confidence_pct ?? 0))
        .slice(0, 3);

      if (picked.length === 0) {
        return [
          {
            phone: sub.phone,
            body: `SentinelCM digest: nothing at or above ${sub.min_severity} risk in your watch area right now. Stay alert during storms.`,
            userId: context.userId,
            localityId: sub.locality_id,
            kind: "digest",
          },
        ];
      }
      return picked.map(({ l, f }) => ({
        phone: sub.phone,
        body: composeMessage(l, f),
        userId: context.userId,
        localityId: l.id,
        kind: "digest",
      }));
    });

    return deliver(rows);
  });

/** Admin broadcast: sends a locality warning to every matching active subscriber. */
export const broadcastLocalityAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { localityId: string; note?: string }) => {
    if (!input.localityId) throw new Error("Choose a locality");
    return { localityId: input.localityId, note: (input.note ?? "").trim() };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: locality } = await supabaseAdmin
      .from("localities")
      .select("id, name, region_slug")
      .eq("id", data.localityId)
      .maybeSingle();
    if (!locality) throw new Error("Locality not found");

    const { data: forecast } = await supabaseAdmin
      .from("locality_forecasts")
      .select("*")
      .eq("locality_id", data.localityId)
      .maybeSingle();

    const { data: subs } = await supabaseAdmin
      .from("sms_subscriptions")
      .select("*")
      .eq("is_active", true)
      .or(`locality_id.eq.${data.localityId},region_slug.eq.${locality.region_slug}`);

    const base = composeMessage(locality, (forecast as ForecastRow | null) ?? null);
    const body = data.note ? `${base} ${data.note}` : base;

    return deliver(
      (subs ?? []).map((sub) => ({
        phone: sub.phone,
        body,
        userId: sub.user_id as string,
        localityId: locality.id,
        kind: "alert",
      })),
    );
  });
