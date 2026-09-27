import { Navigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser } from '../services/api';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const isAuth = isAuthenticated();
  const user = getCurrentUser();

  if (!isAuth) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // User doesn't have required role, redirect to appropriate dashboard
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === 'teacher') {
      return <Navigate to="/teacher/dashboard" replace />;
    } else {
      return <Navigate to="/student/home" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;