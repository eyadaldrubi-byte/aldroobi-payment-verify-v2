import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const match = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) return json(401, { error: "يجب تسجيل الدخول أولاً" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("Missing required Supabase function environment configuration");
    return json(503, { error: "إعدادات خدمة الدعوات غير مكتملة" });
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${match[1]}` },
  });
  if (!userResponse.ok) return json(401, { error: "انتهت الجلسة، سجّل الدخول مجدداً" });
  const actor = await userResponse.json();
  if (actor?.app_metadata?.role !== "admin") return json(403, { error: "هذه العملية مخصصة للمدير" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "بيانات الطلب غير صحيحة" }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const shopId = typeof body.shop_id === "string" ? body.shop_id : "";
  const role = typeof body.role === "string" ? body.role : "staff";
  const displayName = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 120) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shopId) || !["owner", "manager", "staff"].includes(role)) {
    return json(400, { error: "تحقق من البريد الإلكتروني والمحل والدور" });
  }

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const shopResponse = await fetch(`${supabaseUrl}/rest/v1/exchange_shops?id=eq.${encodeURIComponent(shopId)}&select=id,status&limit=1`, { headers });
  const shops = await shopResponse.json().catch(() => []);
  if (!shopResponse.ok || !Array.isArray(shops) || !shops.length) return json(404, { error: "المحل غير موجود" });
  if (shops[0].status === "closed") return json(409, { error: "لا يمكن دعوة مستخدم إلى محل مغلق" });

  const appUrl = (Deno.env.get("ALDROOBI_APP_URL") ?? "https://aldroobi-v2-test.eyadaldroubi.blitz.cloud").replace(/\/$/, "");
  let redirectTo: string;
  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new Error("invalid scheme");
    redirectTo = new URL("/aldroobi/login", parsed.origin).toString();
  } catch {
    console.error("Invalid ALDROOBI_APP_URL configuration");
    return json(503, { error: "إعداد رابط إكمال الدعوة غير صحيح" });
  }

  const inviteUrl = new URL(`${supabaseUrl}/auth/v1/invite`);
  inviteUrl.searchParams.set("email", email);
  inviteUrl.searchParams.set("redirect_to", redirectTo);
  const inviteResponse = await fetch(inviteUrl.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify({ data: { display_name: displayName } }),
  });
  const invited = await inviteResponse.json().catch(() => ({}));
  if (!inviteResponse.ok) {
    const message = typeof invited.msg === "string" ? invited.msg : typeof invited.message === "string" ? invited.message : "";
    if (inviteResponse.status === 422 || /already|registered|exists/i.test(message)) return json(409, { error: "هذا البريد مسجل مسبقاً. استخدم بريداً جديداً أو اربط الحساب الموجود من إجراء إداري آمن." });
    console.error("Invite request failed", inviteResponse.status);
    return json(502, { error: "تعذر إرسال دعوة الحساب" });
  }
  const userId = invited.id;
  if (typeof userId !== "string") {
    console.error("Invite response did not contain a user id");
    return json(502, { error: "لم يُرجع نظام الدعوات معرّف الحساب؛ تحقق من مستخدمي Auth قبل إعادة المحاولة" });
  }

  const membershipResponse = await fetch(`${supabaseUrl}/rest/v1/shop_memberships`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ shop_id: shopId, user_id: userId, role, status: "invited" }),
  });
  if (!membershipResponse.ok) {
    console.error("Membership insert failed after invitation", membershipResponse.status, await membershipResponse.text().catch(() => ""));
    return json(502, { error: "تعذرت إضافة العضوية بعد الدعوة. لا تعِد المحاولة مباشرة؛ تحقق من المستخدم والعضويات أولاً." });
  }

  const auditResponse = await fetch(`${supabaseUrl}/rest/v1/aldroobi_operation_logs`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({
      actor_user_id: actor.id, shop_id: shopId, action: "shop_member.invited",
      entity_type: "shop_membership", entity_id: userId, outcome: "success",
      details: { email, role, membership_status: "invited" },
    }),
  });
  return json(201, { ok: true, email, role, membershipCreated: true, auditRecorded: auditResponse.ok });
});