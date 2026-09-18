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
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.error ||
        "Registration failed. Please check inputs.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bgMain p-4 font-sans antialiased selection:bg-primaryLight selection:text-primary">
      <div className="w-full max-w-lg bg-white border border-borderCol rounded-xl p-8 shadow-float">
        
        {/* ReFlow Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3 shadow-soft">
            <i className="fa-solid fa-industry"></i>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-textMain">
            Create ReFlow Account
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mt-0.5">
            Nilayam — Operational Registration
          </p>
          <p className="text-xs text-textSub mt-1">
            Manufacturing Operations & Disruption Management System
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-criticalLight border border-rose-200 text-critical text-xs font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation text-sm shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-textSub mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs font-medium text-textMain bg-white border border-borderCol rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
              placeholder="e.g. Ramesh Chandran"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-textSub mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-medium text-textMain bg-white border border-borderCol rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
                placeholder="e.g. ramesh_c"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-textSub mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-medium text-textMain bg-white border border-borderCol rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
                placeholder="e.g. ramesh@reflow.io"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-textSub mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-medium text-textMain bg-white border border-borderCol rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
                placeholder="Min 8 chars (letters + digits)"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-textSub mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-medium text-textMain bg-white border border-borderCol rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
                placeholder="Re-enter password"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-textSub mb-1">
              Operational Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`p-2.5 border rounded-md cursor-pointer text-center transition-all ${
                  role === "SUPERVISOR"
                    ? "bg-primaryLight border-primary text-primary font-bold shadow-sm"
                    : "bg-white border-borderCol text-textSub hover:border-gray-300"
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
                <div className="text-[10px] opacity-75 font-normal">Meerpaarvai</div>
              </label>

              <label
                className={`p-2.5 border rounded-md cursor-pointer text-center transition-all ${
                  role === "SERVICE_PERSON"
                    ? "bg-primaryLight border-primary text-primary font-bold shadow-sm"
                    : "bg-white border-borderCol text-textSub hover:border-gray-300"
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
                <div className="text-[10px] opacity-75 font-normal">Paramaippu</div>
              </label>

              <label
                className={`p-2.5 border rounded-md cursor-pointer text-center transition-all ${
                  role === "MANAGER"
                    ? "bg-primaryLight border-primary text-primary font-bold shadow-sm"
                    : "bg-white border-borderCol text-textSub hover:border-gray-300"
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
                <div className="text-[10px] opacity-75 font-normal">Nirvagam</div>
              </label>
            </div>
          </div>

          {role === "MANAGER" && (
            <div className="p-3 bg-primaryLight/40 border border-primary/20 rounded-md space-y-2">
              <div className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
                <i className="fa-solid fa-shield-halved"></i>
                Manager Role Requires Plant Administrator Key
              </div>
              <input
                type="text"
                value={adminInviteCode}
                onChange={(e) => setAdminInviteCode(e.target.value)}
                placeholder="Enter Manager Admin Key e.g. REFLOW-PLANT-ADMIN-2026"
                className="w-full px-3 py-1.5 text-xs text-textMain bg-white border border-borderCol rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-textSub">
                To test Manager capabilities without a key, please use the seeded demo manager account on the login page.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-primary hover:bg-[#5E3D55] text-white py-2.5 px-4 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
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
        <div className="mt-6 text-center text-xs text-textSub">
          Already have an operational account?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
