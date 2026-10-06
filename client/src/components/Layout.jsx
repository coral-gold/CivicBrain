import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/** Header + page container. `area` picks the home link and the sign-out destination. */
export default function Layout({ area = 'citizen', children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const home = area === 'staff' ? '/staff/queue' : '/dashboard';

  async function signOut() {
    await logout();
    navigate(area === 'staff' ? '/staff/login' : '/login', { replace: true });
  }

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Skip to content
      </a>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-1">
          <Link to={home} className="flex min-h-touch items-center text-lg font-bold text-civic">
            CivicBrain
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {user && <span className="hidden text-ink/70 sm:inline">{user.fullName}</span>}
            <button onClick={signOut} className="min-h-touch rounded-md px-3 font-semibold text-civic hover:bg-civic-soft">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </>
  );
}

/** Centered card layout for sign-in style pages. */
export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <main id="main" className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <Link to="/" className="mb-3 text-center text-xl font-bold text-civic">
        CivicBrain
      </Link>
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/70">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
      {footer && <div className="mt-4 text-center text-sm">{footer}</div>}
    </main>
  );
}
