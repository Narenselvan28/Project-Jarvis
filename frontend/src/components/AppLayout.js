import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";

export default function AppLayout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

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

  // Active route checks
  const isFactoryActive = location.pathname === "/factory" && !location.search.includes("view=orders");
  const isOrdersActive = (location.pathname === "/factory" && location.search.includes("view=orders")) || location.pathname === "/orders";
  const isSupervisorActive = location.pathname === "/supervisor";
  const isMaintenanceActive = location.pathname === "/maintenance";
  const isErpActive = location.pathname === "/erp";
  const isAnalyticsActive = location.pathname === "/analytics";
  const isAuditActive = location.pathname === "/audit" || location.pathname === "/audit-logs";
  const isAdminActive = location.pathname === "/admin";

  // Derive breadcrumb
  const getBreadcrumb = () => {
    if (isAdminActive) return { section: "Administration", title: "Admin Console & System Governance" };
    if (isFactoryActive) return { section: "Operations", title: "Factory Floor (Nilayam)" };
    if (isOrdersActive) return { section: "Operations", title: "Orders Registry (Aanaigal)" };
    if (isSupervisorActive) return { section: "Operations", title: "Supervisor Review (Meerpaarvai)" };
    if (isMaintenanceActive) return { section: "Maintenance", title: "Fleet Maintenance & Invoices (Paramaippu)" };
    if (isErpActive) return { section: "ERP", title: "Contracts, Materials & Workforce" };
    if (isAnalyticsActive) return { section: "Intelligence", title: "Production Analytics & ML Scorecards" };
    if (isAuditActive) return { section: "Admin", title: "Audit Trail & Governance" };
    return { section: "Operations", title: "Manufacturing Operations" };
  };

  const breadcrumb = getBreadcrumb();

  const rawRole = (user?.role || "OPERATOR").toUpperCase().replace(" ", "_");
  const isManager = rawRole === "MANAGER" || rawRole === "ADMIN";
  const isSupervisor = rawRole === "SUPERVISOR";
  const isServicePerson = rawRole === "SERVICE_PERSON" || rawRole === "SERVICE";

  const userRoleBadge =
    isManager
      ? "bg-purple-50 text-purple-800 border-purple-200"
      : isSupervisor
      ? "bg-blue-50 text-blue-800 border-blue-200"
      : "bg-emerald-50 text-emerald-800 border-emerald-200";

  return (
    <div className="bg-white text-textMain font-sans h-screen flex overflow-hidden antialiased selection:bg-primaryLight selection:text-primary">
      {/* SHRINKABLE SIDEBAR */}
      <aside
        className={`bg-white border-r border-borderCol flex flex-col shrink-0 z-30 select-none transition-all duration-200 ease-in-out ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-borderCol shrink-0 justify-between">
          <div className="flex items-center overflow-hidden">
            <div className="w-7 h-7 bg-primary rounded flex items-center justify-center text-white text-xs font-bold mr-2.5 shadow-sm shrink-0">
              <i className="fa-solid fa-industry"></i>
            </div>
            {!collapsed && (
              <span className="font-bold text-lg tracking-tight text-textMain truncate">
                ReFlow <sup className="text-[10px] text-textSub font-normal">ERP</sup>
              </span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="text-textSub hover:text-textMain transition-colors p-1 rounded hover:bg-bgMain"
          >
            <i className="fa-solid fa-bars-staggered text-sm"></i>
          </button>
        </div>

        {/* Facility Info Card (Expanded only) */}
        {!collapsed && (
          <div className="p-4 border-b border-borderCol shrink-0 bg-white">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primaryLight text-primary flex items-center justify-center text-[10px] font-bold border border-plum-100">
                  <i className="fa-solid fa-building"></i>
                </div>
                <span className="text-sm font-semibold text-textMain truncate">Nilayam — Unit 1</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="text-[11px] text-textSub ml-7">3 Lanes • 13 Processes • Live</div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {/* OPERATIONS SECTION (Manager, Supervisor, Admin) */}
          {(isManager || isSupervisor) && (
            <div>
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-bold text-textSub uppercase tracking-wider">
                  Operations
                </div>
              )}
              <ul className="space-y-0.5">
                <li>
                  <Link
                    to="/factory"
                    title={collapsed ? "Factory Floor" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      isFactoryActive
                        ? "bg-bgMain font-semibold text-primary border-l-2 border-primary"
                        : "text-textMain hover:bg-bgMain"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <i className="fa-solid fa-network-wired text-textSub w-4 text-center"></i>
                    {!collapsed && (
                      <div className="flex flex-col leading-tight">
                        <span>Factory Floor</span>
                        <span className="text-[10px] text-textSub opacity-80">Lanes & Topology</span>
                      </div>
                    )}
                  </Link>
                </li>

                <li>
                  <Link
                    to="/orders"
                    title={collapsed ? "Orders Registry" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      isOrdersActive
                        ? "bg-bgMain font-semibold text-primary border-l-2 border-primary"
                        : "text-textMain hover:bg-bgMain"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <i className="fa-solid fa-boxes-stacked text-textSub w-4 text-center"></i>
                    {!collapsed && (
                      <div className="flex flex-col leading-tight">
                        <span>Orders</span>
                        <span className="text-[10px] text-textSub opacity-80">Production Tracking</span>
                      </div>
                    )}
                  </Link>
                </li>

                <li>
                  <Link
                    to="/supervisor"
                    title={collapsed ? "Supervisor Review" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      isSupervisorActive
                        ? "bg-bgMain font-semibold text-primary border-l-2 border-primary"
                        : "text-textMain hover:bg-bgMain"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <i className="fa-solid fa-clipboard-check text-textSub w-4 text-center"></i>
                    {!collapsed && (
                      <div className="flex flex-col leading-tight">
                        <span>Supervisor Review</span>
                        <span className="text-[10px] text-textSub opacity-80">Plan Approvals</span>
                      </div>
                    )}
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* ERP SECTION (Manager, Supervisor, Admin) */}
          {(isManager || isSupervisor) && (
            <div>
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-bold text-textSub uppercase tracking-wider">
                  Enterprise ERP
                </div>
              )}
              <ul className="space-y-0.5">
                <li>
                  <Link
                    to="/erp"
                    title={collapsed ? "ERP Business Context" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      isErpActive
                        ? "bg-bgMain font-semibold text-primary border-l-2 border-primary"
                        : "text-textMain hover:bg-bgMain"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <i className="fa-solid fa-file-contract text-textSub w-4 text-center"></i>
                    {!collapsed && (
                      <div className="flex flex-col leading-tight">
                        <span>Contracts & ERP</span>
                        <span className="text-[10px] text-textSub opacity-80">BOM, Inventory, Workforce</span>
                      </div>
                    )}
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* MAINTENANCE SECTION (Manager, Supervisor, Service Person, Admin) */}
          <div>
            {!collapsed && (
              <div className="px-3 mb-2 text-[10px] font-bold text-textSub uppercase tracking-wider">
                Fleet Engineering
              </div>
            )}
            <ul className="space-y-0.5">
              <li>
                <Link
                  to="/maintenance"
                  title={collapsed ? "Maintenance Queue & Invoices" : undefined}
                  className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                    isMaintenanceActive
                      ? "bg-bgMain font-semibold text-primary border-l-2 border-primary"
                      : "text-textMain hover:bg-bgMain"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                >
                  <i className="fa-solid fa-screwdriver-wrench text-textSub w-4 text-center"></i>
                  {!collapsed && (
                    <div className="flex flex-col leading-tight">
                      <span>Maintenance</span>
                      <span className="text-[10px] text-textSub opacity-80">Work Orders & Invoices</span>
                    </div>
                  )}
                </Link>
              </li>
            </ul>
          </div>

          {/* ANALYTICS & ADMIN (Manager & Admin only) */}
          {isManager && (
            <div>
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-bold text-textSub uppercase tracking-wider">
                  Governance & Intelligence
                </div>
              )}
              <ul className="space-y-0.5">
                <li>
                  <Link
                    to="/analytics"
                    title={collapsed ? "Production Analytics" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      isAnalyticsActive
                        ? "bg-bgMain font-semibold text-primary border-l-2 border-primary"
                        : "text-textMain hover:bg-bgMain"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <i className="fa-solid fa-chart-line text-textSub w-4 text-center"></i>
                    {!collapsed && (
                      <div className="flex flex-col leading-tight">
                        <span>Analytics</span>
                        <span className="text-[10px] text-textSub opacity-80">Telemetry & ML Scorecards</span>
                      </div>
                    )}
                  </Link>
                </li>

                <li>
                  <Link
                    to="/audit"
                    title={collapsed ? "Audit & Governance" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      isAuditActive
                        ? "bg-bgMain font-semibold text-primary border-l-2 border-primary"
                        : "text-textMain hover:bg-bgMain"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <i className="fa-solid fa-shield-halved text-textSub w-4 text-center"></i>
                    {!collapsed && (
                      <div className="flex flex-col leading-tight">
                        <span>Audit Trail</span>
                        <span className="text-[10px] text-textSub opacity-80">Governance & Event Logs</span>
                      </div>
                    )}
                  </Link>
                </li>

                <li>
                  <Link
                    to="/admin"
                    title={collapsed ? "Admin Console" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      isAdminActive
                        ? "bg-bgMain font-semibold text-primary border-l-2 border-primary"
                        : "text-textMain hover:bg-bgMain"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <i className="fa-solid fa-gear text-textSub w-4 text-center"></i>
                    {!collapsed && (
                      <div className="flex flex-col leading-tight">
                        <span>Admin Console</span>
                        <span className="text-[10px] text-textSub opacity-80">User & System Governance</span>
                      </div>
                    )}
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-borderCol flex items-center justify-between shrink-0 bg-white">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-primaryLight text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-plum-100">
                  {user?.full_name ? user.full_name[0].toUpperCase() : (user?.username ? user.username[0].toUpperCase() : "U")}
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm font-semibold text-textMain leading-tight truncate">
                    {user?.full_name || user?.username || "Operator"}
                  </div>
                  <div className="text-[10px] text-textSub font-mono uppercase">
                    {rawRole}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out of ReFlow"
                className="w-7 h-7 flex items-center justify-center text-textSub hover:text-critical hover:bg-criticalLight rounded transition-colors"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              title={`Sign out (${user?.username || ""})`}
              className="w-full flex justify-center py-1 text-textSub hover:text-critical hover:bg-criticalLight rounded transition-colors"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
            </button>
          )}
        </div>
      </aside>

      {/* MAIN VIEWPORT CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden bg-bgMain">
        {/* TOP BAR */}
        <header className="h-14 bg-white border-b border-borderCol flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-2 text-xs text-textSub">
            <i className="fa-solid fa-house text-[10px]"></i>
            <span>/</span>
            <span>{breadcrumb.section}</span>
            <span>/</span>
            <span className="text-textMain font-medium">{breadcrumb.title}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-textSub hidden sm:inline-flex items-center gap-1.5 font-mono">
              <i className="fa-regular fa-clock text-[10px]"></i>
              Shift 1 • 06:00 - 14:00 IST
            </span>

            <div className="h-4 w-px bg-borderCol hidden sm:block"></div>

            <span className={`status-pill inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${userRoleBadge}`}>
              {rawRole}
            </span>
          </div>
        </header>

        {/* PRIMARY ROUTED VIEW */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-bgMain">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
