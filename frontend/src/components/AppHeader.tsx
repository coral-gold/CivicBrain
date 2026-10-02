"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AppHeader({ area, links }: { area: "citizen" | "staff"; links: { href: string; label: string }[] }) {
  const router = useRouter();

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      router.replace(area === "staff" ? "/admin/login" : "/login");
      router.refresh();
    }
  }

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <Link href={area === "staff" ? "/admin/dashboard" : "/dashboard"} className="min-h-touch py-2 text-lg font-bold text-civic">
          CivicBrain
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-wrap gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex min-h-touch items-center rounded-md px-3 text-sm font-semibold hover:bg-paper">
              {l.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="min-h-touch rounded-md px-3 text-sm font-semibold text-civic hover:bg-paper">
          Sign out
        </button>
      </div>
    </header>
  );
}
