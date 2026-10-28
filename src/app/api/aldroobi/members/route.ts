import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, getSessionUser } from "@/lib/aldroobi-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const [admin, token] = await Promise.all([getSessionUser(), getSessionToken()]);
  if (!admin || !token) return NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 });
  if (admin.app_metadata?.role !== "admin") return NextResponse.json({ error: "هذه العملية مخصصة للمدير" }, { status: 403 });
  const base = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return NextResponse.json({ error: "إعدادات Supabase غير مكتملة" }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "بيانات الطلب غير صحيحة" }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const shop_id = typeof body.shop_id === "string" ? body.shop_id : "";
  const display_name = typeof body.display_name === "string" ? body.display_name.trim() : "";
  const role = body.role === "owner" ? "owner" : "staff";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128 || !/^[0-9a-f-]{36}$/i.test(shop_id) || display_name.length < 2 || display_name.length > 120) {
    return NextResponse.json({ error: "أدخل بريدًا صحيحًا وكلمة مرور من 10 أحرف على الأقل واسمًا ومحلًا صحيحين." }, { status: 400 });
  }

  try {
    const response = await fetch(`${base}/functions/v1/aldroobi-create-shop-account`, {
      method: "POST", cache: "no-store",
      headers: { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, shop_id, display_name, role }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: typeof data.error === "string" ? data.error : "تعذر إنشاء الحساب." }, { status: response.status });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "تعذر الاتصال بخدمة إنشاء الحساب." }, { status: 503 });
  }
}
