import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
export const SESSION_COOKIE = "aldroobi_session";
export async function supabaseAuth(path: string, init: RequestInit = {}) {
  if (!URL || !ANON) throw new Error("Supabase Auth is not configured");
  return fetch(`${URL.replace(/\/$/, "")}/auth/v1/${path.replace(/^\//, "")}`, { ...init, cache: "no-store", headers: { apikey: ANON, "Content-Type": "application/json", ...(init.headers ?? {}) } });
}
export async function getSessionToken() { return (await cookies()).get(SESSION_COOKIE)?.value ?? null; }
export async function getSessionUser() {
  const token = await getSessionToken();
  if (!token) return null;
  const response = await supabaseAuth("user", { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  return (await response.json()) as { id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> };
}
export function setSessionCookie(response: NextResponse, token: string, maxAge: number) {
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge });
}
