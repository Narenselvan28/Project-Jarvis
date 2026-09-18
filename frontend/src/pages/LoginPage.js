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
    <div className="min-h-screen flex items-center justify-center bg-bgMain p-4 font-sans antialiased selection:bg-primaryLight selection:text-primary">
      <div className="w-full max-w-md bg-white border border-borderCol rounded-xl p-8 shadow-float">
        {/* ReFlow Brand Header per ui.txt */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3 shadow-soft">
            <i className="fa-solid fa-industry"></i>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-textMain">
            ReFlow <sup className="text-xs text-textSub font-normal">TM</sup>
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mt-0.5">
            Nilayam — Adaptive Production Intelligence
          </p>
          <p className="text-xs text-textSub mt-1">
            Manufacturing Operations & Disruption Management
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-criticalLight border border-rose-200 text-critical text-xs font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation text-sm shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-textSub mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-textSub">
                <i className="fa-solid fa-user text-xs"></i>
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-xs font-medium text-textMain bg-white border border-borderCol rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
                placeholder="Enter username or email"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-textSub mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-textSub">
                <i className="fa-solid fa-lock text-xs"></i>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-xs font-medium text-textMain bg-white border border-borderCol rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primaryHover text-white py-2.5 px-4 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
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

        {/* Demo Accounts Panel (ONLY shown on Login Page per Section 20) */}
        <div className="mt-6 pt-5 border-t border-borderCol">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-textSub">
              Seeded Demo Accounts
            </span>
            <span className="text-[10px] text-primary font-medium">Click to fill</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("manager")}
              className="p-2.5 text-left bg-bgMain hover:bg-primaryLight border border-borderCol hover:border-primary rounded-md transition-all shadow-sm"
            >
              <div className="text-[11px] font-bold text-primary">Nirvagam</div>
              <div className="text-[10px] text-textSub">Manager</div>
              <div className="text-[9px] text-textSub font-mono mt-0.5">manager</div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("supervisor")}
              className="p-2.5 text-left bg-bgMain hover:bg-blue-50 border border-borderCol hover:border-blue-400 rounded-md transition-all shadow-sm"
            >
              <div className="text-[11px] font-bold text-blue-900">Meerpaarvai</div>
              <div className="text-[10px] text-textSub">Supervisor</div>
              <div className="text-[9px] text-textSub font-mono mt-0.5">supervisor</div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("service")}
              className="p-2.5 text-left bg-bgMain hover:bg-emerald-50 border border-borderCol hover:border-emerald-400 rounded-md transition-all shadow-sm"
            >
              <div className="text-[11px] font-bold text-emerald-900">Paramaippu</div>
              <div className="text-[10px] text-textSub">Service Tech</div>
              <div className="text-[9px] text-textSub font-mono mt-0.5">service</div>
            </button>
          </div>
        </div>

        {/* Link to Signup */}
        <div className="mt-6 text-center text-xs text-textSub">
          Need an operator account?{" "}
          <Link to="/signup" className="text-primary font-semibold hover:underline">
            Register for access
          </Link>
        </div>
      </div>
    </div>
  );
}
