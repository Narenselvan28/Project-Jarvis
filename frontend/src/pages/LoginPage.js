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
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-xl">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#714B67] rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3 shadow-sm">
            <i className="fa-solid fa-industry"></i>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">
            Fixoria <sup className="text-xs text-[#6B7280] font-normal">TM</sup>
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Adaptive Manufacturing Intelligence Platform
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#1F2937] focus:outline-none focus:border-[#714B67] focus:ring-2 focus:ring-[#F4EBF1] transition-all"
              placeholder="e.g. manager"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#1F2937] focus:outline-none focus:border-[#714B67] focus:ring-2 focus:ring-[#F4EBF1] transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#714B67] hover:bg-[#5C3D54] text-white py-2.5 px-4 rounded-lg text-sm font-semibold shadow-sm transition-all duration-150 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In to Platform</span>
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </>
            )}
          </button>
        </form>

        {/* Demonstration Quick-Switch Roles */}
        <div className="mt-8 pt-5 border-t border-[#E5E7EB]">
          <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider text-center mb-3">
            Instant Demo Logins
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => quickLogin("manager")}
              className="px-2.5 py-2 text-xs font-medium text-[#4B5563] bg-[#F9FAFB] hover:bg-[#F4EBF1] hover:text-[#714B67] border border-[#E5E7EB] rounded-lg transition-colors text-center"
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => quickLogin("supervisor")}
              className="px-2.5 py-2 text-xs font-medium text-[#4B5563] bg-[#F9FAFB] hover:bg-[#F4EBF1] hover:text-[#714B67] border border-[#E5E7EB] rounded-lg transition-colors text-center"
            >
              Supervisor
            </button>
            <button
              type="button"
              onClick={() => quickLogin("service")}
              className="px-2.5 py-2 text-xs font-medium text-[#4B5563] bg-[#F9FAFB] hover:bg-[#F4EBF1] hover:text-[#714B67] border border-[#E5E7EB] rounded-lg transition-colors text-center"
            >
              Service
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
