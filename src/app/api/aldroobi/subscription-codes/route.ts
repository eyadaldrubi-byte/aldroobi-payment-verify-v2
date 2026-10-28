import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, getSessionUser } from "@/lib/aldroobi-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function configuration() {
  const base = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rawKey = process.env.SUBSCRIPTION_CODE_ENCRYPTION_KEY;
  if (!base || !serviceKey || !rawKey) throw new Error("Missing server-side subscription code configuration");
  const key = Buffer.from(rawKey, "base64");
  if (key.length !== 32) throw new Error("SUBSCRIPTION_CODE_ENCRYPTION_KEY must be base64 for exactly 32 bytes");
  return { base, serviceKey, key };
}
function encrypt(value: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}
function decrypt(value: string, key: Buffer) {
  const [iv, tag, ciphertext] = value.split(".");
  if (!iv || !tag || !ciphertext) throw new Error("Invalid encrypted code record");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}
async function adminContext() {
  const [user, token] = await Promise.all([getSessionUser(), getSessionToken()]);
  if (!user || !token) return { response: NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 }) };
  if (user.app_metadata?.role !== "admin") return { response: NextResponse.json({ error: "هذه العملية مخصصة للمدير" }, { status: 403 }) };
  try { return { user, ...configuration() }; }
  catch { return { response: NextResponse.json({ error: "إعدادات رموز الاشتراك غير مكتملة على الخادم" }, { status: 503 }) }; }
}
async function request(base: string, key: string, path: string, init: RequestInit = {}) {
  return fetch(`${base}/rest/v1/${path}`, {
    ...init, cache: "no-store",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

export async function GET() {
  const c = await adminContext();
  if ("response" in c) return c.response;
  try {
    const r = await request(c.base, c.serviceKey, "subscription_codes?select=id,shop_id,subscription_id,encrypted_code,code_type,status,expires_at,used_at,created_at,duration_days,exchange_shops(name),shop_subscriptions(plan_code)&order=created_at.desc");
    if (!r.ok) return NextResponse.json({ error: "تعذر تحميل الرموز. تأكد من تطبيق migration قاعدة البيانات." }, { status: 502 });
    const rows = await r.json();
    const codes = rows.map((row: Record<string, unknown>) => {
      try { return { ...row, code: decrypt(String(row.encrypted_code), c.key), encrypted_code: undefined }; }
      catch { return { ...row, code: null, encrypted_code: undefined, decrypt_error: true }; }
    });
    return NextResponse.json({ codes });
  } catch { return NextResponse.json({ error: "تعذر الاتصال بقاعدة البيانات" }, { status: 503 }); }
}

export async function POST(req: NextRequest) {
  const c = await adminContext();
  if ("response" in c) return c.response;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "بيانات الطلب غير صحيحة" }, { status: 400 }); }
  const subscriptionId = typeof body.subscription_id === "string" ? body.subscription_id : "";
  const codeType = body.code_type === "renewal" ? "renewal" : body.code_type === "activation" ? "activation" : "";
  const expiresAt = typeof body.expires_at === "string" && body.expires_at ? body.expires_at : null;
  const durationDays = Number(body.duration_days ?? 30);
  if (!/^[0-9a-f-]{36}$/i.test(subscriptionId) || !codeType || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3660 || (expiresAt && !Number.isFinite(Date.parse(expiresAt)))) {
    return NextResponse.json({ error: "حدد اشتراكًا صحيحًا ونوع الرمز وتاريخ انتهاء صالحًا." }, { status: 400 });
  }
  try {
    const subResponse = await request(c.base, c.serviceKey, `shop_subscriptions?id=eq.${encodeURIComponent(subscriptionId)}&select=id,shop_id,status,ends_at`);
    const subs = await subResponse.json().catch(() => []);
    if (!subResponse.ok || !Array.isArray(subs)) return NextResponse.json({ error: "تعذر التحقق من الاشتراك." }, { status: 502 });
    if (!subs.length) return NextResponse.json({ error: "الاشتراك غير موجود." }, { status: 404 });
    if (expiresAt && Date.parse(expiresAt) <= Date.now()) return NextResponse.json({ error: "تاريخ انتهاء الرمز يجب أن يكون في المستقبل." }, { status: 400 });

    const code = `ALD-${randomBytes(3).toString("hex").toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const codeHash = createHash("sha256").update(code).digest("hex");
    const inserted = await request(c.base, c.serviceKey, "subscription_codes", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ shop_id: subs[0].shop_id, subscription_id: subscriptionId, code_hash: codeHash, encrypted_code: encrypt(code, c.key), code_type: codeType, duration_days: durationDays, status: "unused", expires_at: expiresAt, created_by: c.user.id }),
    });
    const result = await inserted.json().catch(() => ({}));
    if (!inserted.ok) return NextResponse.json({ error: "تعذر حفظ الرمز. تحقق من migration وصلاحيات قاعدة البيانات." }, { status: 502 });
    const row = Array.isArray(result) ? result[0] : result;
    const auditResponse = await request(c.base, c.serviceKey, "aldroodi_operation_logs", {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ shop_id: subs[0].shop_id, actor_user_id: c.user.id, action: "subscription_code.created", entity_type: "subscription_code", entity_id: row?.id ?? null, outcome: "success", details: { code_type: codeType, duration_days: durationDays, expires_at: expiresAt } }),
    }).catch(() => null);
    return NextResponse.json({ code, auditRecorded: Boolean(auditResponse?.ok), code_record: { id: row?.id, shop_id: row?.shop_id, subscription_id: row?.subscription_id, code_type: row?.code_type, duration_days: row?.duration_days, status: row?.status, expires_at: row?.expires_at, created_at: row?.created_at } }, { status: 201 });
  } catch { return NextResponse.json({ error: "تعذر إنشاء رمز الاشتراك" }, { status: 503 }); }
}
