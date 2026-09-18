import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function MaintenancePage({ user }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWO, setSelectedWO] = useState(null);
  const [repairNotes, setRepairNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");

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

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedWO(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        return "bg-criticalLight text-critical border border-rose-200 font-bold";
      case "ASSIGNED":
        return "bg-blue-50 text-blue-700 border border-blue-200 font-semibold";
      case "IN_PROGRESS":
        return "bg-purple-50 text-purple-700 border border-purple-200 font-bold";
      case "REPAIRED":
        return "bg-teal-50 text-teal-800 border border-teal-200 font-bold";
      case "VERIFIED":
      case "CLOSED":
        return "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

  const filteredOrders = workOrders.filter((wo) => {
    return filterStatus === "ALL" || wo.status === filterStatus;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-bgMain overflow-hidden p-6 antialiased">
      {/* Page Header matching ui.txt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary border border-borderCol shadow-soft">
            <i className="fa-solid fa-screwdriver-wrench text-xl"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-textMain">Paramaippu — Fleet Maintenance Queue</h1>
              <span className="text-[10px] bg-primaryLight text-primary font-bold px-2 py-0.5 rounded-full border border-plum-100 font-mono">
                {workOrders.length} Tickets
              </span>
            </div>
            <p className="text-xs text-textSub mt-0.5">
              Service technician work order dispatch, failure diagnostics, repairs, and verification sign-offs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-xs text-textMain bg-white border border-borderCol rounded-md focus:outline-none focus:border-primary shadow-sm"
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
            className="px-3 py-1.5 text-xs font-medium text-textMain bg-white border border-borderCol hover:bg-bgMain rounded-md flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <i className="fa-solid fa-rotate text-xs text-textSub"></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Work Orders Table per ui.txt */}
      <div className="flex-1 bg-white border border-borderCol rounded-xl overflow-hidden shadow-soft flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-borderCol text-[10px] font-semibold text-textSub uppercase tracking-wider sticky top-0 z-10">
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Workstation</th>
                <th className="py-3 px-4">Reported Fault</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Est. Repair Time</th>
                <th className="py-3 px-4">Assigned Technician</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs text-textMain divide-y divide-borderCol">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-textSub font-mono text-xs">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Loading maintenance tickets from MongoDB...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((wo) => {
                  const isCritical = wo.priority === "URGENT" || wo.priority === "HIGH";

                  return (
                    <tr key={wo.id} className="hover:bg-bgMain transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {wo.id}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-textMain">
                        {wo.machine_id}
                      </td>
                      <td className="py-3 px-4 font-medium text-textMain">
                        {wo.fault_type || "Mechanical Maintenance"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`status-pill inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${
                          isCritical ? "bg-criticalLight text-critical border border-rose-200 font-bold" : "bg-slate-50 text-slate-700 border border-slate-200"
                        }`}>
                          {wo.priority || "HIGH"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-textSub">
                        {wo.estimated_hours || 4.0} hrs
                      </td>
                      <td className="py-3 px-4 text-textMain">
                        {wo.assigned_to || "Viktor Stone (Service Tech)"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`status-pill inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] ${getStatusBadge(wo.status)}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedWO(wo)}
                          className="px-2.5 py-1 text-[11px] font-medium text-primary bg-primaryLight hover:bg-primary hover:text-white rounded-md transition-colors shadow-sm"
                        >
                          Manage Repair →
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-textSub font-mono text-xs">
                    No active maintenance tickets matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Repair Action Modal matching ui.txt */}
      {selectedWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={() => setSelectedWO(null)}>
          <div
            className="w-full max-w-lg bg-white border border-borderCol rounded-xl shadow-float p-6 flex flex-col antialiased"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-borderCol pb-3 mb-4">
              <div>
                <span className="text-xs font-mono text-primary font-bold">{selectedWO.id}</span>
                <h2 className="text-base font-semibold text-textMain mt-0.5">
                  Remediate Machine {selectedWO.machine_id}
                </h2>
                <p className="text-xs text-textSub">
                  Fault: {selectedWO.fault_type} • Current Lifecycle: <strong className="text-textMain font-mono">{selectedWO.status}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedWO(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-textSub hover:text-textMain hover:bg-bgMain transition-colors"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-4">
              {/* Lifecycle progression bar */}
              <div className="p-3 bg-bgMain border border-borderCol rounded-lg text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-textSub">
                  Maintenance Lifecycle Flow (Section 37)
                </span>
                <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-textSub">
                  <span className={selectedWO.status === "OPEN" ? "font-bold text-critical" : ""}>OPEN</span>
                  <span>→</span>
                  <span className={selectedWO.status === "ASSIGNED" ? "font-bold text-blue-700" : ""}>ASSIGNED</span>
                  <span>→</span>
                  <span className={selectedWO.status === "IN_PROGRESS" ? "font-bold text-purple-700" : ""}>IN_PROGRESS</span>
                  <span>→</span>
                  <span className={selectedWO.status === "REPAIRED" ? "font-bold text-teal-700" : ""}>REPAIRED</span>
                  <span>→</span>
                  <span className={selectedWO.status === "VERIFIED" ? "font-bold text-emerald-700" : ""}>VERIFIED</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-textSub mb-1">
                  Technician Diagnostic Notes (AES-256 Protected)
                </label>
                <textarea
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  placeholder="Record diagnostic findings, replaced components, sensor re-calibration values..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs text-textMain bg-white border border-borderCol rounded-md focus:outline-none focus:border-primary font-sans shadow-sm"
                />
              </div>

              {/* Action Buttons based on current lifecycle step */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-textSub block">
                  Authorized State Transition Actions
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {selectedWO.status === "OPEN" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedWO.id, "ASSIGNED")}
                      disabled={updating}
                      className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors shadow-sm"
                    >
                      Accept Work Order
                    </button>
                  )}

                  {(selectedWO.status === "ASSIGNED" || selectedWO.status === "OPEN") && (
                    <button
                      onClick={() => handleUpdateStatus(selectedWO.id, "IN_PROGRESS")}
                      disabled={updating}
                      className="py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-md text-xs font-medium transition-colors shadow-sm"
                    >
                      Start Repair Work
                    </button>
                  )}

                  {selectedWO.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedWO.id, "REPAIRED")}
                      disabled={updating}
                      className="py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-medium transition-colors shadow-sm"
                    >
                      Mark Repaired
                    </button>
                  )}

                  {selectedWO.status === "REPAIRED" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedWO.id, "VERIFIED")}
                      disabled={updating}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium transition-colors shadow-sm"
                    >
                      Verify & Restore Machine
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-borderCol flex justify-end">
              <button
                onClick={() => setSelectedWO(null)}
                className="px-4 py-1.5 bg-white border border-borderCol hover:bg-bgMain text-textMain text-xs font-medium rounded-md shadow-sm transition-colors"
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
