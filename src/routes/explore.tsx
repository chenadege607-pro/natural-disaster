import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bot,
  Check,
  ChevronDown,
  CloudRain,
  LoaderCircle,
  MapPin,
  Search,
  Send,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  askGroq,
  getPlaceHazard,
  getPlaceWeather,
  searchPlaces,
  type HazardResult,
  type PlaceResult,
} from "@/lib/terra-watch.functions";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Explore a place | SentinelCM" }] }),
  component: ExplorePage,
});

function ExplorePage() {
  const search = useServerFn(searchPlaces);
  const weather = useServerFn(getPlaceWeather);
  const hazard = useServerFn(getPlaceHazard);
  const ask = useServerFn(askGroq);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  const [weatherData, setWeatherData] = useState<{
    temperature: number | null;
    rain: number | null;
  } | null>(null);
  const [hazardType, setHazardType] = useState<"flood" | "landslide" | "">("");
  const [hazardData, setHazardData] = useState<HazardResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [assistantResponding, setAssistantResponding] = useState(false);
  const [chat, setChat] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  async function findPlaces(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setBusy(true);
    setError("");
    try {
      setPlaces(await search({ data: { query: query.trim() } }));
    } catch {
      setError("Could not search places. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function choosePlace(place: PlaceResult) {
    setSelected(place);
    setPlaces([]);
    setHazardType("");
    setHazardData(null);
    setBusy(true);
    setError("");
    try {
      setWeatherData(
        await weather({ data: { latitude: place.latitude, longitude: place.longitude } }),
      );
    } catch {
      setError("Weather data is unavailable for this place right now.");
    } finally {
      setBusy(false);
    }
  }

  async function checkHazard() {
    if (!selected || !hazardType) return;
    setBusy(true);
    setError("");
    try {
      setHazardData(
        await hazard({
          data: { latitude: selected.latitude, longitude: selected.longitude, type: hazardType },
        }),
      );
      setChat([]);
    } catch {
      setError("Could not load hazard data. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function askAssistant(event: FormEvent) {
    event.preventDefault();
    if (!message.trim() || assistantResponding) return;
    const nextChat = [...chat, { role: "user" as const, content: message.trim() }];
    setMessage("");
    setChat(nextChat);
    setAssistantResponding(true);
    try {
      const answer = await ask({
        data: {
          location: selected?.name ?? "unknown",
          hazardData: JSON.stringify(hazardData ?? "none"),
          messages: nextChat,
        },
      });
      setChat([...nextChat, { role: "assistant", content: "" }]);
      for (let index = 0; index < answer.length; index += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 18));
        const content = answer.slice(0, index + 1);
        setChat((current) => {
          const last = current.at(-1);
          if (!last || last.role !== "assistant") return current;
          return [...current.slice(0, -1), { ...last, content }];
        });
      }
    } catch {
      setChat([
        ...nextChat,
        {
          role: "assistant",
          content: "The assistant is unavailable. Configure GROQ_API_KEY in the server .env file.",
        },
      ]);
    } finally {
      setAssistantResponding(false);
    }
  }

  const worst = hazardData?.readings.some((reading) => reading.level === "high")
    ? "high"
    : hazardData?.readings.some((reading) => reading.level === "moderate")
      ? "moderate"
      : "low";
  return (
    <div>
      <PageHeader
        eyebrow="Explore"
        title="Find a place and check its hazards"
        description="Search any region, town or neighbourhood in Cameroon, then inspect live weather and model readings for flood or landslide conditions."
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <form onSubmit={findPlaces} className="max-w-2xl">
          <Label htmlFor="place-search">Search Cameroon</Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="place-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buea, Bamenda, Douala..."
            />
            <Button type="submit" disabled={busy || query.trim().length < 2}>
              {busy ? <LoaderCircle className="animate-spin" /> : <Search />} Search
            </Button>
          </div>
        </form>
        {places.length > 0 && (
          <Card className="mt-3 max-w-2xl">
            <CardContent className="p-2">
              {places.map((place) => (
                <button
                  key={`${place.latitude}-${place.longitude}`}
                  type="button"
                  onClick={() => void choosePlace(place)}
                  className="flex w-full items-start gap-3 rounded-md p-3 text-left hover:bg-muted"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    <span className="block font-medium">{place.name}</span>
                    <span className="text-sm text-muted-foreground">{place.displayName}</span>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {selected && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="size-5 text-primary" /> {selected.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{selected.region}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Latitude</dt>
                      <dd className="font-medium">{selected.latitude.toFixed(4)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Longitude</dt>
                      <dd className="font-medium">{selected.longitude.toFixed(4)}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CloudRain className="size-5 text-primary" /> Current weather
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {weatherData ? (
                    <div className="flex items-end gap-5">
                      <span className="font-display text-4xl font-bold">
                        {weatherData.temperature ?? "--"}°C
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Rain now: {weatherData.rain ?? "--"} mm
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading local conditions...</p>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Hazard check</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-52 flex-1">
                    <Label htmlFor="hazard-type">Choose a hazard type</Label>
                    <div className="relative mt-2">
                      <select
                        id="hazard-type"
                        value={hazardType}
                        onChange={(event) => {
                          setHazardType(event.target.value as typeof hazardType);
                          setHazardData(null);
                        }}
                        className="h-10 w-full appearance-none rounded-md border bg-background px-3 pr-9 text-sm"
                      >
                        <option value="">Select a hazard...</option>
                        <option value="flood">Flood</option>
                        <option value="landslide">Landslide</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" />
                    </div>
                  </div>
                  <Button onClick={() => void checkHazard()} disabled={!hazardType || busy}>
                    {busy ? <LoaderCircle className="animate-spin" /> : <Check />} Check hazard data
                  </Button>
                </div>
                {hazardData && (
                  <div className="mt-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-display font-bold">
                        {hazardData.type === "flood" ? "Flood" : "Landslide"} readings
                      </h3>
                      <RiskBadge
                        level={worst}
                        label={
                          worst === "high"
                            ? "Elevated readings"
                            : worst === "moderate"
                              ? "Watch conditions"
                              : "Calm conditions"
                        }
                      />
                    </div>
                    <div className="mt-4 space-y-3">
                      {hazardData.readings.map((reading) => (
                        <div key={reading.label} className="rounded-md border p-3">
                          <div className="flex justify-between text-sm">
                            <span>{reading.label}</span>
                            <strong>
                              {reading.value.toFixed(1)} {reading.unit}
                            </strong>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full ${reading.level === "high" ? "bg-risk-severe" : reading.level === "moderate" ? "bg-risk-moderate" : "bg-risk-low"}`}
                              style={{
                                width: `${Math.max(4, Math.min(100, reading.value / (hazardData.type === "flood" ? 3 : 0.15)))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {hazardData.type === "landslide" && (
                      <p className="mt-4 text-sm text-muted-foreground">
                        Latest shallow soil moisture: {hazardData.soilMoisture ?? "n/a"}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      {hazardData && (
        <>
          <Button
            className="fixed bottom-6 right-6 z-30 shadow-lg"
            onClick={() => setChatOpen(true)}
          >
            <Bot /> Ask assistant
          </Button>
          {chatOpen && (
            <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex h-[min(620px,calc(100vh-32px))] max-w-md flex-col overflow-hidden rounded-xl border bg-card shadow-2xl sm:right-6 sm:left-auto">
              <div className="flex items-center justify-between bg-deep px-4 py-3 text-deep-foreground">
                <div>
                  <p className="font-display font-bold">Disaster Assistant</p>
                  <p className="text-xs text-deep-foreground/65">Explain the current readings</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChatOpen(false)}
                  className="text-deep-foreground hover:bg-deep-foreground/10"
                >
                  <X />
                </Button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
                {chat.length === 0 && (
                  <p className="text-center text-muted-foreground">
                    Ask what these readings mean for {selected?.name}.
                  </p>
                )}
                {chat.map((item, index) => (
                  <div
                    key={index}
                    className={
                      item.role === "user"
                        ? "ml-8 rounded-lg bg-primary p-3 text-primary-foreground"
                        : "mr-8 rounded-lg bg-muted p-3"
                    }
                  >
                    {item.content}
                  </div>
                ))}
                {assistantResponding && (
                  <div className="mr-8 rounded-lg bg-muted p-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1" aria-label="Assistant is typing">
                      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-current" />
                    </span>
                  </div>
                )}
              </div>
              <form onSubmit={askAssistant} className="flex gap-2 border-t p-3">
                <Input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ask about this hazard..."
                />
                <Button size="icon" type="submit" aria-label="Send message" disabled={assistantResponding}>
                  {assistantResponding ? <LoaderCircle className="animate-spin" /> : <Send />}
                </Button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
