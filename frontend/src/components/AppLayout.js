import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";

export default function AppLayout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    if (onLogout) onLogout();
    navigate("/login");
  };

  const navGroups = [
    {
      title: "OPERATIONS",
      items: [
        { label: "Factory Floor", path: "/factory", icon: "fa-solid fa-industry" },
        { label: "Order Gantt", path: "/gantt", icon: "fa-solid fa-chart-gantt" },
        { label: "New Order Planning", path: "/planning", icon: "fa-solid fa-wand-magic-sparkles" },
        { label: "Supervisor Review", path: "/supervisor/plans", icon: "fa-solid fa-clipboard-check", badge: "Live" }
      ]
    },
    {
      title: "FLEET & MAINTENANCE",
      items: [
        { label: "Maintenance Queue", path: "/maintenance", icon: "fa-solid fa-screwdriver-wrench" }
      ]
    },
    {
      title: "ANALYTICS & REPORTS",
      items: [
        { label: "Telemetry & ML", path: "/analytics", icon: "fa-solid fa-chart-line" },
        { label: "Audit & Governance", path: "/audit-logs", icon: "fa-solid fa-shield-halved" },
        { label: "Booking Report", path: "/booking-report", icon: "fa-solid fa-file-invoice-dollar" }
      ]
    }
  ];

  // Derive current page title for breadcrumb
  const getCurrentPageTitle = () => {
    const p = location.pathname;
    if (p.startsWith("/factory")) return "Factory Floor Overview";
    if (p.startsWith("/gantt") || p.includes("/gantt")) return "Production Gantt Schedule";
    if (p.startsWith("/planning")) return "New Order Planning";
    if (p.startsWith("/supervisor")) return "Supervisor Plan Review";
    if (p.startsWith("/maintenance")) return "Maintenance Engineering";
    if (p.startsWith("/analytics")) return "Industrial Telemetry & ML";
    if (p.startsWith("/audit-logs")) return "Operational Audit Trail";
    if (p.startsWith("/booking-report") || p.startsWith("/report")) return "Booking Report";
    return "Operations";
  };

  return (
    <div className="bg-[#F9FAFB] text-[#1F2937] font-sans h-screen flex overflow-hidden antialiased">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-[260px] bg-white border-r border-[#E5E7EB] flex flex-col shrink-0 z-30 select-none">
        
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-[#E5E7EB] shrink-0">
          <div className="w-7 h-7 bg-[#714B67] rounded flex items-center justify-center text-white text-xs font-bold mr-2.5 shadow-sm">
            <i className="fa-solid fa-industry text-[11px]"></i>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-[#1F2937] leading-tight flex items-center gap-1">
              Fixoria <sup className="text-[9px] text-[#6B7280] font-normal tracking-normal">TM</sup>
            </span>
            <span className="text-[10px] text-[#714B67] font-medium tracking-wide">Adaptive Manufacturing</span>
          </div>
        </div>

        {/* Facility Info Card */}
        <div className="p-3.5 border-b border-[#E5E7EB] shrink-0 bg-[#FAFAFA]">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#F4EBF1] text-[#714B67] flex items-center justify-center text-[10px] font-bold">
                <i className="fa-solid fa-building"></i>
              </div>
              <span className="text-xs font-semibold text-[#1F2937]">Plant Alpha — Unit 1</span>
            </div>
            <i className="fa-solid fa-circle-check text-[10px] text-[#10B981]" title="Operational"></i>
          </div>
          <div className="text-[10px] text-[#6B7280] ml-7">3 shifts active • OR-Tools v9</div>
        </div>

        {/* Quick Action CTA */}
        <div className="px-3 pt-3">
          <button
            onClick={() => navigate("/planning")}
            className="w-full bg-[#714B67] hover:bg-[#5C3D54] text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
          >
            <i className="fa-solid fa-plus text-[10px]"></i>
            <span>New Order Plan</span>
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {navGroups.map((grp) => (
            <div key={grp.title}>
              <div className="px-3 mb-1.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                {grp.title}
              </div>
              <ul className="space-y-0.5">
                {grp.items.map((item) => {
                  const isActive = location.pathname === item.path || 
                    (item.path !== "/" && location.pathname.startsWith(item.path));
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                          isActive
                            ? "bg-[#F4EBF1] text-[#714B67] font-semibold"
                            : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1F2937]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <i className={`${item.icon} w-4 text-center text-xs ${isActive ? "text-[#714B67]" : "text-[#6B7280]"}`}></i>
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#10B981] text-white font-bold">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-[#E5E7EB] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#F4EBF1] text-[#714B67] font-bold flex items-center justify-center text-xs border border-[#E5E7EB] shrink-0">
              {user?.username?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-[#1F2937] truncate leading-tight">
                {user?.full_name || user?.username || "Operator"}
              </div>
              <div className="text-[10px] text-[#6B7280] uppercase font-mono">
                {user?.role || "USER"}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="text-[#6B7280] hover:text-[#E11D48] p-1.5 rounded-md hover:bg-rose-50 transition-colors"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F9FAFB]">
        
        {/* TOP BAR */}
        <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 shrink-0 z-20">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <i className="fa-solid fa-house text-[10px]"></i>
            <span>/</span>
            <span>Fixoria</span>
            <span>/</span>
            <span className="font-semibold text-[#1F2937]">{getCurrentPageTitle()}</span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>LIVE TELEMETRY</span>
            </div>

            {/* Date Tag */}
            <div className="hidden md:flex items-center gap-1.5 bg-[#F9FAFB] border border-[#E5E7EB] px-2.5 py-1 rounded-md text-xs text-[#4B5563]">
              <i className="fa-regular fa-calendar text-[11px] text-[#6B7280]"></i>
              <span className="font-medium text-[11px]">Today: {new Date().toLocaleDateString("en-GB")}</span>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => navigate("/audit-logs")}
              title="System Alerts"
              className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-50 transition-colors relative"
            >
              <i className="fa-regular fa-bell text-xs"></i>
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#E11D48] rounded-full"></span>
            </button>

            {/* Documentation / Info */}
            <button
              onClick={() => navigate("/analytics")}
              title="Platform Analytics"
              className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-50 transition-colors"
            >
              <i className="fa-regular fa-circle-question text-xs"></i>
            </button>
          </div>
        </header>

        {/* OUTLET / MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto bg-[#F9FAFB]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
