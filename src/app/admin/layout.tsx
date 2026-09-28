import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
      <nav className="flex flex-wrap gap-4 text-sm text-slate-400">
        <Link href="/" className="font-semibold text-slate-100">PrivateCall</Link>
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/users">Users</Link>
        <Link href="/admin/calls">Calls</Link>
        <Link href="/admin/system">System</Link>
      </nav>
      {children}
    </main>
  );
}
