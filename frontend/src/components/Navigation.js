import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Navigation({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    if (onLogout) onLogout();
    navigate("/login");
  };

  const navItems = [
    { label: "Factory Flow", path: "/factory" },
    { label: "Schedules", path: "/schedules" },
    { label: "Maintenance", path: "/maintenance" },
    { label: "Analytics", path: "/analytics" },
    { label: "What-If Simulation", path: "/simulation" },
    { label: "Audit Logs", path: "/audit-logs" }
  ];

  return (
    <header className="top-navbar">
      <div className="brand-section">
        <div className="brand-logo-icon">APS</div>
        <div>
          <div className="brand-title">Adaptive Factory Platform</div>
          <div className="brand-subtitle">Autonomous Scheduling & Disruption Recovery</div>
        </div>
      </div>

      <nav className="nav-links">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="nav-controls">
        <div className="live-indicator">
          <div className="pulse-dot" />
          <span>LIVE TELEMETRY</span>
        </div>

        {user && (
          <div className="user-badge">
            <span style={{ color: "#94a3b8" }}>{user.full_name || user.username}</span>
            <span className="user-role-tag">{user.role}</span>
          </div>
        )}

        <button className="btn btn-secondary btn-sm" onClick={handleLogout} title="Sign Out">
          Logout
        </button>
      </div>
    </header>
  );
}
