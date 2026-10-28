"use client";
import { useState, type FormEvent } from "react";
export default function ActivateSubscriptionPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const r = await fetch("/api/aldroobi/subscription-codes/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to activate subscription");
      setMessage(d.message || "Subscription activated successfully."); setCode("");
    } catch (e) { setError(e instanceof Error ? e.message : "Server connection failed."); }
    finally { setBusy(false); }
  }
  return <main dir="ltr" lang="en" className="min-h-screen px-4 py-12" style={{ background: "var(--bg)", color: "var(--ink)" }}>
    <section className="mx-auto mt-8 max-w-lg rounded-2xl border p-6 sm:p-8" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <a href="/aldroobi" className="text-sm" style={{ color: "var(--green-dark)" }}>Back to receipt verification</a>
      <h1 className="mt-5 text-2xl font-bold">Activate subscription</h1>
      <p className="mt-2 text-sm leading-7" style={{ color: "var(--ink-2)" }}>Sign in first, then enter the subscription code provided by the AL-Droubi administrator. Each code can be used only once.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">Subscription code
          <input required value={code} onChange={e=>setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" placeholder="ALD-XXXXXX-XXXXXXXX-XXXXXX" dir="ltr" className="mt-2 w-full rounded-lg border p-3 font-mono" style={{ borderColor: "var(--border)", background: "var(--bg)" }}/>
        </label>
        {error && <p role="alert" className="rounded-lg p-3 text-sm" style={{ background: "var(--red-light)", color: "var(--red-text)" }}>{error}</p>}
        {message && <p role="status" className="rounded-lg border p-3 text-sm">{message}</p>}
        <button disabled={busy} className="w-full rounded-lg px-4 py-3 font-semibold disabled:opacity-60" style={{ background: "var(--green-cta)", color: "var(--green-cta-fg)" }}>{busy ? "جارٍ Activate subscription..." : "Activate subscription"}</button>
      </form>
      <p className="mt-5 text-sm" style={{ color: "var(--ink-2)" }}>Not signed in? <a href="/aldroobi/login" className="font-semibold underline">Sign in</a></p>
    </section>
  </main>;
}
