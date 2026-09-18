import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function MaintenancePage({ user }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWO, setSelectedWO] = useState(null);
  const [repairNotes, setRepairNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");

  const isServicePerson = user?.role === "SERVICE_PERSON" || user?.role === "MANAGER";

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/maintenance");
      const payload = res.data?.data || res.data;
      setWorkOrders(payload.work_orders || payload || []);
    } catch (err) {
      console.error("Error loading maintenance work orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const handleUpdateStatus = async (woId, newStatus) => {
    try {
      setUpdating(true);
      await api.patch(`/maintenance/${woId}/status`, {
        status: newStatus,
        notes: repairNotes
      });
      setRepairNotes("");
      setSelectedWO(null);
      await loadWorkOrders();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert(err.response?.data?.error?.message || err.response?.data?.error || "Failed to update work order status.");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "OPEN":
        return "bg-red-50 text-red-700 border-red-300 font-bold";
      case "ASSIGNED":
        return "bg-blue-50 text-blue-700 border-blue-300 font-semibold";
      case "IN_PROGRESS":
        return "bg-purple-50 text-purple-700 border-purple-300 font-bold";
      case "REPAIRED":
        return "bg-teal-50 text-teal-800 border-teal-300 font-bold";
      case "VERIFIED":
      case "CLOSED":
        return "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold";
      default:
        return "bg-slate-50 text-slate-700 border-slate-300";
    }
  };

  const filteredOrders = workOrders.filter((wo) => {
    return filterStatus === "ALL" || wo.status === filterStatus;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-hidden p-6 antialiased">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
            <span>Paramaippu / Maintenance & Repair Engineering</span>
            <span className="text-xs font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
              {workOrders.length}
            </span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Fleet maintenance queue, technician fault diagnosis, repair lifecycles, and machine verification signoffs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none"
          >
            <option value="ALL">All Lifecycles</option>
            <option value="OPEN">Open (Awaiting Technician)</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress (Under Repair)</option>
            <option value="REPAIRED">Repaired (Ready for Verification)</option>
            <option value="VERIFIED">Verified & Closed</option>
          </select>

          <button
            onClick={loadWorkOrders}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <i className="fa-solid fa-rotate text-xs"></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="flex-1 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Workstation</th>
                <th className="py-3 px-4">Reported Fault</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Est. Repair Time</th>
                <th className="py-3 px-4">Assigned Technician</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Service Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-mono text-xs">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Loading maintenance tickets from MongoDB...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((wo) => {
                  const isCritical = wo.priority === "URGENT" || wo.priority === "HIGH";

                  return (
                    <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {wo.id}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {wo.machine_id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {wo.fault_type || "Mechanical Maintenance"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] ${
                          isCritical ? "bg-red-50 border-red-300 text-red-700 font-bold" : "bg-slate-50 border-slate-300 text-slate-700"
                        }`}>
                          {wo.priority || "HIGH"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {wo.estimated_hours || 4.0} hrs
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {wo.assigned_to || "Viktor Stone (Service Tech)"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] ${getStatusBadge(wo.status)}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedWO(wo)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-[#1E293B] hover:text-white rounded transition-colors"
                        >
                          Manage Repair →
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-mono text-xs">
                    No active maintenance tickets matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Repair Action Modal */}
      {selectedWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={() => setSelectedWO(null)}>
          <div
            className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-xl shadow-modal p-6 flex flex-col antialiased"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
              <div>
                <span className="text-xs font-mono text-blue-700 font-bold">{selectedWO.id}</span>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Remediate Machine {selectedWO.machine_id}
                </h2>
                <p className="text-xs text-[#64748B]">
                  Fault: {selectedWO.fault_type} • Current Lifecycle: <strong className="text-slate-800">{selectedWO.status}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedWO(null)}
                className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] flex items-center justify-center text-sm"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-4">
              {/* Lifecycle progression bar */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Maintenance Lifecycle Flow (Section 34)
                </span>
                <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-600">
                  <span className={selectedWO.status === "OPEN" ? "font-bold text-red-600" : ""}>OPEN</span>
                  <span>→</span>
                  <span className={selectedWO.status === "ASSIGNED" ? "font-bold text-blue-600" : ""}>ASSIGNED</span>
                  <span>→</span>
                  <span className={selectedWO.status === "IN_PROGRESS" ? "font-bold text-purple-600" : ""}>IN_PROGRESS</span>
                  <span>→</span>
                  <span className={selectedWO.status === "REPAIRED" ? "font-bold text-teal-600" : ""}>REPAIRED</span>
                  <span>→</span>
                  <span className={selectedWO.status === "VERIFIED" ? "font-bold text-emerald-600" : ""}>VERIFIED</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Technician Diagnostic Notes
                </label>
                <textarea
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  placeholder="Record diagnostic findings, replaced parts, sensor calibration telemetry..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs text-[#0F172A] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800 font-sans"
                />
              </div>

              {/* Action Buttons based on current lifecycle step */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Authorized State Transitions
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {selectedWO.status === "OPEN" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedWO.id, "ASSIGNED")}
                      disabled={updating}
                      className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Accept Work Order
                    </button>
                  )}

                  {(selectedWO.status === "ASSIGNED" || selectedWO.status === "OPEN") && (
                    <button
                      onClick={() => handleUpdateStatus(selectedWO.id, "IN_PROGRESS")}
                      disabled={updating}
                      className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Start Repair Work
                    </button>
                  )}

                  {selectedWO.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedWO.id, "REPAIRED")}
                      disabled={updating}
                      className="py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Mark Repaired
                    </button>
                  )}

                  {selectedWO.status === "REPAIRED" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedWO.id, "VERIFIED")}
                      disabled={updating}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Verify & Restore Machine
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={() => setSelectedWO(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
