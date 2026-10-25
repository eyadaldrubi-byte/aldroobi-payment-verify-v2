"use client";

import { useEffect, useState } from "react";

type Shop = { id: string; name: string; slug: string; status: string; contact_name: string | null; phone: string | null; country_code: string; created_at: string };
const statusLabel: Record<string,string> = { active: "نشط", pending: "بانتظار التفعيل", suspended: "موقوف", closed: "مغلق" };

export default function AldroobiDashboardPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/aldroobi/shops", { cache: "no-store" })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "تعذر تحميل البيانات"); setShops(d.shops ?? []); })
      .catch(e => setError(e instanceof Error ? e.message : "حدث خطأ"))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/aldroobi/auth/logout", { method: "POST" });
    window.location.assign("/aldroobi/login");
  }

  return <main dir="rtl" lang="ar" className="min-h-screen px-4 py-8" style={{ background: "var(--bg)", color: "var(--ink)" }}>
    <div className="mx-auto max-w-5xl">
      <header className="flex items-center justify-between gap-4 border-b pb-5" style={{ borderColor: "var(--border)" }}>
        <div><p className="text-sm" style={{ color: "var(--ink-2)" }}>الدروبي للصرافة والتحويلات المالية</p><h1 className="mt-1 text-2xl font-bold">لوحة المدير</h1></div>
        <button onClick={logout} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--border)" }}>تسجيل الخروج</button>
      </header>
      <section className="mt-8 rounded-2xl border p-5 sm:p-7" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">محلات الصرافة</h2><p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>بيانات مباشرة من قاعدة البيانات</p></div><span className="rounded-full px-3 py-1 text-sm" style={{ background: "var(--green-light)", color: "var(--green-dark)" }}>{shops.length} محل</span></div>
        {loading && <p className="py-8 text-center">جارٍ تحميل البيانات...</p>}
        {error && <div role="alert" className="mt-5 rounded-lg p-4 text-sm" style={{ background: "var(--red-light)", color: "var(--red-text)" }}>{error}<p className="mt-2">تأكد من إعداد Supabase وصلاحية المدير وسياسات الوصول RLS.</p></div>}
        {!loading && !error && shops.length === 0 && <p className="py-10 text-center text-sm" style={{ color: "var(--ink-2)" }}>لا توجد محلات ظاهرة لهذا الحساب.</p>}
        {shops.length > 0 && <div className="mt-5 overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr style={{ background: "var(--surface-alt)" }}><th className="p-3">المحل</th><th className="p-3">المعرّف</th><th className="p-3">جهة الاتصال</th><th className="p-3">الحالة</th></tr></thead><tbody>{shops.map(s=><tr key={s.id} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-3 font-medium">{s.name}</td><td className="p-3">{s.slug}</td><td className="p-3">{s.contact_name || "—"}{s.phone ? ` · ${s.phone}` : ""}</td><td className="p-3">{statusLabel[s.status] || s.status}</td></tr>)}</tbody></table></div>}
      </section>
      <p className="mt-5 text-xs leading-6" style={{ color: "var(--ink-3)" }}>تُعرض المحلات من قاعدة البيانات. إدارة الاشتراكات وسجل التحقق ستظهر بعد ربط الصلاحيات وسياسات الوصول المناسبة.</p>
    </div>
  </main>;
}
