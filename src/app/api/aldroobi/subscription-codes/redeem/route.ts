import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/aldroobi-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولًا قبل تفعيل الاشتراك." }, { status: 401 });
  if (user.app_metadata?.role === "admin") return NextResponse.json({ error: "رمز الاشتراك يُفعّل من حساب المحل، وليس من حساب المدير." }, { status: 403 });
  const base = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !service) return NextResponse.json({ error: "خدمة تفعيل الاشتراك غير مهيأة على الخادم." }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "أدخل رمز الاشتراك." }, { status: 400 }); }
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!/^ALD-[A-F0-9]{6}-[A-F0-9]{8}-[A-F0-9]{6}$/.test(code)) return NextResponse.json({ error: "صيغة رمز الاشتراك غير صحيحة." }, { status: 400 });
  const codeHash = createHash("sha256").update(code).digest("hex");
  try {
    const response = await fetch(`${base}/rest/v1/rpc/aldroobi_redeem_subscription_code`, {
      method: "POST", cache: "no-store",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_code_hash: codeHash, p_user_id: user.id }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: "تعذر تفعيل الرمز. تأكد من تطبيق ترحيل قاعدة البيانات." }, { status: 502 });
    if (data?.ok === true) return NextResponse.json({ ok: true, message: "تم تفعيل الاشتراك بنجاح." });
    if (data?.reason === "wrong_account") return NextResponse.json({ error: "هذا الرمز غير مخصص للمحل المرتبط بهذا الحساب." }, { status: 403 });
    if (data?.reason === "unavailable") return NextResponse.json({ error: "الرمز مستخدم سابقًا أو منتهي الصلاحية أو غير صحيح." }, { status: 409 });
    return NextResponse.json({ error: "تعذر تفعيل الرمز." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "تعذر الاتصال بخدمة الاشتراكات." }, { status: 503 });
  }
}
