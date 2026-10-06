import Link from "next/link";

export default function Home() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-8 text-center">
      <h1 className="text-3xl font-bold text-civic">CivicBrain</h1>
      <p className="text-ink/80">Report potholes, water, garbage, drainage and streetlight problems — and help your municipality fix the most urgent ones first.</p>
      <Link href="/signup" className="flex min-h-touch items-center justify-center rounded-md bg-civic px-4 py-2 font-semibold text-white hover:bg-civic-dark">Sign up</Link>
      <Link href="/login" className="flex min-h-touch items-center justify-center rounded-md border border-line bg-white px-4 py-2 font-semibold">Log in</Link>
      <Link href="/admin/login" className="text-sm text-civic underline">Municipal staff login</Link>
    </main>
  );
}
