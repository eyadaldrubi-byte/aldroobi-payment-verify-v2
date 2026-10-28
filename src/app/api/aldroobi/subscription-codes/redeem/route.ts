import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, getSessionUser } from "@/lib/aldroobi-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const [user, token] = await Promise.all([getSessionUser(), getSessionToken()]);
  if (!user || !token) return NextResponse.json({ error: "سجّل الدخول أولًا قبل تفعيل الاشتراك." }, { status: 401 });
  if (user.app_metadata?.role === "admin") return NextResponse.json({ error: "رمز الاشتراك يُفعّل من حساب المحل، وليس من حساب المدير." }, { status: 403 });
  const base = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return NextResponse.json({ error: "خدمة تفعيل الاشتراك غير مهيأة على الخادم." }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "أدخل رمز الاشتراك." }, { status: 400 }); }
  try {
    const response = await fetch(`${base}/functions/v1/aldroobi-redeem-subscription-code`, {
      method: "POST", cache: "no-store",
      headers: { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code: body.code }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: typeof data.error === "string" ? data.error : "تعذر تفعيل الاشتراك." }, { status: response.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "تعذر الاتصال بخدمة الاشتراكات." }, { status: 503 });
  }
}
