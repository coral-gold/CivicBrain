"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Alert from "./Alert";
import Button from "./Button";
import { SelectField, TextAreaField, Field } from "./Field";
import type { LatLng } from "./LocationPicker";
import { api, ApiError, Category, NearbyComplaint } from "@/lib/api";
import { MAX_IMAGE_BYTES, MAX_IMAGES, prepareImage, validateImageFile } from "@/lib/image";
import { complaintTextSchema } from "@/lib/validation";
import StatusBadge from "./StatusBadge";

const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-72 rounded-lg border border-line bg-white" aria-busy="true" />,
});

const STEPS = ["Photos", "Location", "Details", "Review"] as const;
interface Photo { file: File; url: string }

async function reverseGeocode(p: LatLng, signal: AbortSignal): Promise<string | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}`, { signal });
    if (!r.ok) return null;
    const j = (await r.json()) as { display_name?: string };
    return j.display_name?.slice(0, 300) ?? null;
  } catch {
    return null;
  }
}

export default function ReportWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [nearby, setNearby] = useState<NearbyComplaint[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;

  useEffect(() => { api.get<Category[]>("/public/categories").then(setCategories).catch(() => undefined); }, []);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  // Reverse-geocode (best effort) whenever the pin moves.
  useEffect(() => {
    if (!position) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      const a = await reverseGeocode(position, ctl.signal);
      if (a) setAddress(a);
    }, 600);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [position]);

  // FR-C3: "Similar open complaints near you" once we know where and (optionally) what.
  useEffect(() => {
    if (step < 2 || !position) return;
    const q = new URLSearchParams({ lat: String(position.lat), lng: String(position.lng) });
    if (category) q.set("category", category);
    api.get<NearbyComplaint[]>(`/citizen/complaints/nearby?${q}`).then(setNearby).catch(() => setNearby([]));
  }, [step, position, category]);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setErrors((e) => ({ ...e, photos: "" }));
    const next = [...photos];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_IMAGES) { setErrors((e) => ({ ...e, photos: `You can add up to ${MAX_IMAGES} photos.` })); break; }
      const problem = validateImageFile(f);
      if (problem) { setErrors((e) => ({ ...e, photos: problem })); continue; }
      const prepared = await prepareImage(f);
      if (prepared.size > MAX_IMAGE_BYTES) { setErrors((e) => ({ ...e, photos: "Each photo must be 5 MB or smaller." })); continue; }
      next.push({ file: prepared, url: URL.createObjectURL(prepared) });
    }
    setPhotos(next);
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(photos[i].url);
    setPhotos(photos.filter((_, j) => j !== i));
  }

  function locate() {
    setNotice(null);
    if (!navigator.geolocation) return setNotice("Your browser can't share its location. Tap the map to place the pin.");
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setGpsBusy(false); setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => { setGpsBusy(false); setNotice("We couldn't get your location. Tap the map to place the pin."); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function next() {
    const e: Record<string, string> = {};
    if (step === 0 && photos.length === 0) e.photos = "Add at least one photo of the problem.";
    if (step === 1 && !position) e.location = "Set the location with GPS or by tapping the map.";
    if (step === 2) {
      const r = complaintTextSchema.safeParse({ description, category, address });
      if (!r.success) r.error.issues.forEach((i) => { e[String(i.path[0])] = i.message; });
    }
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => s + 1);
  }

  async function meToo(n: NearbyComplaint) {
    try {
      const r = await api.post<{ meTooCount: number }>(`/citizen/complaints/${n.id}/me-too`);
      setNearby((list) => list.map((x) => (x.id === n.id ? { ...x, alreadyMeToo: true, meTooCount: r.meTooCount } : x)));
      setNotice("Thanks — your \"me too\" was counted. You don't need to file a duplicate.");
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : "Could not add your \"me too\".");
    }
  }

  async function submit() {
    if (!position) return;
    setBusy(true);
    setFormError(null);
    try {
      const created = await api.multipart<{ id: number }>(
        "/citizen/complaints",
        { description: description.trim(), category: category || undefined, lat: position.lat, lng: position.lng, address: address.trim() || undefined },
        { images: photos.map((p) => p.file) },
      );
      router.replace(`/complaints/${created.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) {
        const fe = e.fieldErrors;
        setErrors({ photos: fe.images ?? "", description: fe.description ?? "", category: fe.category ?? "" });
        if (fe.images) setStep(0); else if (fe.description || fe.category) setStep(2);
      }
      setFormError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const catName = categories.find((c) => c.code === category)?.nameEn;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Report an issue</h1>
      <ol className="flex gap-1" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}
            className={`flex-1 rounded-md px-1 py-2 text-center text-xs font-semibold sm:text-sm ${i === step ? "bg-civic text-white" : i < step ? "bg-civic/15 text-civic-dark" : "bg-white text-ink/60 border border-line"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      {formError && <Alert kind="error">{formError}</Alert>}

      {step === 0 && (
        <section className="space-y-3" aria-labelledby="s-photos">
          <h2 id="s-photos" className="text-lg font-bold">Add photos</h2>
          <p className="text-sm text-ink/70">Up to {MAX_IMAGES} photos (JPEG, PNG or WebP). Large photos are shrunk automatically.</p>
          <div className="flex flex-wrap gap-2">
            <label className="flex min-h-touch cursor-pointer items-center rounded-md bg-civic px-4 py-2 font-semibold text-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-civic">
              Take photo
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
            </label>
            <label className="flex min-h-touch cursor-pointer items-center rounded-md border border-line bg-white px-4 py-2 font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-civic">
              Choose from gallery
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
          {errors.photos && <p role="alert" className="text-sm text-danger">{errors.photos}</p>}
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <li key={p.url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Selected photo ${i + 1}`} className="aspect-square w-full rounded-md border border-line object-cover" />
                <button type="button" onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 flex h-touch w-touch items-center justify-center rounded-full bg-ink/80 text-lg text-white">×</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3" aria-labelledby="s-loc">
          <h2 id="s-loc" className="text-lg font-bold">Where is it?</h2>
          <Button variant="secondary" onClick={locate} loading={gpsBusy}>Use my current location</Button>
          {notice && <Alert kind="warning">{notice}</Alert>}
          <LocationPicker value={position} onChange={setPosition} />
          {errors.location && <p role="alert" className="text-sm text-danger">{errors.location}</p>}
          <Field label="Address / landmark" value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)}
            hint="Filled in from the pin when available — edit it if needed." />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4" aria-labelledby="s-details">
          <h2 id="s-details" className="text-lg font-bold">Describe the problem</h2>
          <TextAreaField label="Description" rows={5} value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)}
            hint={`${description.trim().length}/1000 — at least 10 characters. English, Hindi or Marathi is fine.`} error={errors.description} />
          <SelectField label="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} error={errors.category}
            hint="Leave blank and we'll work it out from your description.">
            <option value="">Not sure</option>
            {categories.map((c) => <option key={c.code} value={c.code}>{c.nameEn}</option>)}
          </SelectField>
          {notice && <Alert kind="success">{notice}</Alert>}
          {nearby.length > 0 && (
            <div className="space-y-2 rounded-lg border border-signal bg-signal/10 p-3" aria-labelledby="similar">
              <h3 id="similar" className="font-bold">Similar open complaints near you</h3>
              <p className="text-sm">Already reported? Tap &quot;Me too&quot; instead of filing a duplicate — it helps the officer prioritise.</p>
              <ul className="space-y-2">
                {nearby.map((n) => (
                  <li key={n.id} className="rounded-md border border-line bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm">{n.description}</p>
                      <StatusBadge status={n.status} />
                    </div>
                    <p className="mt-1 text-xs text-ink/70">{n.distanceM} m away · {n.meTooCount} more reported</p>
                    <Button variant="secondary" className="mt-2" disabled={n.alreadyMeToo} onClick={() => meToo(n)}>
                      {n.alreadyMeToo ? "Counted ✓" : "Me too"}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3" aria-labelledby="s-review">
          <h2 id="s-review" className="text-lg font-bold">Review and submit</h2>
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <li key={p.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-md border border-line object-cover" />
              </li>
            ))}
          </ul>
          <dl className="space-y-2 rounded-lg border border-line bg-white p-4 text-sm">
            <div><dt className="font-semibold">Category</dt><dd>{catName ?? "We'll work it out from your description"}</dd></div>
            <div><dt className="font-semibold">Location</dt><dd>{address || (position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : "")}</dd></div>
            <div><dt className="font-semibold">Description</dt><dd className="whitespace-pre-wrap">{description.trim()}</dd></div>
          </dl>
        </section>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="secondary" onClick={() => { setNotice(null); setStep((s) => s - 1); }} disabled={step === 0 || busy}>Back</Button>
        {step < 3 ? <Button onClick={next}>Next</Button> : <Button onClick={submit} loading={busy}>Submit complaint</Button>}
      </div>
    </div>
  );
}

