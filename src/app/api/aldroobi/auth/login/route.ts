import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, supabaseAuth } from "@/lib/aldroobi-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "بيانات الطلب غير صحيحة" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "أدخل البريد وكلمة المرور" }, { status: 400 });
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string" || email.length > 254 || password.length < 8 || password.length > 256) {
    return NextResponse.json({ error: "البريد أو كلمة المرور غير صحيحة" }, { status: 400 });
  }
  try {
    const auth = await supabaseAuth("token?grant_type=password", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) });
    const data = await auth.json().catch(() => ({}));
    if (!auth.ok || typeof data.access_token !== "string") return NextResponse.json({ error: "تعذر تسجيل الدخول. تحقق من البيانات." }, { status: 401 });
    const role = data.user?.app_metadata?.role === "admin" ? "admin" : "shop";
    const response = NextResponse.json({ ok: true, user: { id: data.user?.id, email: data.user?.email, role } });
    setSessionCookie(response, data.access_token, Math.min(Number(data.expires_in) || 3600, 3600));
    return response;
  } catch {
    return NextResponse.json({ error: "خدمة تسجيل الدخول غير مهيأة على الخادم" }, { status: 503 });
  }
}
