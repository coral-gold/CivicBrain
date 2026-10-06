"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Alert from "@/components/Alert";
import ComplaintCard from "@/components/ComplaintCard";
import { useUser } from "@/hooks/useUser";
import { api, ComplaintSummary, Page } from "@/lib/api";

export default function DashboardPage() {
  const { user } = useUser();
  const [recent, setRecent] = useState<Page<ComplaintSummary> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get<Page<ComplaintSummary>>("/citizen/complaints?size=5").then(setRecent).catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hello{user ? `, ${user.fullName.split(" ")[0]}` : ""}</h1>
        <p className="text-ink/70">See something broken in your neighbourhood? Tell your municipality in a minute.</p>
      </div>
      <Link href="/report" className="flex min-h-touch items-center justify-center rounded-md bg-civic px-4 py-3 text-lg font-semibold text-white hover:bg-civic-dark">
        Report an issue
      </Link>
      <section aria-labelledby="recent">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="recent" className="text-lg font-bold">Recent complaints</h2>
          <Link href="/complaints" className="text-sm text-civic underline">View all{recent ? ` (${recent.total})` : ""}</Link>
        </div>
        {error && <Alert kind="error">Could not load your complaints.</Alert>}
        {recent && recent.items.length === 0 && <Alert>You haven&apos;t reported anything yet.</Alert>}
        <ul className="space-y-3">{recent?.items.map((c) => <ComplaintCard key={c.id} c={c} />)}</ul>
      </section>
    </div>
  );
}
