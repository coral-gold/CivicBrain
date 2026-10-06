import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { STAFF_ROLES } from '../../lib/constants.js';
import Spinner from '../ui/Spinner.jsx';

/** Staff-only pages. Anyone without one of `roles` is sent to the staff login page. */
export default function RoleRoute({ children, roles = STAFF_ROLES }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/staff/login" replace />;
  return children;
}
