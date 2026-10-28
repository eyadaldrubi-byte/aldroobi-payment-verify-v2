import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, getSessionUser } from "@/lib/aldroobi-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const [admin, token] = await Promise.all([getSessionUser(), getSessionToken()]);
  if (!admin || !token) return NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 });
  if (admin.app_metadata?.role !== "admin") return NextResponse.json({ error: "هذه العملية مخصصة للمدير" }, { status: 403 });

  const base = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !anon || !service) return NextResponse.json({ error: "يلزم إعداد SUPABASE_SERVICE_ROLE_KEY على الخادم لإنشاء الحسابات." }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "بيانات الطلب غير صحيحة" }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const shopId = typeof body.shop_id === "string" ? body.shop_id : "";
  const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
  const role = body.role === "owner" ? "owner" : "staff";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128 || !/^[0-9a-f-]{36}$/i.test(shopId) || displayName.length < 2 || displayName.length > 120) {
    return NextResponse.json({ error: "أدخل بريدًا صحيحًا، وكلمة مرور من 10 أحرف على الأقل، واسمًا ومحلًا صحيحين." }, { status: 400 });
  }

  const headers = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
  try {
    const shopResponse = await fetch(`${base}/rest/v1/exchange_shops?id=eq.${encodeURIComponent(shopId)}&select=id,status`, { cache: "no-store", headers });
    const shops = await shopResponse.json().catch(() => []);
    if (!shopResponse.ok || !Array.isArray(shops) || !shops.length) return NextResponse.json({ error: "المحل غير موجود." }, { status: 404 });
    if (shops[0].status === "closed") return NextResponse.json({ error: "لا يمكن إنشاء حساب لمحل مغلق." }, { status: 409 });

    const created = await fetch(`${base}/auth/v1/admin/users`, {
      method: "POST", cache: "no-store", headers,
      body: JSON.stringify({ email, password, email_confirm: true, app_metadata: { role: "shop" }, user_metadata: { display_name: displayName } }),
    });
    const user = await created.json().catch(() => ({}));
    if (!created.ok || typeof user.id !== "string") return NextResponse.json({ error: created.status === 422 ? "البريد مستخدم مسبقًا أو كلمة المرور غير مقبولة." : "تعذر إنشاء حساب المستخدم." }, { status: created.status === 422 ? 409 : 502 });

    const membership = await fetch(`${base}/rest/v1/shop_memberships`, {
      method: "POST", cache: "no-store", headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ shop_id: shopId, user_id: user.id, role, status: "active" }),
    });
    if (!membership.ok) {
      await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE", cache: "no-store", headers });
      return NextResponse.json({ error: "تعذر ربط الحساب بالمحل؛ لم يُحتفظ بالحساب غير المرتبط." }, { status: 502 });
    }

    await fetch(`${base}/rest/v1/aldroodi_operation_logs`, {
      method: "POST", cache: "no-store", headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ shop_id: shopId, actor_user_id: admin.id, action: "shop.account_created", entity_type: "shop_member", entity_id: user.id, outcome: "success", details: { email, role } }),
    }).catch(() => null);
    return NextResponse.json({ ok: true, user: { id: user.id, email, display_name: displayName }, message: "تم إنشاء الحساب وربطه بالمحل. أعطِ العميل بيانات الدخول ورمز الاشتراك بشكل آمن." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "تعذر الاتصال بخدمة الحسابات." }, { status: 503 });
  }
}
