import CitizenShell from "@/components/CitizenShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CitizenShell>{children}</CitizenShell>;
}
