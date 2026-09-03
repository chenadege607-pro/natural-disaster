import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, ShieldCheck, Siren } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to SentinelCM early-warning alerts" },
      {
        name: "description",
        content:
          "Create a SentinelCM account to receive neighbourhood-level flood and landslide warnings by SMS, with exact predicted onset windows.",
      },
      { property: "og:title", content: "Sign in to SentinelCM" },
      {
        property: "og:description",
        content: "Google or email sign-in for neighbourhood-level disaster warnings in Cameroon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  async function handleEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAwaitingConfirm(true);
          toast.success("Check your email to confirm your account.");
          return;
        }
        toast.success("Account created.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-deep p-10 text-deep-foreground lg:flex">
        <div className="inline-flex items-center gap-2 font-display text-lg font-bold">
          <Siren className="size-5 text-risk-severe" />
          SentinelCM
        </div>
        <div className="max-w-md space-y-6">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Warnings for your neighbourhood, not just your region.
          </h1>
          <p className="text-deep-foreground/80">
            Sign in to pick the towns and neighbourhoods you care about, see the exact predicted
            onset window for each hazard, and get life-support SMS alerts — plus reports on demand.
          </p>
          <ul className="space-y-3 text-sm text-deep-foreground/85">
            {[
              "40 monitored towns and neighbourhoods across all 10 regions",
              "Predicted start, peak and end times with confidence levels",
              "Regular SMS digests and on-demand SMS reports",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-risk-low" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-deep-foreground/60">
          Sample forecasting data · civil-protection reference build
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-14 sm:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Access your personal alert dashboard and SMS subscriptions.
            </p>

            <Tabs
              value={mode}
              onValueChange={(v) => {
                setMode(v as "signin" | "signup");
                setAwaitingConfirm(false);
              }}
              className="mt-6"
            >
              <TabsList className="w-full">
                <TabsTrigger value="signin" className="flex-1">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">
                  Sign up
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              type="button"
              variant="outline"
              className="mt-6 w-full"
              onClick={handleGoogle}
              disabled={busy}
            >
              <GoogleMark /> Continue with Google
            </Button>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or use email{" "}
              <span className="h-px flex-1 bg-border" />
            </div>

            {awaitingConfirm ? (
              <div className="rounded-lg border bg-secondary p-4 text-sm">
                <Mail className="mb-2 size-5" />
                We sent a confirmation link to <span className="font-semibold">{email}</span>. Click
                it to finish creating your account.
              </div>
            ) : (
              <form onSubmit={handleEmail} className="space-y-4">
                {mode === "signup" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Amina Njoya"
                      required
                    />
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
            )}

            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              By continuing you agree to receive safety-critical SMS messages for the areas you
              subscribe to. Standard network rates apply.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2a7 7 0 0 1-6.6-4.8H1.4v3.1A11.9 11.9 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.5a7.1 7.1 0 0 1 0-4.9V6.5H1.4a11.9 11.9 0 0 0 0 10.7l4-2.7Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 11.9 11.9 0 0 0 1.4 6.5l4 3.1A7 7 0 0 1 12 4.8Z"
      />
    </svg>
  );
}
