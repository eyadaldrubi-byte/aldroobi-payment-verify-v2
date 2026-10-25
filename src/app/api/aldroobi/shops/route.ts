import { NextResponse } from "next/server";
import { getSessionToken, getSessionUser } from "@/lib/aldroobi-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [user, token] = await Promise.all([getSessionUser(), getSessionToken()]);
  if (!user || !token) return NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 });
  if (user.app_metadata?.role !== "admin") return NextResponse.json({ error: "هذه الصفحة مخصصة للمدير" }, { status: 403 });

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return NextResponse.json({ error: "إعدادات قاعدة البيانات غير مكتملة" }, { status: 503 });

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/rest/v1/exchange_shops?select=id,name,slug,status,contact_name,phone,country_code,created_at&order=created_at.desc`, {
      cache: "no-store",
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => []);
    if (!response.ok) return NextResponse.json({ error: "تعذر قراءة المحلات. تحقق من سياسات RLS." }, { status: 502 });
    return NextResponse.json({ shops: data });
  } catch {
    return NextResponse.json({ error: "تعذر الاتصال بقاعدة البيانات" }, { status: 503 });
  }
}
