import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./features/auth/hooks/use-auth-session";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { PartnerDetailPage } from "./features/partners/pages/PartnerDetailPage";
import { PartnersPage } from "./features/partners/pages/PartnersPage";
import { ProtectedRoute } from "./shared/components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/partners/:partnerId" element={<PartnerDetailPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/partners" replace />} />
          <Route path="*" element={<Navigate to="/partners" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
