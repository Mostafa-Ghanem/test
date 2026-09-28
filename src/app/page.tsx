import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { isDemo } from "@/lib/env";
import { dict, toLang } from "@/lib/i18n";
import { Nav } from "@/components/Nav";
import { Dialer } from "@/components/Dialer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const t = dict(toLang((await cookies()).get("lang")?.value));
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <Nav admin={user.role === "admin"} labels={t} />
      <Dialer demo={isDemo()} t={t} countryPrefix={process.env.NEXT_PUBLIC_DEFAULT_DIAL_PREFIX || "+20"} />
    </main>
  );
}
