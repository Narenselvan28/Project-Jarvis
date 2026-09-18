import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
      const payload = res.data?.data || res.data;
      const { access_token, refresh_token, user } = payload;

      localStorage.setItem("access_token", access_token);
      if (refresh_token) localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("user", JSON.stringify(user));

      if (onLoginSuccess) onLoginSuccess(user);
      navigate("/factory");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error?.message || err.response?.data?.error || "Authentication failed. Please check credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userRole, userPass = "password123") => {
    setUsername(userRole);
    setPassword(userPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans antialiased">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-xl p-8 shadow-card">
        
        {/* ReFlow Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#1E293B] rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3 shadow-sm">
            <i className="fa-solid fa-arrows-split-up-and-left"></i>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            ReFlow
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] mt-0.5">
            Adaptive Production Intelligence
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            Manufacturing Operations & Disruption Recovery
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation text-sm shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#94A3B8]">
                <i className="fa-solid fa-user text-xs"></i>
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1E293B] focus:ring-1 focus:ring-[#1E293B] transition-colors"
                placeholder="Enter username or email"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#94A3B8]">
                <i className="fa-solid fa-lock text-xs"></i>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1E293B] focus:ring-1 focus:ring-[#1E293B] transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E293B] hover:bg-[#0F172A] text-white py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                <span>Authenticating JWT...</span>
              </>
            ) : (
              <>
                <span>Sign In to Plant Floor</span>
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Panel (ONLY shown on Login Page per Section 9) */}
        <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Seeded Demo Accounts
            </span>
            <span className="text-[10px] text-[#2563EB] font-medium">Click to fill</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("manager")}
              className="p-2 text-left bg-[#F8FAFC] hover:bg-purple-50 border border-[#E2E8F0] hover:border-purple-300 rounded-lg transition-all"
            >
              <div className="text-[11px] font-bold text-purple-900">Manager</div>
              <div className="text-[9px] text-[#64748B] font-mono">manager</div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("supervisor")}
              className="p-2 text-left bg-[#F8FAFC] hover:bg-blue-50 border border-[#E2E8F0] hover:border-blue-300 rounded-lg transition-all"
            >
              <div className="text-[11px] font-bold text-blue-900">Supervisor</div>
              <div className="text-[9px] text-[#64748B] font-mono">supervisor</div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("service")}
              className="p-2 text-left bg-[#F8FAFC] hover:bg-emerald-50 border border-[#E2E8F0] hover:border-emerald-300 rounded-lg transition-all"
            >
              <div className="text-[11px] font-bold text-emerald-900">Service</div>
              <div className="text-[9px] text-[#64748B] font-mono">service</div>
            </button>
          </div>
        </div>

        {/* Link to Signup */}
        <div className="mt-6 text-center text-xs text-[#64748B]">
          Need an operational account?{" "}
          <Link to="/signup" className="text-[#2563EB] font-semibold hover:underline">
            Register for access
          </Link>
        </div>
      </div>
    </div>
  );
}
