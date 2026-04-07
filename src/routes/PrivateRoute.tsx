import { Navigate, Outlet } from "react-router-dom";

function getAuthToken() {
  return localStorage.getItem("evfeedback_token");
}

function getStoredUser() {
  const raw = localStorage.getItem("evfeedback_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function PrivateRoute() {
  const token = getAuthToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.active === false) {
    localStorage.removeItem("evfeedback_token");
    localStorage.removeItem("evfeedback_user");
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}