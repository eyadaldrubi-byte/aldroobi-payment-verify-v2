import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, getSessionUser } from "@/lib/aldroobi-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const [user, token] = await Promise.all([getSessionUser(), getSessionToken()]);
  if (!user || !token) return NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 });
  if (user.app_metadata?.role !== "admin") return NextResponse.json({ error: "هذه العملية مخصصة للمدير" }, { status: 403 });

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return NextResponse.json({ error: "إعدادات قاعدة البيانات غير مكتملة" }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "بيانات الطلب غير صحيحة" }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const shop_id = typeof body.shop_id === "string" ? body.shop_id : "";
  const role = typeof body.role === "string" ? body.role : "staff";
  const display_name = typeof body.display_name === "string" ? body.display_name.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[0-9a-f-]{36}$/i.test(shop_id) || !["owner", "manager", "staff"].includes(role) || display_name.length > 120) {
    return NextResponse.json({ error: "تحقق من البريد الإلكتروني والمحل والدور والاسم" }, { status: 400 });
  }

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/functions/v1/aldroobi-invite-shop-member`, {
      method: "POST",
      cache: "no-store",
      headers: { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, shop_id, role, display_name }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: typeof data.error === "string" ? data.error : "تعذر إرسال دعوة الحساب" }, { status: response.status });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "تعذر الاتصال بخدمة الدعوات" }, { status: 503 });
  }
}
