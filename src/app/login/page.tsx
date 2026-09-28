"use client";
import { useState } from "react";

export default function LoginPage() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
    });
    setBusy(false);
    if (r.ok) location.href = "/";
    else setErr(r.status === 429 ? "Too many attempts. Try later." : "Invalid email or password.");
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-center text-3xl font-semibold">🔒 PrivateCall</h1>
      <form onSubmit={submit} className="card flex flex-col gap-3">
        <input className="input" name="email" type="email" placeholder="Email / البريد" required autoComplete="username" />
        <input className="input" name="password" type="password" placeholder="Password / كلمة المرور" required autoComplete="current-password" />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button className="btn bg-emerald-600 hover:bg-emerald-500" disabled={busy}>Log in / دخول</button>
      </form>
    </main>
  );
}
