import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PrivateRoute } from "./routes/PrivateRoute";
import { RoleRoute } from "./routes/RoleRoute";
import AdminLayout from "./components/admin/AdminLayout";

import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Admin/Dashboard";
import CompaniesPage from "./pages/Admin/Companies";
import UsersPage from "./pages/Admin/Users";
import BranchesPage from "./pages/Admin/Branches";
import KiosksPage from "./pages/Admin/Kiosks";
import TagsPage from "./pages/Admin/Tags";
import FeedbacksPage from "./pages/Admin/Feedbacks";
import SettingsPage from "./pages/Admin/Settings";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<DashboardPage />} />

            <Route
              element={<RoleRoute allowedRoles={["SUPER_ADMIN"]} />}
            >
              <Route path="/admin/companies" element={<CompaniesPage />} />
            </Route>

            <Route
              element={
                <RoleRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN"]} />
              }
            >
              <Route path="/admin/users" element={<UsersPage />} />
            </Route>

            <Route
              element={
                <RoleRoute
                  allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"]}
                />
              }
            >
              <Route path="/admin/branches" element={<BranchesPage />} />
              <Route path="/admin/kiosks" element={<KiosksPage />} />
              <Route path="/admin/tags" element={<TagsPage />} />
              <Route path="/admin/feedbacks" element={<FeedbacksPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}