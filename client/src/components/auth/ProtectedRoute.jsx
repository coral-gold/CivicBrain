import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from '../ui/Spinner.jsx';

/**
 * Citizen-only pages (FR-A16). Signed out → /login?next=…; staff → staff home; incomplete profile →
 * /complete-profile (except on that page itself, via `allowIncomplete`). The server enforces all of this too.
 */
export default function ProtectedRoute({ children, allowIncomplete = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (user.role !== 'CITIZEN') return <Navigate to="/staff/queue" replace />;
  if (!user.profileComplete && !allowIncomplete) return <Navigate to="/complete-profile" replace />;
  return children;
}
