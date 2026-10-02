"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import { TextAreaField } from "@/components/Field";
import StatusBadge from "@/components/StatusBadge";
import Timeline from "@/components/Timeline";
import { api, ApiError, ComplaintDetail } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { applyServerErrors } from "@/lib/forms";
import { prepareImage, validateImageFile } from "@/lib/image";
import { reopenSchema } from "@/lib/validation";

function ReopenForm({ id, onDone }: { id: number; onDone: (c: ComplaintDetail) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<{ reason: string }>({ resolver: zodResolver(reopenSchema) });

  async function submit({ reason }: { reason: string }) {
    setError(null);
    if (!file) return setError("Attach a photo showing the problem.");
    try {
      const photo = await prepareImage(file);
      onDone(await api.multipart<ComplaintDetail>(`/citizen/complaints/${id}/reopen`, { reason }, { image: [photo] }));
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-3 rounded-lg border border-line bg-white p-4">
      <h3 className="font-bold">Still not fixed?</h3>
      {error && <Alert kind="error">{error}</Alert>}
      <TextAreaField label="What is still wrong?" rows={3} error={errors.reason?.message} {...register("reason")} />
      <div>
        <label htmlFor="reopen-photo" className="block text-sm font-semibold">Photo</label>
        <input id="reopen-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-1 block min-h-touch w-full text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            const problem = f ? validateImageFile(f) : null;
            setError(problem);
            setFile(problem ? null : f);
          }} />
      </div>
      <Button type="submit" variant="danger" loading={isSubmitting}>Reopen complaint</Button>
    </form>
  );
}

export default function ComplaintDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [c, setC] = useState<ComplaintDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reopening, setReopening] = useState(false);

  const load = useCallback(() => {
    api.get<ComplaintDetail>(`/citizen/complaints/${id}`).then(setC)
      .catch((e) => setError(e instanceof ApiError && e.status === 404 ? "We couldn't find that complaint." : "Could not load this complaint."));
  }, [id]);
  useEffect(load, [load]);

  async function confirm() {
    setBusy(true);
    try {
      setC(await api.post<ComplaintDetail>(`/citizen/complaints/${id}/confirm`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not confirm.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !c) return <Alert kind="error">{error}</Alert>;
  if (!c) return <p role="status">Loading…</p>;

  return (
    <article className="space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Complaint #{c.id}</h1>
          <StatusBadge status={c.status} />
        </div>
        <p className="text-sm text-ink/70">{c.category?.name ?? "Category pending"} · Reported {formatDate(c.createdAt)}{c.address ? ` · ${c.address}` : ""}</p>
        {c.status === "SUBMITTED" && <Alert>Analysing… Municipal staff will review your report shortly.</Alert>}
      </header>
      {error && <Alert kind="error">{error}</Alert>}

      <p className="whitespace-pre-wrap text-base">{c.description}</p>
      {c.meTooCount > 0 && <p className="text-sm text-ink/70">{c.meTooCount} other resident{c.meTooCount > 1 ? "s" : ""} reported the same problem.</p>}

      {c.images.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Photos">
          {c.images.map((im) => (
            <li key={im.id}>
              {/* signed, short-lived URL straight from our API – next/image optimisation not applicable */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt={`${im.kind.toLowerCase()} photo`} className="aspect-square w-full rounded-md border border-line object-cover" />
              <span className="text-xs text-ink/70">{im.kind === "BEFORE" ? "Reported" : im.kind === "AFTER" ? "After fix" : "Reopen"}</span>
            </li>
          ))}
        </ul>
      )}

      {c.canConfirm && (
        <section className="space-y-3 rounded-lg border border-civic bg-civic/5 p-4" aria-labelledby="fixed">
          <h2 id="fixed" className="font-bold">Has this been fixed?</h2>
          <p className="text-sm">
            Confirm if the problem is solved{c.reopenUntil ? `, or reopen it by ${formatDate(c.reopenUntil)}` : ""}. It closes automatically after 7 days.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={confirm} loading={busy}>Confirm fixed</Button>
            <Button variant="secondary" onClick={() => setReopening((v) => !v)} aria-expanded={reopening}>Reopen</Button>
          </div>
          {reopening && <ReopenForm id={c.id} onDone={(d) => { setC(d); setReopening(false); }} />}
        </section>
      )}

      <section aria-labelledby="history">
        <h2 id="history" className="mb-3 text-lg font-bold">Progress</h2>
        <Timeline history={c.history} />
      </section>
    </article>
  );
}
