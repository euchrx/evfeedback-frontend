import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { PrivateRoute } from "./routes/PrivateRoute";
import { RoleRoute } from "./routes/RoleRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import { isAuthenticated } from "./services/auth";

const LoginPage = lazy(() => import("./pages/Login"));
const CompaniesPage = lazy(() => import("./pages/Admin/Companies"));
const UsersPage = lazy(() => import("./pages/Admin/Users"));
const BranchesPage = lazy(() => import("./pages/Admin/Branches"));
const KiosksPage = lazy(() => import("./pages/Admin/Kiosks"));
const TagsPage = lazy(() => import("./pages/Admin/Tags"));
const FeedbacksPage = lazy(() => import("./pages/Admin/Feedbacks"));
const SettingsPage = lazy(() => import("./pages/Admin/Settings"));
const DashboardPage = lazy(() => import("./pages/Admin/Dashboard"));
const FeedbackKiosk = lazy(() => import("./pages/Feedbacks"));
const PublicFeedbacksPage = lazy(() => import("./pages/PublicFeedbacks"));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-slate-500">
      Carregando...
    </div>
  );
}

function LoginRoute() {
  return isAuthenticated() ? (
    <Navigate to="/admin/dashboard" replace />
  ) : (
    <LoginPage />
  );
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                to={isAuthenticated() ? "/admin/dashboard" : "/login"}
                replace
              />
            }
          />
          <Route path="/login" element={<LoginRoute />} />

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
                <Route path="feedbacks" element={<FeedbacksPage />} />
              </Route>

              <Route
                element={
                  <RoleRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN"]} />
                }
              >
                <Route path="tags" element={<TagsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              <Route
                element={
                  <RoleRoute allowedRoles={["SUPER_ADMIN", "COMPANY_ADMIN"]} />
                }
              >
                <Route path="users" element={<UsersPage />} />
                <Route path="branches" element={<BranchesPage />} />
                <Route path="kiosks" element={<KiosksPage />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN"]} />}>
                <Route path="companies" element={<CompaniesPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/feedback" element={<FeedbackKiosk />} />
          <Route path="/shared/feedbacks" element={<PublicFeedbacksPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
