"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Alert from "@/components/Alert";
import StatusBadge from "@/components/StatusBadge";
import Timeline from "@/components/Timeline";
import { api, ApiError, StaffDetail } from "@/lib/api";
import { formatDate } from "@/lib/format";

/** Read-only detail for M2; the AI analysis and action-plan panels arrive in M3/M4. */
export default function AdminComplaintPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<StaffDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<StaffDetail>(`/admin/complaints/${id}`).then(setD)
      .catch((e) => setError(e instanceof ApiError && e.status === 404 ? "Complaint not found." : "Could not load this complaint."));
  }, [id]);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!d) return <p role="status">Loading…</p>;
  const s = d.summary;

  return (
    <article className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Complaint #{s.id}</h1>
        <StatusBadge status={s.status} />
      </header>
      <dl className="grid gap-3 rounded-lg border border-line bg-white p-4 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Category</dt><dd>{s.category?.name ?? "—"}</dd></div>
        <div><dt className="font-semibold">Ward</dt><dd>{s.wardNumber ?? "—"}{s.outOfWard ? " (GPS outside ward — profile ward used)" : ""}</dd></div>
        <div><dt className="font-semibold">Reported</dt><dd>{formatDate(s.createdAt)}</dd></div>
        <div><dt className="font-semibold">Same issue reported by</dt><dd>{s.meTooCount} other resident(s)</dd></div>
        <div><dt className="font-semibold">Citizen</dt><dd>{d.citizen ? `${d.citizen.name}${d.citizen.maskedPhone ? ` · ${d.citizen.maskedPhone}` : ""}` : "—"}</dd></div>
        <div><dt className="font-semibold">Location</dt><dd>{s.address ?? ""} ({d.lat.toFixed(5)}, {d.lng.toFixed(5)})</dd></div>
      </dl>
      <p className="whitespace-pre-wrap">{s.description}</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Photos">
        {d.images.map((im) => (
          <li key={im.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={im.url} alt={`${im.kind.toLowerCase()} photo`} className="aspect-square w-full rounded-md border border-line object-cover" />
          </li>
        ))}
      </ul>
      <section aria-labelledby="h"><h2 id="h" className="mb-3 text-lg font-bold">History</h2><Timeline history={d.history} /></section>
    </article>
  );
}
