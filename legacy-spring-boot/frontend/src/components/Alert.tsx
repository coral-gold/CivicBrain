import { ReactNode } from "react";

const tone = {
  error: "border-danger bg-danger/5 text-danger",
  success: "border-civic bg-civic/5 text-civic-dark",
  info: "border-line bg-white text-ink",
  warning: "border-signal bg-signal/10 text-ink",
};

export default function Alert({ kind = "info", children, className = "" }: { kind?: keyof typeof tone; children: ReactNode; className?: string }) {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-md border-l-4 px-4 py-3 text-sm ${tone[kind]} ${className}`}>
      {children}
    </div>
  );
}
