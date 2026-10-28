import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const authorization = req.headers.get("Authorization") ?? "";
  if (!base || !service || !anon || !authorization.startsWith("Bearer ")) return json({ error: "Function configuration or authorization missing" }, 503);
  const headers = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
  try {
    const callerResponse = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: authorization } });
    const caller = await callerResponse.json().catch(() => ({}));
    if (!callerResponse.ok || !caller.id) return json({ error: "Authentication required" }, 401);
    if (caller.app_metadata?.role !== "admin") return json({ error: "Admin access required" }, 403);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const shopId = typeof body.shop_id === "string" ? body.shop_id : "";
    const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
    const role = body.role === "owner" ? "owner" : "staff";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128 || !/^[0-9a-f-]{36}$/i.test(shopId) || displayName.length < 2 || displayName.length > 120) return json({ error: "Enter a valid email, password, name, and shop." }, 400);
    const shopResponse = await fetch(`${base}/rest/v1/exchange_shops?id=eq.${encodeURIComponent(shopId)}&select=id,status`, { headers });
    const shops = await shopResponse.json().catch(() => []);
    if (!shopResponse.ok || !Array.isArray(shops) || !shops.length) return json({ error: "Shop not found." }, 404);
    if (shops[0].status === "closed") return json({ error: "Cannot create an account for a closed shop." }, 409);
    const createResponse = await fetch(`${base}/auth/v1/admin/users`, { method: "POST", headers, body: JSON.stringify({ email, password, email_confirm: true, app_metadata: { role: "shop" }, user_metadata: { display_name: displayName } }) });
    const createdUser = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok || typeof createdUser.id !== "string") return json({ error: createResponse.status === 422 ? "Email already in use or password rejected." : "Could not create user." }, createResponse.status === 422 ? 409 : 502);
    const membershipResponse = await fetch(`${base}/rest/v1/shop_memberships`, { method: "POST", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ shop_id: shopId, user_id: createdUser.id, role, status: "active" }) });
    if (!membershipResponse.ok) {
      await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(createdUser.id)}`, { method: "DELETE", headers });
      return json({ error: "Could not attach account to shop; unlinked user was removed." }, 502);
    }
    await fetch(`${base}/rest/v1/aldroodi_operation_logs`, { method: "POST", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ shop_id: shopId, actor_user_id: caller.id, action: "shop.account_created", entity_type: "shop_member", entity_id: createdUser.id, outcome: "success", details: { email, role } }) }).catch(() => null);
    return json({ ok: true, user: { id: createdUser.id, email, display_name: displayName }, message: "Account created and linked to the shop." }, 201);
  } catch { return json({ error: "Account service could not reach Supabase." }, 503); }
});
