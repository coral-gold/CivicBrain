import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import RoleRoute from './components/auth/RoleRoute.jsx';
import CompleteProfile from './pages/citizen/CompleteProfile.jsx';
import Dashboard from './pages/citizen/Dashboard.jsx';
import Home from './pages/public/Home.jsx';
import Login from './pages/public/Login.jsx';
import NotFound from './pages/public/NotFound.jsx';
import Signup from './pages/public/Signup.jsx';
import Queue from './pages/staff/Queue.jsx';
import StaffLogin from './pages/staff/StaffLogin.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/complete-profile"
        element={
          <ProtectedRoute allowIncomplete>
            <CompleteProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route
        path="/staff/queue"
        element={
          <RoleRoute>
            <Queue />
          </RoleRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
