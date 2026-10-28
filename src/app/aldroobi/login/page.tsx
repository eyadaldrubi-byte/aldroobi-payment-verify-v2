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
      if (!response.ok) { setError(data.error || "Unable to sign in"); return; }
      window.location.assign(data.user?.role === "admin" ? "/aldroobi/dashboard" : "/aldroobi/activate");
    } catch { setError("Server connection failed. Please try again."); }
    finally { setBusy(false); }
  }

  return <main dir="ltr" lang="en" className="min-h-screen px-4 py-12" style={{ background: "var(--bg)", color: "var(--ink)" }}>
    <section className="mx-auto mt-10 max-w-md rounded-2xl border p-6 sm:p-8" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <a href="/aldroobi" className="text-sm" style={{ color: "var(--green-dark)" }}>Back to receipt verification</a>
      <h1 className="mt-5 text-2xl font-bold">Sign in</h1>
      <p className="mt-2 text-sm leading-7" style={{ color: "var(--ink-2)" }}>AL-Droubi for Exchange and Transfer</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium">Email address
          <input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }} />
        </label>
        <label className="block text-sm font-medium">Password
          <input required minLength={8} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }} />
        </label>
        {error && <p role="alert" className="rounded-lg p-3 text-sm" style={{ background: "var(--red-light)", color: "var(--red-text)" }}>{error}</p>}
        <button disabled={busy} className="w-full rounded-lg px-4 py-3 font-semibold disabled:opacity-60" style={{ background: "var(--green-cta)", color: "var(--green-cta-fg)" }}>{busy ? "Signing in…" : "Sign in securely"}</button>
      </form>
      <p className="mt-5 text-xs leading-6" style={{ color: "var(--ink-3)" }}>Your account is created by the AL-Droubi administrator. Use the credentials provided to you.</p>
    </section>
  </main>;
}
