"use client";
import { useEffect, useState } from "react";

type Subscription = { id: string; shop_id: string; plan_code: string; status: string; ends_at: string | null; exchange_shops: { name: string } | { name: string }[] | null };
type Code = { id: string; shop_id: string; subscription_id: string; code: string | null; code_type: "activation" | "renewal"; status: string; expires_at: string | null; used_at: string | null; created_at: string; decrypt_error?: boolean };
function shopName(s: Subscription) { return Array.isArray(s.exchange_shops) ? s.exchange_shops[0]?.name ?? "محل" : s.exchange_shops?.name ?? "محل"; }

export default function AdminSubscriptionCodes({ subscriptions, onChanged }: { subscriptions: Subscription[]; onChanged: () => void }) {
  const [codes, setCodes] = useState<Code[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    try {
      const r = await fetch("/api/aldroobi/subscription-codes", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "تعذر تحميل الرموز");
      setCodes(d.codes ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تحميل الرموز"); }
  }
  useEffect(() => { void load(); }, []);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage(""); setError("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const r = await fetch("/api/aldroobi/subscription-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "تعذر إنشاء الرمز");
      setMessage("تم إنشاء الرمز. يمكنك نسخه وإعطاؤه للعميل، وسيبقى محفوظًا في سجل المدير.");
      form.reset();
      await load();
      onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر إنشاء الرمز"); }
    finally { setBusy(false); }
  }
  async function copy(code: string | null) {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setMessage("تم نسخ الرمز."); }
    catch { setMessage("تعذر النسخ التلقائي. حدّد الرمز وانسخه يدويًا."); }
  }
  const cls = "mt-1 w-full rounded-lg border px-3 py-2 text-sm";
  return <section className="mt-7 rounded-2xl border p-5 sm:p-6">
    <h2 className="text-lg font-bold">رموز الاشتراك والتجديد</h2>
    <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>تظل الرموز قابلة للاسترجاع من لوحة المدير. لا تشاركها إلا مع صاحب المحل المعني.</p>
    <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="block text-sm">الاشتراك<select name="subscription_id" required className={cls}><option value="">اختر الاشتراك</option>{subscriptions.map(s => <option key={s.id} value={s.id}>{shopName(s)} · {s.plan_code} · {s.status}</option>)}</select></label>
      <label className="block text-sm">نوع الرمز<select name="code_type" required className={cls}><option value="activation">تفعيل</option><option value="renewal">تجديد</option></select></label>
      <label className="block text-sm">مدة الاشتراك بالأيام<input name="duration_days" type="number" min="1" max="3660" defaultValue="30" required className={cls}/></label><label className="block text-sm">انتهاء صلاحية الرمز (اختياري)<input name="expires_at" type="date" className={cls}/></label>
      <div className="sm:col-span-3"><button disabled={busy || !subscriptions.length} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{busy ? "جارٍ إنشاء الرمز..." : "إنشاء رمز جديد"}</button></div>
    </form>
    {message && <p role="status" className="mt-3 rounded-lg border p-3 text-sm">{message}</p>}
    {error && <p role="alert" className="mt-3 rounded-lg border p-3 text-sm">{error}</p>}
    <div className="mt-5 overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr style={{ background: "var(--surface-alt)" }}><th className="p-3">الرمز</th><th className="p-3">النوع</th><th className="p-3">الحالة</th><th className="p-3">تاريخ الإنشاء</th><th className="p-3">الصلاحية</th><th className="p-3">نسخ</th></tr></thead><tbody>{codes.map(c => <tr key={c.id} className="border-t" style={{ borderColor: "var(--border)" }}><td className="p-3 font-mono" dir="ltr">{c.code ?? (c.decrypt_error ? "تعذّر فك التشفير" : "—")}</td><td className="p-3">{c.code_type === "activation" ? "تفعيل" : "تجديد"}</td><td className="p-3">{c.status === "unused" ? "غير مستخدم" : c.status === "used" ? "مستخدم" : c.status}</td><td className="p-3 whitespace-nowrap">{new Date(c.created_at).toLocaleString("ar")}</td><td className="p-3">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("ar") : "بدون انتهاء"}</td><td className="p-3"><button type="button" onClick={() => void copy(c.code)} disabled={!c.code} className="rounded-lg border px-3 py-1 disabled:opacity-50">نسخ الرمز</button></td></tr>)}</tbody></table></div>
  </section>;
}
