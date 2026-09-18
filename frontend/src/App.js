import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import FactoryPage from "./pages/FactoryPage";
import SupervisorReviewPage from "./pages/SupervisorReviewPage";
import MaintenancePage from "./pages/MaintenancePage";
import SimulationPage from "./pages/SimulationPage";
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
        api
          .get("/auth/me")
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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F9FAFB",
          color: "#1F2937",
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "8px",
            background: "#714B67",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "1.2rem",
            marginBottom: "1rem"
          }}
        >
          <i className="fa-solid fa-industry"></i>
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1F2937" }}>ReFlow</div>
        <div style={{ fontSize: "0.8rem", color: "#6B7280", marginTop: "0.25rem" }}>
          Initializing Adaptive Production Operations...
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to="/factory" replace /> : <LoginPage onLoginSuccess={(u) => setUser(u)} />
          }
        />
        <Route
          path="/signup"
          element={
            user ? <Navigate to="/factory" replace /> : <SignupPage onLoginSuccess={(u) => setUser(u)} />
          }
        />

        {/* PROTECTED ENTERPRISE ROUTES IN REFLOW APP LAYOUT */}
        <Route
          element={
            user ? <AppLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
          }
        >
          {/* PRIMARY FACTORY FLOOR (Lanes & Orders views) */}
          <Route path="/factory" element={<FactoryPage user={user} />} />

          {/* ORDERS REGISTRY (Redirects to unified Orders view on Factory Floor) */}
          <Route path="/orders" element={<Navigate to="/factory?view=orders" replace />} />
          <Route path="/orders/:orderId" element={<Navigate to="/factory?view=orders" replace />} />

          {/* SUPERVISOR REVIEW (Meerpaarvai - Plan Approvals & Overrides) */}
          <Route path="/supervisor" element={<SupervisorReviewPage user={user} />} />

          {/* FLEET MAINTENANCE (Paramaippu - Work Orders & Machine Availability) */}
          <Route path="/maintenance" element={<MaintenancePage user={user} />} />

          {/* DISRUPTION SIMULATION SANDBOX (Ozhungu - What-if Modeling) */}
          <Route path="/simulation" element={<SimulationPage user={user} />} />

          {/* LEGACY REDIRECTS */}
          <Route path="/schedule" element={<Navigate to="/factory" replace />} />
          <Route path="/schedule/:orderId" element={<Navigate to="/factory?view=orders" replace />} />
          <Route path="/analytics" element={<Navigate to="/factory" replace />} />
          <Route path="/audit" element={<Navigate to="/factory" replace />} />
          <Route path="/audit-logs" element={<Navigate to="/factory" replace />} />
          <Route path="*" element={<Navigate to="/factory" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
