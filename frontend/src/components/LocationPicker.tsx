"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export interface LatLng { lat: number; lng: number }

// Default view: centre of India until we have a GPS fix.
const DEFAULT_CENTER: LatLng = { lat: 18.6298, lng: 73.7997 };

// A CSS pin instead of Leaflet's PNG marker (bundlers break the default icon paths; CSP also blocks CDNs).
const pin = L.divIcon({
  className: "",
  html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#0F5E63;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);transform:rotate(-45deg)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

/** Map with a draggable pin (FR-C1 step 2). Tap the map or drag the pin to adjust. */
export default function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (p: LatLng) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!el.current || map.current) return;
    const start = value ?? DEFAULT_CENTER;
    const m = L.map(el.current).setView([start.lat, start.lng], value ? 17 : 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    return () => { m.remove(); map.current = null; marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !value) return;
    if (!marker.current) {
      marker.current = L.marker([value.lat, value.lng], { icon: pin, draggable: true, keyboard: true, alt: "Complaint location" }).addTo(m);
      marker.current.on("dragend", () => {
        const p = marker.current!.getLatLng();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
    } else {
      marker.current.setLatLng([value.lat, value.lng]);
    }
    m.setView([value.lat, value.lng], Math.max(m.getZoom(), 17));
  }, [value]);

  return <div ref={el} className="h-72 w-full rounded-lg border border-line sm:h-96" role="application" aria-label="Map: tap to place the pin, or drag it" />;
}
