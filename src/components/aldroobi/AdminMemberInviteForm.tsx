"use client";
import { useState, type FormEvent } from "react";

type Shop = { id: string; name: string; slug: string };
export default function AdminMemberInviteForm({ shops, onChanged }: { shops: Shop[]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setBusy(true); setMessage(""); setIsError(false);
    try {
      const response = await fetch("/api/aldroobi/members", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر إرسال الدعوة");
      setMessage(data.auditRecorded === false ? "أُنشئت العضوية وأُرسلت الدعوة، لكن تعذر تسجيل العملية في سجل الإدارة." : "تم إرسال الدعوة وإنشاء العضوية. على المستخدم فتح بريده لإكمال التسجيل.");
      form.reset();
      window.setTimeout(onChanged, 1200);
    } catch (err) {
      setIsError(true); setMessage(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally { setBusy(false); }
  }

  const input = "mt-1 w-full rounded-lg border px-3 py-2 text-sm";
  return <section className="mt-7 rounded-2xl border p-5 sm:p-6">
    <h2 className="text-lg font-bold">دعوة مستخدم إلى محل</h2>
    <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>يرسل النظام دعوة بالبريد الإلكتروني ويربط الحساب بمحل واحد. لا تُدخل كلمة مرور المستخدم هنا.</p>
    <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">المحل<select name="shop_id" required className={input}><option value="">اختر المحل</option>{shops.filter(s => s.id).map(s => <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>)}</select></label>
      <label className="block text-sm">البريد الإلكتروني<input name="email" type="email" required maxLength={254} autoComplete="email" className={input} placeholder="user@example.com" dir="ltr" /></label>
      <label className="block text-sm">اسم المستخدم<input name="display_name" maxLength={120} className={input} /></label>
      <label className="block text-sm">الدور داخل المحل<select name="role" className={input}><option value="staff">موظف</option><option value="manager">مدير محل</option><option value="owner">مالك المحل</option></select></label>
      <div className="sm:col-span-2"><button disabled={busy || shops.length === 0} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{busy ? "جارٍ إرسال الدعوة..." : "إرسال الدعوة وربط الحساب"}</button></div>
    </form>
    {message && <p role={isError ? "alert" : "status"} className="mt-3 rounded-lg border p-3 text-sm">{message}</p>}
  </section>;
}
