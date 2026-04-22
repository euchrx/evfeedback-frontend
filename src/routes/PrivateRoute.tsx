import { Navigate, Outlet, useLocation } from "react-router-dom";
import { clearAuthSession, getAuthToken, getStoredUser } from "../services/auth";

export function PrivateRoute() {
  const location = useLocation();
  const token = getAuthToken();
  const user = getStoredUser();

  if (!token || !user) {
    clearAuthSession();
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.active === false) {
    clearAuthSession();
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}