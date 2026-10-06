import { Link } from 'react-router-dom';

const linkBase = 'flex min-h-touch items-center justify-center rounded-md px-4 py-2 font-semibold';

export default function Home() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-8 text-center">
      <h1 className="text-3xl font-bold text-civic">CivicBrain</h1>
      <p className="text-ink/80">
        Report potholes, water, garbage, drainage and streetlight problems — and help your municipality fix the most urgent ones first.
      </p>
      <Link to="/signup" className={`${linkBase} bg-civic text-white hover:bg-civic-dark`}>
        Sign up
      </Link>
      <Link to="/login" className={`${linkBase} border border-line bg-white`}>
        Log in
      </Link>
      <Link to="/staff/login" className="text-sm text-civic underline">
        Municipal staff login
      </Link>
    </main>
  );
}
