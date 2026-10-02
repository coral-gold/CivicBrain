import { HistoryEntry } from "@/lib/api";
import { formatDateTime, STATUS_LABEL } from "@/lib/format";

export default function Timeline({ history }: { history: HistoryEntry[] }) {
  return (
    <ol className="space-y-4 border-l-2 border-line pl-5" aria-label="Status history">
      {history.map((h, i) => (
        <li key={i} className="relative">
          <span aria-hidden className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white ${i === history.length - 1 ? "bg-civic" : "bg-line"}`} />
          <p className="font-semibold">{STATUS_LABEL[h.to] ?? h.to}</p>
          <p className="text-xs text-ink/70">{formatDateTime(h.at)}{h.actorType === "SYSTEM" ? " · automatic" : ""}</p>
          {h.note && <p className="mt-1 text-sm">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
