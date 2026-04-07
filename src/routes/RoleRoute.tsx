import { Navigate, Outlet } from "react-router-dom";

type UserRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";

function getUserRole(): UserRole | null {
  const raw = localStorage.getItem("evfeedback_user");
  if (!raw) return null;

  try {
    const user = JSON.parse(raw);
    return user?.role ?? null;
  } catch {
    return null;
  }
}

type RoleRouteProps = {
  allowedRoles: UserRole[];
};

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const role = getUserRole();

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}