"use client";
import Link from "next/link";

export function Nav({ admin, labels }: { admin: boolean; labels: { history: string; admin: string; logout: string } }) {
  const setLang = (l: string) => {
    document.cookie = `lang=${l};path=/;max-age=31536000;samesite=lax`;
    location.reload();
  };
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  };
  return (
    <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
      <Link href="/" className="font-semibold text-slate-100">PrivateCall</Link>
      <Link href="/history">{labels.history}</Link>
      {admin && <Link href="/admin">{labels.admin}</Link>}
      <span className="ms-auto" />
      <button onClick={() => setLang("en")}>EN</button>
      <button onClick={() => setLang("ar")}>ع</button>
      <button onClick={logout}>{labels.logout}</button>
    </nav>
  );
}
