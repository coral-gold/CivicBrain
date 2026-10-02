"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import ComplaintCard from "@/components/ComplaintCard";
import { SelectField } from "@/components/Field";
import { api, ComplaintSummary, Page } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/format";

const PAGE_SIZE = 20;

export default function ComplaintsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<ComplaintSummary> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    const q = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (status) q.set("status", status);
    api.get<Page<ComplaintSummary>>(`/citizen/complaints?${q}`).then(setData).catch(() => setError(true));
  }, [status, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My complaints</h1>
      <SelectField label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
        <option value="">All</option>
        {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </SelectField>
      {error && <Alert kind="error">Could not load complaints. Please try again.</Alert>}
      {data && data.items.length === 0 && <Alert>No complaints found.</Alert>}
      <ul className="space-y-3">{data?.items.map((c) => <ComplaintCard key={c.id} c={c} />)}</ul>
      {data && pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          <Button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm">Page {page + 1} of {pages}</span>
          <Button variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </nav>
      )}
    </div>
  );
}
