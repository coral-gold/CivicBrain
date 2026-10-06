"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { hardNavigate } from "@/lib/navigation";

export default function AppHeader({ area, links }: { area: "citizen" | "staff"; links: { href: string; label: string }[] }) {
  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      hardNavigate(area === "staff" ? "/admin/login" : "/login");
    }
  }

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 px-4 py-1 sm:flex-nowrap">
        <Link href={area === "staff" ? "/admin/dashboard" : "/dashboard"} className="min-h-touch py-2 text-lg font-bold text-civic">
          CivicBrain
        </Link>
        <nav aria-label="Main" className="order-last -mx-2 flex w-full gap-1 overflow-x-auto pb-1 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:pb-0">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex min-h-touch shrink-0 items-center whitespace-nowrap rounded-md px-3 text-sm font-semibold hover:bg-paper">
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
