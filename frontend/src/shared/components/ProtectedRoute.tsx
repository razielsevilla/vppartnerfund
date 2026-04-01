import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "../../features/auth/hooks/use-auth-session";

export const ProtectedRoute = () => {
  const location = useLocation();
  const { user, isLoading } = useAuthSession();

  if (isLoading) {
    return <p className="loading-state">Checking session...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};
