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
    const response = await fetch(`${base.replace(/\/$/, "")}/rest/v1/verification_logs?select=id,shop_id,bank_code,reference_last4,verified,decoded_only,amount_etb,sender_name,receiver_name,result_status,error_code,created_at,exchange_shops(name)&order=created_at.desc&limit=100`, {
      cache: "no-store", headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => []);
    if (!response.ok) return NextResponse.json({ error: "تعذر تحميل سجل التحقق. تحقق من سياسات RLS." }, { status: 502 });
    return NextResponse.json({ logs: data });
  } catch { return NextResponse.json({ error: "تعذر الاتصال بقاعدة البيانات" }, { status: 503 }); }
}
