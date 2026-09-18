import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navigation from "./components/Navigation";
import LoginPage from "./pages/LoginPage";
import FactoryPage from "./pages/FactoryPage";
import GanttPage from "./pages/GanttPage";
import PlanningPage from "./pages/PlanningPage";
import SupervisorPlansPage from "./pages/SupervisorPlansPage";
import MaintenancePage from "./pages/MaintenancePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AuditLogPage from "./pages/AuditLogPage";
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#64748b", fontFamily: "monospace" }}>
        INITIALIZING ADAPTIVE MANUFACTURING PLATFORM...
      </div>
    );
  }

  return (
    <BrowserRouter>
      {user && <Navigation user={user} onLogout={handleLogout} />}

      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/factory" replace /> : <LoginPage onLoginSuccess={(u) => setUser(u)} />}
        />

        <Route
          path="/factory"
          element={user ? <FactoryPage user={user} /> : <Navigate to="/login" replace />}
        />

        {/* FEATURE 1: ORDER-LEVEL & MULTI-ORDER GANTT CHART */}
        <Route
          path="/orders/:orderId/gantt"
          element={user ? <GanttPage user={user} /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/gantt"
          element={user ? <GanttPage user={user} /> : <Navigate to="/login" replace />}
        />

        {/* INTELLIGENCE LOOP 1: NEW ORDER PLANNING */}
        <Route
          path="/planning"
          element={user ? <PlanningPage user={user} /> : <Navigate to="/login" replace />}
        />

        {/* SUPERVISOR PLAN REVIEW & HUMAN APPROVAL */}
        <Route
          path="/supervisor/plans"
          element={user ? <SupervisorPlansPage user={user} /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/maintenance"
          element={user ? <MaintenancePage user={user} /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/analytics"
          element={user ? <AnalyticsPage user={user} /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/audit-logs"
          element={user ? <AuditLogPage user={user} /> : <Navigate to="/login" replace />}
        />

        <Route path="*" element={<Navigate to={user ? "/factory" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
