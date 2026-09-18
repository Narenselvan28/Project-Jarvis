import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import FactoryPage from "./pages/FactoryPage";
import GanttPage from "./pages/GanttPage";
import PlanningPage from "./pages/PlanningPage";
import SupervisorPlansPage from "./pages/SupervisorPlansPage";
import MaintenancePage from "./pages/MaintenancePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AuditLogPage from "./pages/AuditLogPage";
import BookingReportPage from "./pages/BookingReportPage";
import api from "./services/api";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        api.get("/auth/me")
          .then((res) => {
            setUser(res.data.user);
            localStorage.setItem("user", JSON.stringify(res.data.user));
          })
          .catch(() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            setUser(null);
          })
          .finally(() => setCheckingAuth(false));
      } catch (e) {
        setUser(null);
        setCheckingAuth(false);
      }
    } else {
      setCheckingAuth(false);
    }
  }, []);

  const handleLogout = () => {
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", color: "#714b67", fontFamily: "sans-serif", fontSize: "0.875rem", fontWeight: 600 }}>
        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Initializing Fixoria Adaptive Platform...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/factory" replace /> : <LoginPage onLoginSuccess={(u) => setUser(u)} />}
        />

        {/* ALL OPERATIONAL PAGES EMBEDDED IN FIXORIA APP LAYOUT */}
        <Route element={user ? <AppLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}>
          <Route path="/factory" element={<FactoryPage user={user} />} />
          <Route path="/orders/:orderId/gantt" element={<GanttPage user={user} />} />
          <Route path="/gantt" element={<GanttPage user={user} />} />
          <Route path="/planning" element={<PlanningPage user={user} />} />
          <Route path="/supervisor/plans" element={<SupervisorPlansPage user={user} />} />
          <Route path="/maintenance" element={<MaintenancePage user={user} />} />
          <Route path="/analytics" element={<AnalyticsPage user={user} />} />
          <Route path="/audit-logs" element={<AuditLogPage user={user} />} />
          <Route path="/booking-report" element={<BookingReportPage />} />
          <Route path="/report" element={<BookingReportPage />} />
          <Route path="*" element={<Navigate to="/factory" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
