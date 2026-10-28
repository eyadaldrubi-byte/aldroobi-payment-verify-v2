import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const authorization = req.headers.get("Authorization") ?? "";
  if (!base || !service || !anon || !authorization.startsWith("Bearer ")) return json({ error: "Function configuration or authorization missing" }, 503);
  try {
    const callerResponse = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: authorization } });
    const caller = await callerResponse.json().catch(() => ({}));
    if (!callerResponse.ok || !caller.id) return json({ error: "Sign in before activating the subscription." }, 401);
    if (caller.app_metadata?.role === "admin") return json({ error: "Activate the code from the shop account, not the admin account." }, 403);
    const body = await req.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!/^ALD-[A-F0-9]{6}-[A-F0-9]{8}-[A-F0-9]{6}$/.test(code)) return json({ error: "Subscription code format is invalid." }, 400);
    const serviceHeaders = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
    const redemption = await fetch(`${base}/rest/v1/rpc/aldroobi_redeem_subscription_code`, { method: "POST", headers: serviceHeaders, body: JSON.stringify({ p_code_hash: await sha256(code), p_user_id: caller.id }) });
    const result = await redemption.json().catch(() => ({}));
    if (!redemption.ok) return json({ error: "Subscription activation service failed. Confirm database migrations." }, 502);
    if (result?.ok === true) return json({ ok: true, message: "تم تفعيل الاشتراك بنجاح." });
    if (result?.reason === "wrong_account") return json({ error: "هذا الرمز غير مخصص للمحل المرتبط بهذا الحساب." }, 403);
    if (result?.reason === "already_active") return json({ error: "الاشتراك نشط بالفعل؛ استخدم رمز التجديد بدل رمز التفعيل." }, 409);
    if (result?.reason === "unavailable") return json({ error: "الرمز مستخدم سابقًا أو منتهي الصلاحية أو غير صحيح." }, 409);
    return json({ error: "تعذر تفعيل الرمز." }, 400);
  } catch { return json({ error: "Subscription activation service is unavailable." }, 503); }
});
