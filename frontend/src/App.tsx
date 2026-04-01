import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./features/auth/hooks/use-auth-session";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { ExecutiveDashboardPage } from "./features/dashboard/pages/ExecutiveDashboardPage";
import { PartnerDetailPage } from "./features/partners/pages/PartnerDetailPage";
import { PartnersPage } from "./features/partners/pages/PartnersPage";
import { SettingsPage } from "./features/settings/pages/SettingsPage";
import { TaskQueuePage } from "./features/tasks/pages/TaskQueuePage";
import { ProtectedRoute } from "./shared/components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<ExecutiveDashboardPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/partners/:partnerId" element={<PartnerDetailPage />} />
            <Route path="/tasks" element={<TaskQueuePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
