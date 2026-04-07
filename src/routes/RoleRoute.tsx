import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getStoredUser } from "../services/auth";

export type UserRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";

type RoleRouteProps = {
  allowedRoles: UserRole[];
};

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const location = useLocation();
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}