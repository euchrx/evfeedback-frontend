import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import FeedbackKiosk from "./pages/Feedbacks";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Admin/Dashboard";
import KiosksPage from "./pages/Admin/Kiosks";
import FeedbacksPage from "./pages/Admin/Feedbacks";
import BranchesPage from "./pages/Admin/Branches";
import { AdminLayout } from "./components/admin/AdminLayout";
import { PrivateRoute } from "./routes/PrivateRoute";
import TagsPage from "./pages/Admin/Tags";
import SettingsPage from "./pages/Admin/Settings";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/feedback" replace />} />
        <Route path="/feedback" element={<FeedbackKiosk />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="kiosks" element={<KiosksPage />} />
            <Route path="feedbacks" element={<FeedbacksPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/feedback" replace />} />
      </Routes>
    </BrowserRouter>
  );
}