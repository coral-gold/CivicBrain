"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import { SelectField } from "@/components/Field";
import StatusBadge from "@/components/StatusBadge";
import { useUser } from "@/hooks/useUser";
import { api, Category, Page, StaffSummary } from "@/lib/api";
import { formatDate, STATUS_LABEL } from "@/lib/format";

const PAGE_SIZE = 20;

/** Ward queue, read-only for M2 (ranking/AI columns arrive with M3/M4). */
export default function AdminDashboard() {
  const { user } = useUser();
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<StaffSummary> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => { api.get<Category[]>("/public/categories").then(setCategories).catch(() => undefined); }, []);
  useEffect(() => {
    setError(false);
    const q = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE), sort: "priority" });
    if (status) q.set("status", status);
    if (category) q.set("category", category);
    api.get<Page<StaffSummary>>(`/admin/complaints?${q}`).then(setData).catch(() => setError(true));
  }, [status, category, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Complaint queue</h1>
        {user && <p className="text-sm text-ink/70">{user.role === "OFFICER" ? `Ward ${user.assignedWardNumber ?? "—"}` : "All wards"}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">All</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </SelectField>
        <SelectField label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
          <option value="">All</option>
          {categories.map((c) => <option key={c.code} value={c.code}>{c.nameEn}</option>)}
        </SelectField>
      </div>
      {error && <Alert kind="error">Could not load the queue.</Alert>}
      {data && data.items.length === 0 && <Alert>No complaints match.</Alert>}
      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Complaints ordered by priority</caption>
            <thead className="border-b border-line bg-paper text-xs uppercase text-ink/70">
              <tr><th className="p-3">ID</th><th className="p-3">Category</th><th className="p-3">Description</th><th className="p-3">Ward</th><th className="p-3">Priority</th><th className="p-3">Status</th><th className="p-3">Reported</th></tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="p-3"><Link className="font-semibold text-civic underline" href={`/admin/complaints/${c.id}`}>#{c.id}</Link></td>
                  <td className="p-3">{c.category?.name ?? "—"}</td>
                  <td className="max-w-xs truncate p-3">{c.description}</td>
                  <td className="p-3">{c.wardNumber ?? "—"}{c.outOfWard ? " ⚑" : ""}</td>
                  <td className="p-3">{c.priorityScore ?? "—"}</td>
                  <td className="p-3"><StatusBadge status={c.status} /></td>
                  <td className="p-3">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
