import { STATUS_LABEL } from "@/lib/format";

const tone: Record<string, string> = {
  SUBMITTED: "bg-white text-ink border-line",
  ANALYZED: "bg-white text-ink border-line",
  PLANNED: "bg-civic/10 text-civic-dark border-civic/30",
  APPROVED: "bg-civic/10 text-civic-dark border-civic/30",
  SCHEDULED: "bg-civic/10 text-civic-dark border-civic/30",
  IN_PROGRESS: "bg-signal/15 text-ink border-signal",
  RESOLVED: "bg-civic text-white border-civic",
  CLOSED: "bg-paper text-ink/70 border-line",
  REOPENED: "bg-danger/10 text-danger border-danger/40",
  MERGED: "bg-paper text-ink/70 border-line",
  REJECTED: "bg-danger/10 text-danger border-danger/40",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone[status] ?? tone.SUBMITTED}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
