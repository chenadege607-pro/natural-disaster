export type MysqlUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

type ApiResponse<T> = { data: T };

const tokenKey = "sentinelcm_mysql_token";

function apiUrl(resource: string): string {
  const base = import.meta.env["VITE_MYSQL_API_URL"] as string | undefined;
  if (!base) throw new Error("VITE_MYSQL_API_URL is not configured");
  const url = new URL(base, window.location.origin);
  url.searchParams.set("resource", resource);
  return url.toString();
}

export function getMysqlToken(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(tokenKey);
}

function setMysqlToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(tokenKey, token);
  else window.localStorage.removeItem(tokenKey);
}

async function request<T>(resource: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = getMysqlToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(apiUrl(resource), { ...init, headers });
  const payload = (await response.json()) as { data?: T; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "MySQL API request failed");
  return payload.data as T;
}

export async function mysqlSignUp(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<MysqlUser> {
  const result = await request<{ user: MysqlUser; token: string }>("auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setMysqlToken(result.token);
  return result.user;
}

export async function mysqlSignIn(input: {
  email: string;
  password: string;
}): Promise<MysqlUser> {
  const result = await request<{ user: MysqlUser; token: string }>("auth/signin", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setMysqlToken(result.token);
  return result.user;
}

export async function mysqlSignOut(): Promise<void> {
  try {
    await request("auth/signout", { method: "POST" });
  } finally {
    setMysqlToken(null);
  }
}

export async function mysqlSession(): Promise<MysqlUser | null> {
  if (!getMysqlToken()) return null;
  try {
    return await request<MysqlUser>("auth/session");
  } catch {
    setMysqlToken(null);
    return null;
  }
}

export const mysqlApi = {
  get: <T>(resource: string) => request<T>(resource),
  post: <T>(resource: string, body: unknown) =>
    request<T>(resource, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(resource: string, body: unknown) =>
    request<T>(resource, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(resource: string) => request<T>(resource, { method: "DELETE" }),
};

export type MysqlApiEnvelope<T> = ApiResponse<T>;
