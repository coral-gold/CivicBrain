const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** SRS §8.5: dates as dd MMM yyyy. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted", ANALYZED: "Analysed", PLANNED: "Planned", APPROVED: "Approved", SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress", RESOLVED: "Resolved", CLOSED: "Closed", REOPENED: "Reopened", MERGED: "Merged", REJECTED: "Rejected",
};
