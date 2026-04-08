import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login";
import CompaniesPage from "./pages/Admin/Companies";
import UsersPage from "./pages/Admin/Users";
import BranchesPage from "./pages/Admin/Branches";
import KiosksPage from "./pages/Admin/Kiosks";
import TagsPage from "./pages/Admin/Tags";
import FeedbacksPage from "./pages/Admin/Feedbacks";
import SettingsPage from "./pages/Admin/Settings";
import DashboardPage from "./pages/Admin/Dashboard";
import { PrivateRoute } from "./routes/PrivateRoute";
import { RoleRoute } from "./routes/RoleRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import FeedbackKiosk from "./pages/Feedbacks";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />

            <Route
              element={
                <RoleRoute
                  allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"]}
                />
              }
            >
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="branches" element={<BranchesPage />} />
              <Route path="kiosks" element={<KiosksPage />} />
              <Route path="tags" element={<TagsPage />} />
              <Route path="feedbacks" element={<FeedbacksPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route
              element={
                <RoleRoute
                  allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN"]}
                />
              }
            >
              <Route path="users" element={<UsersPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN"]} />}>
              <Route path="companies" element={<CompaniesPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="feedback" element={<FeedbackKiosk />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}