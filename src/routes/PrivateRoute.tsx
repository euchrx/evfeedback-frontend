import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../services/authToken";

export function PrivateRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}