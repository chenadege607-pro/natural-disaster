/** Server-only configuration. Read env vars through these helpers, never at module scope. */

export type SmsProviderName = "twilio" | "gatewayapi" | "africastalking" | "simulated";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export const openMeteo = {
  weatherUrl: "https://api.open-meteo.com/v1/forecast",
  floodUrl: "https://flood-api.open-meteo.com/v1/flood",
  timezone: "Africa/Douala",
};

export function twilioConfig() {
  const sid = env("TWILIO_ACCOUNT_SID");
  const token = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_PHONE_NUMBER");
  return sid && token && from ? { sid, token, from } : null;
}

export function gatewayApiConfig() {
  const token = env("GATEWAYAPI_TOKEN");
  const sender = env("GATEWAYAPI_SENDER") ?? "SentinelCM";
  return token ? { token, sender } : null;
}

export function africasTalkingConfig() {
  const key = env("AFRICASTALKING_API_KEY");
  const username = env("AFRICASTALKING_USERNAME");
  const sender = env("AFRICASTALKING_SENDER");
  return key && username ? { key, username, sender } : null;
}

/** Picks the transport: explicit SMS_PROVIDER wins, otherwise first configured one. */
export function resolveSmsProvider(): SmsProviderName {
  const preferred = env("SMS_PROVIDER")?.toLowerCase() as SmsProviderName | undefined;
  const available: SmsProviderName[] = [];
  if (gatewayApiConfig()) available.push("gatewayapi");
  if (africasTalkingConfig()) available.push("africastalking");
  if (twilioConfig()) available.push("twilio");
  if (preferred && preferred !== "simulated" && available.includes(preferred)) return preferred;
  return available[0] ?? "simulated";
}

/** Cameroon numbers to E.164: 6XXXXXXXX / 2376XXXXXXXX / +2376XXXXXXXX -> +2376XXXXXXXX */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("237")) return `+${digits}`;
  if (digits.length === 9) return `+237${digits}`;
  return `+${digits}`;
}
