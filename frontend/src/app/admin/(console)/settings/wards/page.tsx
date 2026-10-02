"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import { api, ApiError } from "@/lib/api";

interface Ward { id: number; number: number; name: string }

/** FR-M2: SUPER_ADMIN uploads ward boundaries as a GeoJSON FeatureCollection. */
export default function WardSettings() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = () => api.get<Ward[]>("/admin/wards").then(setWards).catch(() => undefined);
  useEffect(() => { void load(); }, []);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.upload<{ created: number; updated: number }>("/admin/wards/upload", "file", file);
      setMsg({ kind: "success", text: `Imported: ${r.created} new, ${r.updated} updated.` });
      await load();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof ApiError ? (e.fieldErrors?.file ?? e.message) : "Upload failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Ward boundaries</h1>
      <p className="text-sm text-ink/70">
        Upload a GeoJSON FeatureCollection of Polygon/MultiPolygon features. Each feature needs <code>properties.number</code> and{" "}
        <code>properties.name</code> (optional <code>population</code>). Existing wards with the same number are updated.
      </p>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="space-y-3 rounded-lg border border-line bg-white p-4">
        <label htmlFor="geojson" className="block text-sm font-semibold">GeoJSON file</label>
        <input id="geojson" type="file" accept=".geojson,.json,application/geo+json,application/json" className="block min-h-touch w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button onClick={upload} loading={busy} disabled={!file}>Upload</Button>
      </div>
      <section aria-labelledby="wl">
        <h2 id="wl" className="mb-2 text-lg font-bold">Wards ({wards.length})</h2>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">{wards.map((w) => <li key={w.id}>Ward {w.number} — {w.name}</li>)}</ul>
      </section>
    </div>
  );
}
