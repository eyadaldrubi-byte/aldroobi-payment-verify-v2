"use client";

import { useState, type FormEvent } from "react";

export default function AldroobiLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/aldroobi/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "تعذر تسجيل الدخول"); return; }
      window.location.assign("/aldroobi/dashboard");
    } catch { setError("تعذر الاتصال بالخادم. حاول مرة أخرى."); }
    finally { setBusy(false); }
  }

  return <main dir="rtl" lang="ar" className="min-h-screen px-4 py-12" style={{ background: "var(--bg)", color: "var(--ink)" }}>
    <section className="mx-auto mt-10 max-w-md rounded-2xl border p-6 sm:p-8" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <a href="/aldroobi" className="text-sm" style={{ color: "var(--green-dark)" }}>العودة إلى التحقق</a>
      <h1 className="mt-5 text-2xl font-bold">تسجيل الدخول</h1>
      <p className="mt-2 text-sm leading-7" style={{ color: "var(--ink-2)" }}>بوابة الدروبي للصرافة والتحويلات المالية</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium">البريد الإلكتروني
          <input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }} />
        </label>
        <label className="block text-sm font-medium">كلمة المرور
          <input required minLength={8} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }} />
        </label>
        {error && <p role="alert" className="rounded-lg p-3 text-sm" style={{ background: "var(--red-light)", color: "var(--red-text)" }}>{error}</p>}
        <button disabled={busy} className="w-full rounded-lg px-4 py-3 font-semibold disabled:opacity-60" style={{ background: "var(--green-cta)", color: "var(--green-cta-fg)" }}>{busy ? "جارٍ الدخول..." : "دخول آمن"}</button>
      </form>
      <p className="mt-5 text-xs leading-6" style={{ color: "var(--ink-3)" }}>لا يوجد حساب افتراضي. يجب إنشاء حساب المستخدم من لوحة Supabase الموثوقة أولًا.</p>
    </section>
  </main>;
}
