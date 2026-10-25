"use client";

import { useEffect, useState } from "react";

type Shop = { id: string; name: string; slug: string; status: string; contact_name: string | null; phone: string | null; country_code: string; created_at: string };
type Subscription = { id: string; shop_id: string; plan_code: string; status: string; starts_at: string; ends_at: string | null; exchange_shops: { name: string; slug: string } | { name: string; slug: string }[] | null };
type VerificationLog = { id: string; shop_id: string; bank_code: string; reference_last4: string | null; verified: boolean; decoded_only: boolean; amount_etb: number | null; sender_name: string | null; receiver_name: string | null; result_status: string; error_code: string | null; created_at: string; exchange_shops: { name: string } | { name: string }[] | null };
const shopStatus: Record<string,string> = { active: "نشط", pending: "بانتظار التفعيل", suspended: "موقوف", closed: "مغلق" };
const subStatus: Record<string,string> = { trial: "تجريبي", active: "نشط", past_due: "متأخر", cancelled: "ملغى", expired: "منتهي" };
const resultStatus: Record<string,string> = { verified: "تم التحقق", decoded_only: "قراءة فقط — غير مؤكد", not_verified: "غير متحقق", error: "خطأ", unknown: "غير معروف" };
function relationName(value: { name: string } | { name: string }[] | null) { return Array.isArray(value) ? value[0]?.name ?? "—" : value?.name ?? "—"; }
function date(value: string | null) { return value ? new Date(value).toLocaleDateString("ar") : "مفتوح"; }

export default function AldroobiDashboardPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/aldroobi/shops", { cache: "no-store" }),
      fetch("/api/aldroobi/subscriptions", { cache: "no-store" }),
      fetch("/api/aldroobi/verification-logs", { cache: "no-store" }),
    ]).then(async responses => {
      const payloads = await Promise.all(responses.map(async r => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "تعذر تحميل بيانات لوحة المدير");
        return d;
      }));
      if (!active) return;
      setShops(payloads[0].shops ?? []);
      setSubscriptions(payloads[1].subscriptions ?? []);
      setLogs(payloads[2].logs ?? []);
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : "حدث خطأ أثناء تحميل البيانات"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function logout() {
    await fetch("/api/aldroobi/auth/logout", { method: "POST" });
    window.location.assign("/aldroobi/login");
  }

  const card = { background: "var(--surface)", borderColor: "var(--border)" } as const;
  return <main dir="rtl" lang="ar" className="min-h-screen px-4 py-8" style={{ background: "var(--bg)", color: "var(--ink)" }}>
    <div className="mx-auto max-w-6xl">
      <header className="flex items-center justify-between gap-4 border-b pb-5" style={{ borderColor: "var(--border)" }}>
        <div><p className="text-sm" style={{ color: "var(--ink-2)" }}>الدروبي للصرافة والتحويلات المالية</p><h1 className="mt-1 text-2xl font-bold">لوحة المدير</h1><p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>إدارة المحلات والاشتراكات ومراجعة عمليات التحقق</p></div>
        <button onClick={logout} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--border)" }}>تسجيل الخروج</button>
      </header>
      {loading && <p className="py-8 text-center">جارٍ تحميل البيانات من قاعدة البيانات...</p>}
      {error && <div role="alert" className="mt-5 rounded-lg p-4 text-sm" style={{ background: "var(--red-light)", color: "var(--red-text)" }}>{error}<p className="mt-2">تحقق من إعدادات Supabase وصلاحية المدير وسياسات الوصول RLS.</p></div>}
      {!loading && !error && <>
        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          {[["محلات الصرافة", shops.length],["الاشتراكات", subscriptions.length],["عمليات التحقق المعروضة", logs.length]].map(([label,count]) => <div key={label} className="rounded-2xl border p-5" style={card}><p className="text-sm" style={{ color: "var(--ink-2)" }}>{label}</p><p className="mt-2 text-3xl font-bold">{count}</p></div>)}
        </section>
        <section className="mt-7 rounded-2xl border p-5 sm:p-7" style={card}>
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">محلات الصرافة</h2><span className="rounded-full px-3 py-1 text-sm" style={{ background: "var(--green-light)", color: "var(--green-dark)" }}>{shops.length} محل</span></div>
          {shops.length === 0 ? <p className="py-6 text-sm" style={{ color: "var(--ink-2)" }}>لا توجد محلات ظاهرة لهذا الحساب.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr style={{ background: "var(--surface-alt)" }}><th className="p-3">المحل</th><th className="p-3">المعرّف</th><th className="p-3">جهة الاتصال</th><th className="p-3">الحالة</th></tr></thead><tbody>{shops.map(s=><tr key={s.id} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-3 font-medium">{s.name}</td><td className="p-3">{s.slug}</td><td className="p-3">{s.contact_name || "—"}{s.phone ? ` · ${s.phone}` : ""}</td><td className="p-3">{shopStatus[s.status] || s.status}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="mt-7 rounded-2xl border p-5 sm:p-7" style={card}>
          <h2 className="text-lg font-bold">الاشتراكات</h2>
          {subscriptions.length === 0 ? <p className="py-6 text-sm" style={{ color: "var(--ink-2)" }}>لا توجد اشتراكات مسجلة.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr style={{ background: "var(--surface-alt)" }}><th className="p-3">المحل</th><th className="p-3">الخطة</th><th className="p-3">الحالة</th><th className="p-3">البداية</th><th className="p-3">الانتهاء</th></tr></thead><tbody>{subscriptions.map(s=><tr key={s.id} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-3">{relationName(s.exchange_shops)}</td><td className="p-3">{s.plan_code}</td><td className="p-3">{subStatus[s.status] || s.status}</td><td className="p-3">{date(s.starts_at)}</td><td className="p-3">{date(s.ends_at)}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="mt-7 rounded-2xl border p-5 sm:p-7" style={card}>
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">سجل التحقق من الإيصالات</h2><span className="text-sm" style={{ color: "var(--ink-2)" }}>آخر 100 عملية</span></div>
          {logs.length === 0 ? <p className="py-6 text-sm" style={{ color: "var(--ink-2)" }}>لا توجد عمليات تحقق مسجلة حتى الآن.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr style={{ background: "var(--surface-alt)" }}><th className="p-3">التاريخ</th><th className="p-3">المحل</th><th className="p-3">البنك</th><th className="p-3">آخر الأرقام</th><th className="p-3">المبلغ ETB</th><th className="p-3">النتيجة</th></tr></thead><tbody>{logs.map(l=><tr key={l.id} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-3 whitespace-nowrap">{new Date(l.created_at).toLocaleString("ar")}</td><td className="p-3">{relationName(l.exchange_shops)}</td><td className="p-3">{l.bank_code}</td><td className="p-3">{l.reference_last4 ? `•••• ${l.reference_last4}` : "—"}</td><td className="p-3">{l.amount_etb == null ? "—" : Number(l.amount_etb).toLocaleString("ar")}</td><td className="p-3">{resultStatus[l.result_status] || l.result_status}</td></tr>)}</tbody></table></div>}
        </section>
      </>}
      <p className="mt-5 text-xs leading-6" style={{ color: "var(--ink-3)" }}>تُحمّل هذه الأقسام من قاعدة Supabase مباشرة. عمليات التحقق لن تظهر إلا بعد أن يبدأ التطبيق بتسجيل نتائج Cheki في جدول verification_logs.</p>
    </div>
  </main>;
}
