import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function SignupPage({ onLoginSuccess }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("SUPERVISOR");
  const [adminInviteCode, setAdminInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!(/[A-Za-z]/.test(password) && /\d/.test(password))) {
      setError("Password must contain both letters and digits.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/signup", {
        full_name: fullName,
        username: username.toLowerCase().trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        role,
        admin_invite_code: adminInviteCode
      });

      const payload = res.data?.data || res.data;
      const { access_token, refresh_token, user } = payload;

      localStorage.setItem("access_token", access_token);
      if (refresh_token) localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("user", JSON.stringify(user));

      if (onLoginSuccess) onLoginSuccess(user);
      navigate("/factory");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error?.message || err.response?.data?.error || "Registration failed. Please check inputs.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans antialiased">
      <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-xl p-8 shadow-card">
        
        {/* ReFlow Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#1E293B] rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3 shadow-sm">
            <i className="fa-solid fa-arrows-split-up-and-left"></i>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Create ReFlow Account
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] mt-0.5">
            Operational Registration
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            Join the Adaptive Production Facility Operations Team
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation text-sm shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1E293B] focus:ring-1 focus:ring-[#1E293B] transition-colors"
              placeholder="e.g. Ramesh Chandran"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1E293B] focus:ring-1 focus:ring-[#1E293B] transition-colors"
                placeholder="e.g. ramesh_c"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1E293B] focus:ring-1 focus:ring-[#1E293B] transition-colors"
                placeholder="e.g. ramesh@reflow.io"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1E293B] focus:ring-1 focus:ring-[#1E293B] transition-colors"
                placeholder="Min 8 characters (a-z, 0-9)"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1E293B] focus:ring-1 focus:ring-[#1E293B] transition-colors"
                placeholder="Re-enter password"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1">
              Operational Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`p-2.5 border rounded-lg cursor-pointer text-center transition-all ${
                  role === "SUPERVISOR"
                    ? "bg-blue-50 border-blue-400 text-blue-900 font-bold"
                    : "bg-white border-[#E2E8F0] text-[#64748B]"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="SUPERVISOR"
                  checked={role === "SUPERVISOR"}
                  onChange={() => setRole("SUPERVISOR")}
                  className="sr-only"
                />
                <div className="text-xs">Supervisor</div>
                <div className="text-[10px] opacity-75 font-normal">Floor Oversight</div>
              </label>

              <label
                className={`p-2.5 border rounded-lg cursor-pointer text-center transition-all ${
                  role === "SERVICE_PERSON"
                    ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold"
                    : "bg-white border-[#E2E8F0] text-[#64748B]"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="SERVICE_PERSON"
                  checked={role === "SERVICE_PERSON"}
                  onChange={() => setRole("SERVICE_PERSON")}
                  className="sr-only"
                />
                <div className="text-xs">Service Tech</div>
                <div className="text-[10px] opacity-75 font-normal">Maintenance</div>
              </label>

              <label
                className={`p-2.5 border rounded-lg cursor-pointer text-center transition-all ${
                  role === "MANAGER"
                    ? "bg-purple-50 border-purple-400 text-purple-900 font-bold"
                    : "bg-white border-[#E2E8F0] text-[#64748B]"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="MANAGER"
                  checked={role === "MANAGER"}
                  onChange={() => setRole("MANAGER")}
                  className="sr-only"
                />
                <div className="text-xs">Plant Manager</div>
                <div className="text-[10px] opacity-75 font-normal">Restricted Access</div>
              </label>
            </div>
          </div>

          {role === "MANAGER" && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
              <div className="text-[11px] font-semibold text-purple-900 flex items-center gap-1.5">
                <i className="fa-solid fa-shield-halved"></i>
                Manager Role Requires Plant Administrator Key
              </div>
              <input
                type="text"
                value={adminInviteCode}
                onChange={(e) => setAdminInviteCode(e.target.value)}
                placeholder="Enter Manager Admin Key e.g. REFLOW-PLANT-ADMIN-2026"
                className="w-full px-3 py-1.5 text-xs text-[#0F172A] bg-white border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-600"
              />
              <p className="text-[10px] text-purple-700">
                To test Manager capabilities without a key, please use the seeded demo manager account on the login page.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#1E293B] hover:bg-[#0F172A] text-white py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                <span>Registering Account in MongoDB...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <i className="fa-solid fa-user-check text-xs"></i>
              </>
            )}
          </button>
        </form>

        {/* Link to Login */}
        <div className="mt-6 text-center text-xs text-[#64748B]">
          Already have an operational account?{" "}
          <Link to="/login" className="text-[#2563EB] font-semibold hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
