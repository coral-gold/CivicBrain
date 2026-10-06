import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-ink/70">The page you are looking for does not exist.</p>
      <Link to="/" className="text-civic underline">
        Go to the home page
      </Link>
    </main>
  );
}
