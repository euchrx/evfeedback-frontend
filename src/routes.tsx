import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import FeedbackKiosk from "./pages/Feedback/KioskPage";
import DashboardPage from "./pages/Admin/Dashboard";
import KiosksPage from "./pages/Admin/Kiosks";
import FeedbacksPage from "./pages/Admin/Feedbacks";
import BranchesPage from "./pages/Admin/Branches";
import { AdminLayout } from "./components/admin/AdminLayout";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/feedback" replace />} />

        <Route path="/feedback" element={<FeedbackKiosk />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="kiosks" element={<KiosksPage />} />
          <Route path="feedbacks" element={<FeedbacksPage />} />
          <Route path="branches" element={<BranchesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/feedback" replace />} />
      </Routes>
    </BrowserRouter>
  );
}