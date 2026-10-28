import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return response({ error: "إعدادات خدمة الدعوات غير مكتملة." }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return response({ error: "يلزم تسجيل الدخول." }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser(token);
  if (callerError || !caller) return response({ error: "جلسة الدخول غير صالحة." }, 401);
  if (caller.app_metadata?.role !== "admin") {
    return response({ error: "هذه العملية مخصصة للمدير." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    body = parsed as Record<string, unknown>;
  } catch {
    return response({ error: "بيانات الطلب غير صحيحة." }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const shopId = typeof body.shop_id === "string" ? body.shop_id : "";
  const role = typeof body.role === "string" ? body.role : "staff";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !/^[0-9a-f-]{36}$/i.test(shopId) || !["owner", "manager", "staff"].includes(role)) {
    return response({ error: "تحقق من البريد الإلكتروني والمحل والصلاحية." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: shop, error: shopError } = await admin
    .from("exchange_shops").select("id,name,status").eq("id", shopId).maybeSingle();
  if (shopError) return response({ error: "تعذر التحقق من المحل." }, 500);
  if (!shop) return response({ error: "المحل المحدد غير موجود." }, 404);
  if (shop.status === "closed" || shop.status === "suspended") {
    return response({ error: "لا يمكن دعوة مستخدم إلى محل مغلق أو موقوف." }, 409);
  }

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { display_name: email.split("@")[0] },
    app_metadata: { role: "shop_user" },
  });
  if (inviteError || !inviteData.user) {
    const duplicate = inviteError?.message.toLowerCase().includes("already");
    return response({ error: duplicate ? "هذا البريد مسجل مسبقًا؛ لا يمكن إنشاء عضوية جديدة تلقائيًا." : "تعذر إرسال دعوة الحساب. تحقق من إعدادات البريد الإلكتروني في Supabase." }, duplicate ? 409 : 502);
  }

  const invitedUser = inviteData.user;
  const { data: membership, error: membershipError } = await admin
    .from("shop_memberships")
    .insert({ shop_id: shopId, user_id: invitedUser.id, role, status: "invited" })
    .select("id,shop_id,user_id,role,status,created_at").single();

  if (membershipError || !membership) {
    // Avoid leaving an invited account without the intended tenant membership.
    await admin.auth.admin.deleteUser(invitedUser.id);
    return response({ error: "تعذر إنشاء عضوية المحل؛ أُلغيت الدعوة الجديدة." }, 500);
  }

  const { error: auditError } = await admin.from("aldroobi_operation_logs").insert({
    actor_user_id: caller.id,
    shop_id: shopId,
    action: "shop.user_invited",
    entity_type: "shop_membership",
    entity_id: membership.id,
    outcome: "success",
    details: { invited_email: email, role, shop_name: shop.name },
  });

  return response({
    ok: true,
    invited: true,
    membership,
    auditRecorded: !auditError,
    message: "تم إنشاء الدعوة. يجب على المستخدم إكمال التسجيل من رسالة البريد الإلكتروني.",
  }, 201);
});
