import Link from "next/link";
import { ComplaintSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";
import StatusBadge from "./StatusBadge";

export default function ComplaintCard({ c }: { c: ComplaintSummary }) {
  return (
    <li>
      <Link href={`/complaints/${c.id}`} className="block rounded-lg border border-line bg-white p-4 hover:border-civic">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink/70">#{c.id} · {c.category?.name ?? "Awaiting category"}</span>
          <StatusBadge status={c.status} />
        </div>
        <p className="mt-2 line-clamp-2 text-base">{c.description}</p>
        <p className="mt-2 text-xs text-ink/70">
          {formatDate(c.createdAt)}{c.address ? ` · ${c.address}` : ""}{c.meTooCount > 0 ? ` · ${c.meTooCount} more reported` : ""}
        </p>
      </Link>
    </li>
  );
}
