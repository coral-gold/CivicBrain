import AppHeader from "@/components/AppHeader";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader area="staff" links={[
        { href: "/admin/dashboard", label: "Queue" },
        { href: "/admin/settings/wards", label: "Wards" },
      ]} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-5">{children}</main>
    </>
  );
}
