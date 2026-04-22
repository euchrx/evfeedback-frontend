import { Navigate, Outlet, useLocation } from "react-router-dom";
import { clearAuthSession, getAuthToken, getStoredUser } from "../services/auth";
import type { UserRole } from "../utils/permissions";

type RoleRouteProps = {
  allowedRoles: UserRole[];
};

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
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

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}