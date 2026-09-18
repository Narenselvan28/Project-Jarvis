import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";

export default function AppLayout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Collapsible sidebar state persisted locally
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("reflow_sidebar_collapsed") === "true";
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("reflow_sidebar_collapsed", String(next));
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    if (onLogout) onLogout();
    navigate("/login");
  };

  const navItems = [
    {
      tamil: "Nilayam",
      label: "Factory Floor",
      path: "/factory",
      icon: "fa-solid fa-industry"
    },
    {
      tamil: "Aanaigal",
      label: "Orders",
      path: "/orders",
      icon: "fa-solid fa-boxes-stacked"
    },
    {
      tamil: "Neram",
      label: "Schedule",
      path: "/schedule",
      icon: "fa-solid fa-chart-gantt"
    },
    {
      tamil: "Paramaippu",
      label: "Maintenance",
      path: "/maintenance",
      icon: "fa-solid fa-screwdriver-wrench"
    },
    {
      tamil: "Arivu",
      label: "Analytics",
      path: "/analytics",
      icon: "fa-solid fa-chart-line"
    },
    {
      tamil: "Ozhungu",
      label: "Simulation",
      path: "/simulation",
      icon: "fa-solid fa-flask-vial"
    },
    {
      tamil: "Meerpaarvai",
      label: "Audit",
      path: "/audit",
      icon: "fa-solid fa-shield-halved"
    }
  ];

  // Derive current page title for breadcrumb
  const getCurrentPageTitle = () => {
    const p = location.pathname;
    if (p.startsWith("/factory")) return "Nilayam / Factory Operations Floor";
    if (p.startsWith("/orders")) return "Aanaigal / Order Operations & Routing";
    if (p.startsWith("/schedule") || p.includes("/gantt")) return "Neram / Production Gantt Schedule";
    if (p.startsWith("/maintenance")) return "Paramaippu / Fleet Maintenance Queue";
    if (p.startsWith("/analytics")) return "Arivu / Industrial Telemetry & ML";
    if (p.startsWith("/simulation")) return "Ozhungu / What-If Disruption Sandbox";
    if (p.startsWith("/audit")) return "Meerpaarvai / Governance & Audit Log";
    return "Operations";
  };

  const userRole = user?.role || "OPERATOR";
  const userRoleColor =
    userRole === "MANAGER"
      ? "bg-purple-100 text-purple-800 border-purple-200"
      : userRole === "SUPERVISOR"
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-emerald-100 text-emerald-800 border-emerald-200";

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] font-sans h-screen flex overflow-hidden antialiased">
      {/* COLLAPSIBLE SIDEBAR */}
      <aside
        className={`bg-white border-r border-[#E2E8F0] flex flex-col shrink-0 z-30 select-none transition-all duration-200 ease-in-out ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E2E8F0] shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-[#1E293B] rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
              <i className="fa-solid fa-arrows-split-up-and-left text-xs"></i>
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-base tracking-tight text-[#0F172A] leading-tight">
                  ReFlow
                </span>
                <span className="text-[10px] text-[#2563EB] font-medium tracking-wide truncate">
                  Adaptive Intelligence
                </span>
              </div>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors border border-[#E2E8F0]"
          >
            <i className={`fa-solid ${collapsed ? "fa-angles-right" : "fa-angles-left"} text-xs`}></i>
          </button>
        </div>

        {/* Facility Info Card (Expanded only) */}
        {!collapsed && (
          <div className="p-3 border-b border-[#E2E8F0] shrink-0 bg-[#F8FAFC]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center text-[10px] font-bold">
                  <i className="fa-solid fa-building"></i>
                </div>
                <span className="text-xs font-semibold text-[#0F172A]">Nilayam — Unit 1</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active
              </span>
            </div>
            <div className="text-[10px] text-[#64748B] ml-7 mt-0.5">
              3 Lanes • 13 Processes • OR-Tools v9
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === "/orders" && location.pathname.startsWith("/orders")) ||
              (item.path === "/schedule" && location.pathname.includes("gantt"));

            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? `${item.tamil} / ${item.label}` : undefined}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#1E293B] text-white shadow-sm"
                    : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                <i
                  className={`${item.icon} text-sm ${
                    isActive ? "text-white" : "text-[#64748B] group-hover:text-[#0F172A]"
                  }`}
                ></i>
                {!collapsed && (
                  <div className="flex flex-col overflow-hidden leading-tight">
                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-75">
                      {item.tamil}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Account & Logout Footer */}
        <div className="p-3 border-t border-[#E2E8F0] shrink-0 bg-[#F8FAFC]">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.full_name ? user.full_name[0].toUpperCase() : "U"}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-semibold text-[#0F172A] truncate">
                    {user?.full_name || user?.username || "Authenticated"}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded border w-fit uppercase ${userRoleColor}`}
                  >
                    {userRole}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out of ReFlow"
                className="w-7 h-7 flex items-center justify-center text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title={`Sign out (${user?.username || ""})`}
              className="w-full flex justify-center py-2 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
            </button>
          )}
        </div>
      </aside>

      {/* MAIN VIEWPORT CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* TOPBAR */}
        <header className="h-14 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
              <span>{getCurrentPageTitle()}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B] hidden md:inline-flex items-center gap-1.5">
              <i className="fa-regular fa-clock"></i>
              Shift 1 • 06:00 - 14:00
            </span>
            <div className="h-4 w-px bg-[#E2E8F0] hidden md:block"></div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${userRoleColor}`}
            >
              {userRole}
            </span>
          </div>
        </header>

        {/* PRIMARY ROUTED OUTLET */}
        <main className="flex-1 overflow-hidden relative flex flex-col bg-[#F8FAFC]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
