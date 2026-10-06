import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ProtectedRoute from '../components/auth/ProtectedRoute.jsx';
import RoleRoute from '../components/auth/RoleRoute.jsx';
import { AuthContext } from '../context/AuthContext.jsx';

const citizen = (over = {}) => ({ id: '1', role: 'CITIZEN', fullName: 'Asha', profileComplete: true, ...over });
const staff = (role = 'OFFICER') => ({ id: '2', role, fullName: 'Ofc', profileComplete: true });

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}

function renderAt(path, user, loading = false) {
  return render(
    <AuthContext.Provider value={{ user, loading }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <p>citizen dashboard</p>
              </ProtectedRoute>
            }
          />
          <Route
            path="/complete-profile"
            element={
              <ProtectedRoute allowIncomplete>
                <p>profile form</p>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/queue"
            element={
              <RoleRoute>
                <p>staff queue</p>
              </RoleRoute>
            }
          />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute (acceptance 9)', () => {
  it('sends signed-out visitors to /login and remembers where they were going', () => {
    renderAt('/dashboard', null);
    expect(screen.getByTestId('where')).toHaveTextContent('/login?next=%2Fdashboard');
  });
  it('sends an incomplete profile to /complete-profile', () => {
    renderAt('/dashboard', citizen({ profileComplete: false }));
    expect(screen.getByText('profile form')).toBeInTheDocument(); // redirected to /complete-profile
    expect(screen.queryByText('citizen dashboard')).not.toBeInTheDocument();
  });
  it('lets an incomplete profile use the profile form, and a complete profile see the dashboard', () => {
    renderAt('/complete-profile', citizen({ profileComplete: false }));
    expect(screen.getByText('profile form')).toBeInTheDocument();
    renderAt('/dashboard', citizen());
    expect(screen.getByText('citizen dashboard')).toBeInTheDocument();
  });
  it('sends staff away from citizen pages', () => {
    renderAt('/dashboard', staff());
    expect(screen.getByText('staff queue')).toBeInTheDocument(); // redirected to /staff/queue
    expect(screen.queryByText('citizen dashboard')).not.toBeInTheDocument();
  });
  it('shows a spinner while the session is loading', () => {
    renderAt('/dashboard', null, true);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('RoleRoute (acceptance 10)', () => {
  it.each([[null], [citizen()]])('sends %j to the staff login page', (user) => {
    renderAt('/staff/queue', user);
    expect(screen.getByTestId('where')).toHaveTextContent('/staff/login');
  });
  it.each([['OFFICER'], ['ADMIN'], ['SUPER_ADMIN']])('lets %s in', (role) => {
    renderAt('/staff/queue', staff(role));
    expect(screen.getByText('staff queue')).toBeInTheDocument();
  });
});
