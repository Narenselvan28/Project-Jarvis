import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("manager");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await api.post("/auth/login", { username, password });
      const { access_token, user } = res.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      if (onLoginSuccess) onLoginSuccess(user);
      navigate("/factory");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (userRole, userPass = "password123") => {
    setUsername(userRole);
    setPassword(userPass);
    // Submit
    setLoading(true);
    api.post("/auth/login", { username: userRole, password: userPass })
      .then((res) => {
        const { access_token, user } = res.data;
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("user", JSON.stringify(user));
        if (onLoginSuccess) onLoginSuccess(user);
        navigate("/factory");
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Authentication failed.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#080c16",
        backgroundImage: "radial-gradient(circle, #1a263d 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        padding: "1rem"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#0f172a",
          border: "1px solid #243452",
          borderRadius: "6px",
          padding: "2rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              background: "#1e3a8a",
              border: "1px solid #3b82f6",
              borderRadius: "6px",
              margin: "0 auto 0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "18px",
              color: "#60a5fa"
            }}
          >
            APS
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Control Room Access
          </h2>
          <p style={{ fontSize: "0.78rem", color: "#64748b", fontFamily: "monospace", marginTop: "0.25rem" }}>
            Adaptive Production Scheduling & Disruption Recovery
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "0.6rem 0.85rem",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fca5a5",
              fontSize: "0.78rem",
              borderRadius: "4px",
              marginBottom: "1rem"
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontFamily: "monospace", color: "#94a3b8", marginBottom: "0.35rem" }}>
              OPERATOR USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                background: "#080d1a",
                border: "1px solid #243452",
                color: "#f8fafc",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.85rem"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontFamily: "monospace", color: "#94a3b8", marginBottom: "0.35rem" }}>
              SECURITY KEY / PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                background: "#080d1a",
                border: "1px solid #243452",
                color: "#f8fafc",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.85rem"
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: "0.65rem", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Enter Industrial Control System"}
          </button>
        </form>

        {/* Quick Role Switcher for Demonstration */}
        <div style={{ marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "monospace", textAlign: "center", marginBottom: "0.6rem" }}>
            DEMONSTRATION QUICK-SWITCH ROLES
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => quickLogin("manager")}
              style={{ fontSize: "0.7rem" }}
            >
              Manager
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => quickLogin("supervisor")}
              style={{ fontSize: "0.7rem" }}
            >
              Supervisor
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => quickLogin("service")}
              style={{ fontSize: "0.7rem" }}
            >
              Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
