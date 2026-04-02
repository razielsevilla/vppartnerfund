import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "../../features/auth/hooks/use-auth-session";
import { Navbar } from "./Navbar";

export const ProtectedRoute = () => {
  const location = useLocation();
  const { user, isLoading } = useAuthSession();

  if (isLoading) {
    return <p className="loading-state">Checking session...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="authenticated-wrapper">
      <Navbar />
      <div className="authenticated-content">
        <Outlet />
      </div>
    </div>
  );
};
