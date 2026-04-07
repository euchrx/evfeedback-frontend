import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAuthToken, getStoredUser, logout } from "../services/auth";

export function PrivateRoute() {
  const location = useLocation();
  const token = getAuthToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.active === false) {
    logout();
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}