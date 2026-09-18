import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import FactoryPage from "./pages/FactoryPage";
import OrdersPage from "./pages/OrdersPage";
import GanttPage from "./pages/GanttPage";
import MaintenancePage from "./pages/MaintenancePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SimulationPage from "./pages/SimulationPage";
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
            if (res.data?.user) {
              setUser(res.data.user);
              localStorage.setItem("user", JSON.stringify(res.data.user));
            }
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
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily: "Inter, -apple-system, sans-serif"
      }}>
        <div style={{
          width: "42px",
          height: "42px",
          borderRadius: "8px",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontWeight: 800,
          fontSize: "1.2rem",
          marginBottom: "1rem"
        }}>
          RF
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>ReFlow</div>
        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>
          Initializing Adaptive Production Intelligence...
        </div>
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
        <Route
          path="/signup"
          element={user ? <Navigate to="/factory" replace /> : <SignupPage onSignupSuccess={(u) => setUser(u)} />}
        />

        {/* PROTECTED ENTERPRISE ROUTES IN REFLOW APP LAYOUT */}
        <Route element={user ? <AppLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}>
          <Route path="/factory" element={<FactoryPage user={user} />} />
          <Route path="/orders" element={<OrdersPage user={user} />} />
          <Route path="/orders/:orderId" element={<OrdersPage user={user} />} />
          <Route path="/schedule" element={<GanttPage user={user} />} />
          <Route path="/schedule/:orderId" element={<GanttPage user={user} />} />
          <Route path="/orders/:orderId/gantt" element={<GanttPage user={user} />} />
          <Route path="/maintenance" element={<MaintenancePage user={user} />} />
          <Route path="/analytics" element={<AnalyticsPage user={user} />} />
          <Route path="/simulation" element={<SimulationPage user={user} />} />
          <Route path="/audit" element={<AuditLogPage user={user} />} />
          <Route path="/audit-logs" element={<Navigate to="/audit" replace />} />
          <Route path="*" element={<Navigate to="/factory" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
