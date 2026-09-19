import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";

export default function AdminPage({ user }) {
  const [activeTab, setActiveTab] = useState("overview"); // overview, machines, users, activity
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Overview Stats State
  const [stats, setStats] = useState({
    total_users: 0,
    total_machines: 0,
    available_machines: 0,
    running_machines: 0,
    failed_machines: 0,
    maintenance_machines: 0,
    active_orders: 0,
    pending_approvals: 0,
    active_schedules: 0,
    open_maintenance_requests: 0
  });

  // Machine Management State
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [editingMachine, setEditingMachine] = useState(null);
  const [machineSaving, setMachineSaving] = useState(false);

  // User Management State
  const [users, setUsers] = useState([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: "",
    full_name: "",
    email: "",
    role: "SUPERVISOR",
    password: ""
  });
  const [userSaving, setUserSaving] = useState(false);

  // System Activity / Audit State
  const [auditLogs, setAuditLogs] = useState([]);
  const [activityCategory, setActivityCategory] = useState("ALL");

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setSuccessMsg(null);
    } else {
      setSuccessMsg(msg);
      setErrorMsg(null);
    }
    setTimeout(() => {
      setErrorMsg(null);
      setSuccessMsg(null);
    }, 4000);
  };

  const loadOverview = useCallback(async () => {
    try {
      const res = await api.get("/admin/dashboard");
      const data = res.data?.data || res.data;
      if (data) setStats(data);
    } catch (err) {
      console.error("Failed to load admin overview:", err);
    }
  }, []);

  const loadMachines = useCallback(async () => {
    try {
      const res = await api.get("/admin/machines");
      const data = res.data?.data || res.data;
      setMachines(data.machines || data || []);
    } catch (err) {
      console.error("Failed to load admin machines:", err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get("/admin/users");
      const data = res.data?.data || res.data;
      setUsers(data.users || data || []);
    } catch (err) {
      console.error("Failed to load admin users:", err);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await api.get("/admin/audit-logs");
      const data = res.data?.data || res.data;
      setAuditLogs(data.logs || data || []);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadOverview(), loadMachines(), loadUsers(), loadAuditLogs()]);
    setLoading(false);
  }, [loadOverview, loadMachines, loadUsers, loadAuditLogs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Handle Machine Edit Save
  const handleSaveMachine = async (e) => {
    e.preventDefault();
    if (!editingMachine) return;
    try {
      setMachineSaving(true);
      await api.patch(`/admin/machines/${editingMachine.id}`, {
        status: editingMachine.status,
        name: editingMachine.name,
        process: editingMachine.process,
        capacity: Number(editingMachine.capacity),
        utilization: Number(editingMachine.utilization)
      });
      showNotification(`Machine ${editingMachine.id} updated successfully!`);
      setEditingMachine(null);
      await loadMachines();
      await loadOverview();
    } catch (err) {
      console.error("Save machine failed:", err);
      showNotification(err.response?.data?.error?.message || "Failed to update machine.", true);
    } finally {
      setMachineSaving(false);
    }
  };

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setUserSaving(true);
      await api.post("/admin/users", newUserData);
      showNotification(`User ${newUserData.username} created successfully!`);
      setShowCreateUserModal(false);
      setNewUserData({ username: "", full_name: "", email: "", role: "SUPERVISOR", password: "" });
      await loadUsers();
      await loadOverview();
    } catch (err) {
      console.error("Create user failed:", err);
      showNotification(err.response?.data?.error?.message || "Failed to create user.", true);
    } finally {
      setUserSaving(false);
    }
  };

  // Handle User Status Toggle
  const handleToggleUserStatus = async (targetUser) => {
    const nextActive = !targetUser.is_active;
    try {
      await api.patch(`/admin/users/${targetUser.id}`, { is_active: nextActive });
      showNotification(`User ${targetUser.username} ${nextActive ? "activated" : "disabled"}.`);
      await loadUsers();
    } catch (err) {
      console.error("Update user status failed:", err);
      showNotification(err.response?.data?.error?.message || "Failed to update user status.", true);
    }
  };

  // Handle User Role Change
  const handleUserRoleChange = async (targetUser, newRole) => {
    try {
      await api.patch(`/admin/users/${targetUser.id}`, { role: newRole });
      showNotification(`Role for ${targetUser.username} changed to ${newRole}.`);
      await loadUsers();
    } catch (err) {
      console.error("Update user role failed:", err);
      showNotification(err.response?.data?.error?.message || "Failed to change role.", true);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (activityCategory === "ALL") return true;
    const cat = log.category || log.event_category || log.action || "";
    return cat.toUpperCase().includes(activityCategory);
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-bgMain overflow-hidden p-6 antialiased">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primaryLight text-primary rounded-xl flex items-center justify-center font-bold text-lg border border-plum-100 shadow-soft">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-textMain tracking-tight">
                ReFlow Admin Panel & Governance
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primaryLight text-primary border border-plum-100 uppercase font-mono">
                System Administrator
              </span>
            </div>
            <p className="text-xs text-textSub mt-0.5">
              Enterprise management of users, workstation assets, operational policies, and immutable system audit trail
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshAll}
            disabled={loading}
            className="px-3.5 py-1.5 bg-white border border-borderCol hover:bg-bgMain text-textMain rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <i className={`fa-solid fa-rotate text-xs text-textSub ${loading ? "fa-spin" : ""}`}></i>
            <span>Refresh State</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-emerald-600"></i>
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 mb-4 rounded-lg bg-criticalLight border border-rose-200 text-critical text-xs font-semibold flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation text-critical"></i>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-borderCol mb-5 shrink-0">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-textSub hover:text-textMain"
          }`}
        >
          <i className="fa-solid fa-chart-pie"></i>
          <span>System Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("machines")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "machines"
              ? "border-primary text-primary"
              : "border-transparent text-textSub hover:text-textMain"
          }`}
        >
          <i className="fa-solid fa-industry"></i>
          <span>Machine Management</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
            {machines.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-textSub hover:text-textMain"
          }`}
        >
          <i className="fa-solid fa-users-gear"></i>
          <span>User Management</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("activity")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "activity"
              ? "border-primary text-primary"
              : "border-transparent text-textSub hover:text-textMain"
          }`}
        >
          <i className="fa-solid fa-timeline"></i>
          <span>System Activity & Audit</span>
        </button>
      </div>

      {/* TAB CONTENT CONTAINER */}
      <div className="flex-1 overflow-y-auto">
        {/* TAB 1: SYSTEM OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="p-4 bg-white border border-borderCol rounded-xl shadow-soft">
                <div className="flex items-center justify-between text-textSub text-xs mb-1">
                  <span>Total Users</span>
                  <i className="fa-solid fa-users text-primary"></i>
                </div>
                <div className="text-2xl font-bold font-mono text-textMain">{stats.total_users}</div>
                <div className="text-[11px] text-textSub mt-1">RBAC Registered</div>
              </div>

              <div className="p-4 bg-white border border-borderCol rounded-xl shadow-soft">
                <div className="flex items-center justify-between text-textSub text-xs mb-1">
                  <span>Total Machines</span>
                  <i className="fa-solid fa-server text-primary"></i>
                </div>
                <div className="text-2xl font-bold font-mono text-textMain">{stats.total_machines}</div>
                <div className="text-[11px] text-textSub mt-1">13 Production Stages</div>
              </div>

              <div className="p-4 bg-white border border-borderCol rounded-xl shadow-soft">
                <div className="flex items-center justify-between text-textSub text-xs mb-1">
                  <span>Available</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700">{stats.available_machines}</div>
                <div className="text-[11px] text-textSub mt-1">Ready for Dispatch</div>
              </div>

              <div className="p-4 bg-white border border-borderCol rounded-xl shadow-soft">
                <div className="flex items-center justify-between text-textSub text-xs mb-1">
                  <span>Running</span>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                </div>
                <div className="text-2xl font-bold font-mono text-blue-700">{stats.running_machines}</div>
                <div className="text-[11px] text-textSub mt-1">Under Production</div>
              </div>

              <div className="p-4 bg-white border border-borderCol rounded-xl shadow-soft">
                <div className="flex items-center justify-between text-textSub text-xs mb-1">
                  <span>Failed / Down</span>
                  <i className="fa-solid fa-triangle-exclamation text-critical"></i>
                </div>
                <div className="text-2xl font-bold font-mono text-critical">{stats.failed_machines}</div>
                <div className="text-[11px] text-textSub mt-1">Disruption Stoppages</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="p-4 bg-white border border-borderCol rounded-xl shadow-soft">
                <div className="flex items-center justify-between text-textSub text-xs mb-1">
                  <span>In Maintenance</span>
                  <i className="fa-solid fa-screwdriver-wrench text-amber-600"></i>
                </div>
                <div className="text-2xl font-bold font-mono text-amber-700">{stats.maintenance_machines}</div>
                <div className="text-[11px] text-textSub mt-1">Work Orders Active</div>
              </div>

              <div className="p-4 bg-white border border-borderCol rounded-xl shadow-soft">
                <div className="flex items-center justify-between text-textSub text-xs mb-1">
                  <span>Active Orders</span>
                  <i className="fa-solid fa-boxes-stacked text-primary"></i>
                </div>
                <div className="text-2xl font-bold font-mono text-textMain">{stats.active_orders}</div>
                <div className="text-[11px] text-textSub mt-1">Textile Batches</div>
              </div>

              <div className="p-4 bg-white border border-borderCol rounded-xl shadow-soft">
                <div className="flex items-center justify-between text-textSub text-xs mb-1">
                  <span>Pending Approvals</span>
                  <i className="fa-solid fa-clipboard-check text-blue-600"></i>
                </div>
                <div className="text-2xl font-bold font-mono text-blue-800">{stats.pending_approvals}</div>
                <div className="text-[11px] text-textSub mt-1">Awaiting Supervisor</div>
              </div>

              <div className="p-4 bg-white border border-borderCol rounded-xl shadow-soft">
                <div className="flex items-center justify-between text-textSub text-xs mb-1">
                  <span>Active Schedules</span>
                  <i className="fa-solid fa-calendar-check text-emerald-600"></i>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-800">{stats.active_schedules}</div>
                <div className="text-[11px] text-textSub mt-1">CP-SAT Optimized</div>
              </div>

              <div className="p-4 bg-white border border-borderCol rounded-xl shadow-soft">
                <div className="flex items-center justify-between text-textSub text-xs mb-1">
                  <span>Maintenance Orders</span>
                  <i className="fa-solid fa-file-invoice text-primary"></i>
                </div>
                <div className="text-2xl font-bold font-mono text-textMain">{stats.open_maintenance_requests}</div>
                <div className="text-[11px] text-textSub mt-1">Open Requests</div>
              </div>
            </div>

            {/* System Status Summary Card */}
            <div className="p-5 bg-white border border-borderCol rounded-xl shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-textSub">
                  Enterprise System Architecture & Engine Health
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <i className="fa-solid fa-circle-check mr-1.5"></i> All Subsystems Operational
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-bgMain rounded-lg border border-borderCol">
                  <div className="font-semibold text-textMain flex items-center gap-2">
                    <i className="fa-solid fa-database text-primary"></i> MongoDB Source of Truth
                  </div>
                  <div className="text-textSub mt-1">Strict ACID transactions, atomic schedule versioning, and zero transient state.</div>
                </div>
                <div className="p-3 bg-bgMain rounded-lg border border-borderCol">
                  <div className="font-semibold text-textMain flex items-center gap-2">
                    <i className="fa-solid fa-brain text-purple-600"></i> ML XGBoost Inference
                  </div>
                  <div className="text-textSub mt-1">Dynamic feature vectors for processing-time regression & failure-risk evaluation.</div>
                </div>
                <div className="p-3 bg-bgMain rounded-lg border border-borderCol">
                  <div className="font-semibold text-textMain flex items-center gap-2">
                    <i className="fa-solid fa-diagram-project text-blue-600"></i> Google OR-Tools CP-SAT
                  </div>
                  <div className="text-textSub mt-1">Constraint satisfaction solver for multi-stage textile routing & recovery options.</div>
                </div>
                <div className="p-3 bg-bgMain rounded-lg border border-borderCol">
                  <div className="font-semibold text-textMain flex items-center gap-2">
                    <i className="fa-solid fa-satellite-dish text-emerald-600"></i> Flask-SocketIO Broadcast
                  </div>
                  <div className="text-textSub mt-1">Real-time WebSocket event bus syncing Manager, Supervisor & Factory topology.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MACHINE MANAGEMENT */}
        {activeTab === "machines" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-textSub">
                Workstation Registry & Metadata Configuration
              </span>
              <span className="text-xs text-textSub">
                Admin can configure capacity, process classification, status, and baseline utilization.
              </span>
            </div>

            <div className="bg-white border border-borderCol rounded-xl shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-bgMain border-b border-borderCol text-[10px] font-bold text-textSub uppercase tracking-wider">
                      <th className="py-3 px-4">Machine ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Process Stage</th>
                      <th className="py-3 px-4 text-right">Capacity (kg/h)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Current Order</th>
                      <th className="py-3 px-4">Current Op</th>
                      <th className="py-3 px-4 text-right">Utilization</th>
                      <th className="py-3 px-4">Last Maintenance</th>
                      <th className="py-3 px-4 text-center">Failure Risk</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderCol text-textMain">
                    {machines.map((m) => {
                      const statusColor =
                        m.status === "AVAILABLE"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : m.status === "RUNNING"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : m.status === "FAILED"
                          ? "bg-rose-50 text-rose-800 border-rose-300 font-bold"
                          : "bg-amber-50 text-amber-800 border-amber-200";

                      const riskColor =
                        m.failure_risk > 0.4
                          ? "text-critical font-bold"
                          : m.failure_risk > 0.2
                          ? "text-amber-600 font-semibold"
                          : "text-emerald-700";

                      return (
                        <tr key={m.id} className="hover:bg-bgMain transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-primary">{m.id}</td>
                          <td className="py-3 px-4 font-semibold">{m.name}</td>
                          <td className="py-3 px-4 text-textSub">{m.process}</td>
                          <td className="py-3 px-4 text-right font-mono">{m.capacity || "—"}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] border ${statusColor}`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-textSub">{m.current_order || "IDLE"}</td>
                          <td className="py-3 px-4 text-textSub">{m.current_operation || "—"}</td>
                          <td className="py-3 px-4 text-right font-mono font-semibold">
                            {m.utilization ? `${(m.utilization * 100).toFixed(0)}%` : "0%"}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-textSub">{m.last_maintenance || "Recent"}</td>
                          <td className={`py-3 px-4 text-center font-mono text-xs ${riskColor}`}>
                            {m.failure_risk ? `${(m.failure_risk * 100).toFixed(1)}%` : "5.0%"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setEditingMachine({ ...m })}
                              className="px-2.5 py-1 bg-white border border-borderCol hover:bg-primaryLight hover:text-primary hover:border-primary text-textSub rounded text-xs transition-all"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: USER MANAGEMENT */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-textSub">
                Enterprise Users & Role-Based Access Control (RBAC)
              </span>
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="px-3.5 py-1.5 bg-primary hover:bg-primaryHover text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <i className="fa-solid fa-user-plus text-xs"></i>
                <span>Create New User</span>
              </button>
            </div>

            <div className="bg-white border border-borderCol rounded-xl shadow-soft overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-bgMain border-b border-borderCol text-[10px] font-bold text-textSub uppercase tracking-wider">
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderCol text-textMain">
                  {users.map((u) => {
                    const isActive = u.is_active !== false;
                    return (
                      <tr key={u.id} className="hover:bg-bgMain transition-colors">
                        <td className="py-3 px-4 font-mono text-textSub">{u.id}</td>
                        <td className="py-3 px-4 font-semibold">{u.full_name || u.username}</td>
                        <td className="py-3 px-4 font-mono text-primary font-bold">{u.username}</td>
                        <td className="py-3 px-4 text-textSub">{u.email || "—"}</td>
                        <td className="py-3 px-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleUserRoleChange(u, e.target.value)}
                            className="px-2 py-1 bg-white border border-borderCol rounded text-xs font-semibold text-textMain focus:outline-none focus:border-primary"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="SUPERVISOR">SUPERVISOR</option>
                            <option value="SERVICE_PERSON">SERVICE_PERSON</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isActive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-300"
                            }`}
                          >
                            {isActive ? "ACTIVE" : "DISABLED"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                              isActive
                                ? "text-critical border-rose-200 hover:bg-criticalLight"
                                : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            }`}
                          >
                            {isActive ? "Disable" : "Enable"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM ACTIVITY & AUDIT LOGS */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-textSub">
                Immutable System Activity Trail
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-textSub">Filter:</span>
                <select
                  value={activityCategory}
                  onChange={(e) => setActivityCategory(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white border border-borderCol rounded-md text-textMain focus:outline-none focus:border-primary"
                >
                  <option value="ALL">All Categories</option>
                  <option value="ORDER">Order Events</option>
                  <option value="MACHINE">Machine Events</option>
                  <option value="SCHEDULE">Schedule & Planning</option>
                  <option value="DISRUPTION">Disruptions & Recovery</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="USER">User Activity</option>
                </select>
              </div>
            </div>

            <div className="bg-white border border-borderCol rounded-xl shadow-soft overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-bgMain border-b border-borderCol text-[10px] font-bold text-textSub uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Event Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderCol text-textMain">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-bgMain transition-colors">
                        <td className="py-3 px-4 font-mono text-textSub text-[11px] whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Just now"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-textMain font-mono">{log.user_id || log.username || "system"}</td>
                        <td className="py-3 px-4 text-textSub text-[11px]">{log.user_role || "SYSTEM"}</td>
                        <td className="py-3 px-4 font-mono font-bold text-primary">{log.action || log.event_type}</td>
                        <td className="py-3 px-4 font-mono text-textSub">{log.entity_id || log.resource_id || "—"}</td>
                        <td className="py-3 px-4 text-textSub text-xs">
                          {log.details ? (typeof log.details === "object" ? JSON.stringify(log.details) : log.details) : log.notes || "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-xs text-textSub font-mono">
                        No audit events match selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* EDIT MACHINE MODAL */}
      {editingMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={() => setEditingMachine(null)}>
          <div className="w-full max-w-md bg-white border border-borderCol rounded-xl shadow-float p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-borderCol pb-3 mb-4">
              <h2 className="text-base font-bold text-textMain">
                Configure Machine: {editingMachine.id}
              </h2>
              <button
                onClick={() => setEditingMachine(null)}
                className="w-7 h-7 flex items-center justify-center text-textSub hover:text-textMain"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveMachine} className="space-y-3 text-xs">
              <div>
                <label className="block text-textSub font-medium mb-1">Machine Name</label>
                <input
                  type="text"
                  value={editingMachine.name || ""}
                  onChange={(e) => setEditingMachine({ ...editingMachine, name: e.target.value })}
                  className="w-full px-3 py-2 border border-borderCol rounded-md focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-textSub font-medium mb-1">Process Stage</label>
                <input
                  type="text"
                  value={editingMachine.process || ""}
                  onChange={(e) => setEditingMachine({ ...editingMachine, process: e.target.value })}
                  className="w-full px-3 py-2 border border-borderCol rounded-md focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-textSub font-medium mb-1">Capacity (kg/h)</label>
                  <input
                    type="number"
                    value={editingMachine.capacity || 0}
                    onChange={(e) => setEditingMachine({ ...editingMachine, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-borderCol rounded-md font-mono focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-textSub font-medium mb-1">Status</label>
                  <select
                    value={editingMachine.status || "AVAILABLE"}
                    onChange={(e) => setEditingMachine({ ...editingMachine, status: e.target.value })}
                    className="w-full px-3 py-2 border border-borderCol rounded-md font-semibold focus:outline-none focus:border-primary"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="RUNNING">RUNNING</option>
                    <option value="FAILED">FAILED</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="IDLE">IDLE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-textSub font-medium mb-1">Utilization Baseline (0.0 to 1.0)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={editingMachine.utilization || 0}
                  onChange={(e) => setEditingMachine({ ...editingMachine, utilization: e.target.value })}
                  className="w-full px-3 py-2 border border-borderCol rounded-md font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMachine(null)}
                  className="px-4 py-2 border border-borderCol text-textSub hover:bg-bgMain rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={machineSaving}
                  className="px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded-md font-medium flex items-center gap-1.5"
                >
                  {machineSaving && <i className="fa-solid fa-spinner fa-spin"></i>}
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={() => setShowCreateUserModal(false)}>
          <div className="w-full max-w-md bg-white border border-borderCol rounded-xl shadow-float p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-borderCol pb-3 mb-4">
              <h2 className="text-base font-bold text-textMain">Create New Enterprise User</h2>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="w-7 h-7 flex items-center justify-center text-textSub hover:text-textMain"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-textSub font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-borderCol rounded-md font-mono focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-textSub font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserData.full_name}
                  onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-borderCol rounded-md focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-textSub font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-borderCol rounded-md focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-textSub font-medium mb-1">Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-borderCol rounded-md font-semibold focus:outline-none focus:border-primary"
                >
                  <option value="SUPERVISOR">SUPERVISOR</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="SERVICE_PERSON">SERVICE_PERSON</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-textSub font-medium mb-1">Temporary Password</label>
                <input
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-borderCol rounded-md focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 border border-borderCol text-textSub hover:bg-bgMain rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userSaving}
                  className="px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded-md font-medium flex items-center gap-1.5"
                >
                  {userSaving && <i className="fa-solid fa-spinner fa-spin"></i>}
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
