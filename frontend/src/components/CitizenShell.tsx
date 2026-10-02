import { ReactNode } from "react";
import AppHeader from "./AppHeader";

export default function CitizenShell({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader area="citizen" links={[
        { href: "/dashboard", label: "Home" },
        { href: "/report", label: "Report issue" },
        { href: "/complaints", label: "My complaints" },
      ]} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-5">{children}</main>
    </>
  );
}
