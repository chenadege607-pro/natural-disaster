import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, Menu, ShieldAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

const links = [
  { to: "/", label: "Home" },
  { to: "/map", label: "Risk map" },
  { to: "/alerts", label: "Alerts" },
  { to: "/trends", label: "Trends" },
  { to: "/report", label: "Report" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    setOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-deep-foreground/10 bg-deep text-deep-foreground">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <ShieldAlert className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-bold">SentinelCM</span>
            <span className="block text-[11px] uppercase tracking-widest text-deep-foreground/60">
              Cameroon hazard watch
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              activeProps={{ className: "bg-deep-foreground/12 text-deep-foreground" }}
              inactiveProps={{ className: "text-deep-foreground/70" }}
              className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-deep-foreground/10 hover:text-deep-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:ml-2 lg:flex">
          {loading ? null : user ? (
            <>
              <Button asChild size="sm" variant="secondary">
                <Link to="/dashboard">
                  <LayoutDashboard className="size-4" /> My dashboard
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={signOut}
                className="text-deep-foreground/80 hover:bg-deep-foreground/10 hover:text-deep-foreground"
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-deep-foreground/80 hover:bg-deep-foreground/10 hover:text-deep-foreground"
              >
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth">Get SMS alerts</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="ml-auto rounded-md p-2 hover:bg-deep-foreground/10 lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-deep-foreground/10 lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2 sm:px-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              activeProps={{ className: "bg-deep-foreground/12" }}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-deep-foreground/85"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-semibold"
              >
                My dashboard
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="rounded-md px-3 py-2.5 text-left text-sm font-semibold text-deep-foreground/85"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm font-semibold"
            >
              Sign in / Get SMS alerts
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-base font-bold">SentinelCM</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Flood and landslide risk awareness for all ten regions of Cameroon, built for citizens
            and local civil-protection officials.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Pages</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            <li>
              <Link to="/map" className="hover:text-foreground">
                Interactive risk map
              </Link>
            </li>
            <li>
              <Link to="/alerts" className="hover:text-foreground">
                Active alerts
              </Link>
            </li>
            <li>
              <Link to="/trends" className="hover:text-foreground">
                Historical trends
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-foreground">
                My alert dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Emergency</p>
          <p className="mt-2 text-muted-foreground">
            In an emergency, contact your local council or civil protection services directly. This
            platform currently runs on sample data for design review — it is not yet an official
            warning service.
          </p>
        </div>
      </div>
    </footer>
  );
}
