import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import MaintenanceInvoiceModal from "../components/MaintenanceInvoiceModal";

export default function MaintenancePage({ user }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [servicePersons, setServicePersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWO, setSelectedWO] = useState(null);
  const [repairNotes, setRepairNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [activeTab, setActiveTab] = useState("tickets"); // 'tickets' | 'invoices' | 'technicians'
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceTargetWO, setInvoiceTargetWO] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [woRes, invRes, spRes] = await Promise.all([
        api.get("/maintenance"),
        api.get("/maintenance/invoices").catch(() => ({ data: { data: [] } })),
        api.get("/maintenance/service-persons").catch(() => ({ data: { data: [] } }))
      ]);

      const woPayload = woRes.data?.data || woRes.data;
      setWorkOrders(woPayload.work_orders || woPayload || []);

      const invPayload = invRes.data?.data || invRes.data || [];
      setInvoices(Array.isArray(invPayload) ? invPayload : []);

      const spPayload = spRes.data?.data || spRes.data || [];
      setServicePersons(Array.isArray(spPayload) ? spPayload : []);
    } catch (err) {
      console.error("Error loading maintenance datasets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedWO(null);
        setShowInvoiceModal(false);
      }
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
      await loadData();
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
    <div className="flex-1 flex flex-col h-full bg-bgMain overflow-y-auto p-6 antialiased space-y-5">
      {/* Page Header matching ui.txt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary border border-borderCol shadow-soft">
            <i className="fa-solid fa-screwdriver-wrench text-xl"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-textMain">Paramaippu — Fleet Maintenance & Invoicing</h1>
              <span className="text-[10px] bg-primaryLight text-primary font-bold px-2 py-0.5 rounded-full border border-plum-100 font-mono">
                {workOrders.length} Tickets
              </span>
            </div>
            <p className="text-xs text-textSub mt-0.5">
              Service technician work order dispatch, diagnostics, repairs, verification, and maintenance invoices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="px-3 py-1.5 text-xs font-medium text-textMain bg-white border border-borderCol hover:bg-bgMain rounded-md flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <i className={`fa-solid fa-rotate text-xs text-textSub ${loading ? "animate-spin" : ""}`}></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Technicians On-Duty Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {servicePersons.map((sp) => (
          <div key={sp.id} className="bg-white border border-borderCol rounded-lg p-3 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primaryLight text-primary font-bold flex items-center justify-center text-xs">
                {sp.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <div className="text-xs font-bold text-textMain">{sp.name}</div>
                <div className="text-[10px] text-textSub">{sp.specialization} • {sp.id}</div>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                sp.availability === "Available" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
              }`}>
                {sp.availability}
              </span>
              <div className="text-[10px] text-textSub mt-0.5">{sp.completed_repairs || 0} repairs</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-borderCol gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("tickets")}
          className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "tickets" ? "border-primary text-primary" : "border-transparent text-textSub hover:text-textMain"
          }`}
        >
          <i className="fa-solid fa-ticket"></i>
          Work Order Queue ({filteredOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "invoices" ? "border-primary text-primary" : "border-transparent text-textSub hover:text-textMain"
          }`}
        >
          <i className="fa-solid fa-file-invoice-dollar"></i>
          Billing Invoices ({invoices.length})
        </button>
      </div>

      {/* Tab 1: Work Orders Table */}
      {activeTab === "tickets" && (
        <div className="bg-white border border-borderCol rounded-xl overflow-hidden shadow-soft flex flex-col">
          <div className="p-3 border-b border-borderCol bg-bgMain flex justify-between items-center">
            <span className="text-xs font-bold text-textMain">Active Maintenance Work Orders</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-1 text-xs text-textMain bg-white border border-borderCol rounded focus:outline-none focus:border-primary shadow-xs"
            >
              <option value="ALL">All Lifecycles</option>
              <option value="OPEN">Open (Awaiting Technician)</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress (Under Repair)</option>
              <option value="REPAIRED">Repaired</option>
              <option value="VERIFIED">Verified & Closed</option>
            </select>
          </div>

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
                          {wo.assigned_to || "Vikram Patel (SP-01)"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`status-pill inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] ${getStatusBadge(wo.status)}`}>
                            {wo.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedWO(wo)}
                              className="px-2.5 py-1 text-[11px] font-medium text-primary bg-primaryLight hover:bg-primary hover:text-white rounded-md transition-colors shadow-xs"
                            >
                              Manage →
                            </button>
                            {(wo.status === "IN_PROGRESS" || wo.status === "REPAIRED" || wo.status === "OPEN" || wo.status === "ASSIGNED") && (
                              <button
                                onClick={() => {
                                  setInvoiceTargetWO(wo);
                                  setShowInvoiceModal(true);
                                }}
                                className="px-2 py-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded border border-emerald-200 transition-colors"
                                title="Generate Invoice & Complete Repair"
                              >
                                <i className="fa-solid fa-file-invoice mr-1"></i>
                                Invoice
                              </button>
                            )}
                          </div>
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
      )}

      {/* Tab 2: Billing Invoices Table */}
      {activeTab === "invoices" && (
        <div className="bg-white border border-borderCol rounded-xl overflow-hidden shadow-soft flex flex-col">
          <div className="p-3 border-b border-borderCol bg-bgMain flex justify-between items-center">
            <span className="text-xs font-bold text-textMain">Maintenance Billing & Repair Cost History</span>
            <span className="text-xs text-textSub font-mono font-bold text-primary">
              Total Invoiced: ₹{invoices.reduce((acc, inv) => acc + (inv.total_cost || 0), 0).toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white border-b border-borderCol text-[10px] font-semibold text-textSub uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Service Person</th>
                  <th className="py-3 px-4">Problem / Action</th>
                  <th className="py-3 px-4">Labour</th>
                  <th className="py-3 px-4">Parts Cost</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderCol text-textMain">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-bgMain transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">{inv.id}</td>
                    <td className="py-3 px-4 font-mono font-bold text-textMain">{inv.machine_id}</td>
                    <td className="py-3 px-4 font-medium">{inv.service_person_name} ({inv.service_person_id})</td>
                    <td className="py-3 px-4 text-textSub max-w-xs truncate">{inv.problem_summary || inv.action_taken}</td>
                    <td className="py-3 px-4 font-mono">₹{(inv.labour_cost || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono">₹{(inv.parts_cost || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-extrabold text-emerald-700">₹{(inv.total_cost || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-textSub text-[11px]">{inv.created_at ? inv.created_at.slice(0, 10) : "2026-09-18"}</td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-textSub">
                      No maintenance invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  Maintenance Lifecycle Flow
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

                  <button
                    onClick={() => {
                      setInvoiceTargetWO(selectedWO);
                      setShowInvoiceModal(true);
                      setSelectedWO(null);
                    }}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-file-invoice-dollar"></i>
                    Invoice & Restore Machine
                  </button>
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

      {/* Invoice Generation Modal */}
      {showInvoiceModal && invoiceTargetWO && (
        <MaintenanceInvoiceModal
          workOrder={invoiceTargetWO}
          machine={{ id: invoiceTargetWO.machine_id }}
          onClose={() => {
            setShowInvoiceModal(false);
            setInvoiceTargetWO(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
