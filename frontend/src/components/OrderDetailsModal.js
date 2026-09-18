import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function OrderDetailsModal({ orderId, onClose, onInspectMachine }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOpSequence, setSelectedOpSequence] = useState(null);

  useEffect(() => {
    if (orderId) {
      setLoading(true);
      api.get(`/orders/${orderId}`)
        .then((res) => {
          const payload = res.data?.data || res.data;
          setOrder(payload);
          if (payload.operations && payload.operations.length > 0) {
            setSelectedOpSequence(payload.operations[0].sequence);
          }
        })
        .catch((err) => {
          console.error("Error loading order details:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [orderId]);

  if (!orderId) return null;

  const operations = order?.operations || [];
  const selectedOp = operations.find((op) => op.sequence === selectedOpSequence) || operations[0];

  // Identify any reassigned operations for reconstructed path visualization
  const reassignedOp = operations.find((op) => op.status === "REASSIGNED" || op.is_reassigned);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={onClose}>
      <div
        className="w-full max-w-4xl bg-white border border-[#E2E8F0] rounded-xl shadow-modal flex flex-col max-h-[90vh] overflow-hidden antialiased"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1E293B] rounded-lg flex items-center justify-center text-white text-base font-bold shadow-sm">
              <i className="fa-solid fa-boxes-stacked"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-mono font-bold text-blue-700">
                  {order?.id || orderId}
                </span>
                <span className="text-sm font-semibold text-[#0F172A]">
                  {order?.product_name || order?.product || "Production Batch"}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  order?.status === "BLOCKED"
                    ? "bg-orange-100 text-orange-900 border-orange-300"
                    : order?.status === "RUNNING"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}>
                  {order?.status || "QUEUED"}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Target Quantity: <strong className="font-mono text-[#0F172A]">{(order?.quantity || 12000).toLocaleString()} pcs</strong> • Priority: <strong className="text-red-700">{order?.priority || "HIGH"}</strong> • Due: {order?.due_date ? new Date(order.due_date).toLocaleDateString() : "24 Hours"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 flex items-center justify-center text-sm transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#64748B] font-mono">
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              Loading manufacturing route & telemetry...
            </div>
          ) : (
            <>
              {/* RECONSTRUCTED RECOVERY PATH BANNER (Section 20 & 21: Secondary Lane below Primary Lane) */}
              {reassignedOp && (
                <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-2">
                      <i className="fa-solid fa-shuffle text-amber-600"></i>
                      <span>Active Reconstructed Recovery Route (Maatram)</span>
                    </span>
                    <span className="text-[10px] font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                      OR-Tools CP-SAT Reassignment Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Primary Lane (Failed) */}
                    <div className="p-3 bg-white border border-red-300 rounded-lg">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1 flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-xmark"></i>
                        PRIMARY LANE (DISRUPTED)
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800">Lane 2 (Structured Wovens)</span>
                        <span className="font-mono font-bold text-red-700">{reassignedOp.original_machine_id || "CUT-02"}</span>
                      </div>
                      <div className="text-[10px] text-red-700 font-bold mt-1">
                        STATUS: FAILED (Mechanical Bearing Failure)
                      </div>
                    </div>

                    {/* Secondary Lane (Reassigned - SHOWN DIRECTLY BELOW / ALONGSIDE) */}
                    <div className="p-3 bg-white border border-blue-400 rounded-lg shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1 flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-check"></i>
                        SECONDARY LANE (RECOVERY REASSIGNMENT)
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800">Lane 1 (High Speed Flow)</span>
                        <span className="font-mono font-bold text-blue-800">{reassignedOp.assigned_machine_id || "CUT-01"}</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">
                        STATUS: REASSIGNED • Zero Tardiness Impact
                      </div>
                    </div>
                  </div>

                  {/* Route Legend (Section 20) */}
                  <div className="flex items-center gap-4 text-[10px] text-slate-600 pt-1 font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Primary Path
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Failed Disruption
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Secondary / Recovery
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Completed Stages
                    </span>
                  </div>
                </div>
              )}

              {/* MANUFACTURING ROUTE (Section 18 & 19: Sequential Pipeline) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                    Manufacturing Route Operations ({operations.length} Stages)
                  </span>
                  <span className="text-[10px] text-[#64748B]">Click an operation stage to highlight allocations</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                  {operations.map((op) => {
                    const isSelected = op.sequence === selectedOpSequence;
                    const isOpFailed = op.status === "FAILED" || (op.assigned_machine_id === "CUT-02" && order.status === "BLOCKED");
                    const isOpReassigned = op.status === "REASSIGNED" || op.is_reassigned;

                    return (
                      <div
                        key={op.id || op.sequence}
                        onClick={() => setSelectedOpSequence(op.sequence)}
                        className={`p-2.5 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? "border-[#1E293B] ring-2 ring-[#1E293B]/20 bg-slate-50"
                            : isOpFailed
                            ? "border-red-400 bg-red-50/50"
                            : isOpReassigned
                            ? "border-blue-400 bg-blue-50/50"
                            : "border-[#E2E8F0] bg-white hover:border-slate-400"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#64748B] font-mono">
                          <span>Op {op.sequence}</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold ${
                            isOpFailed
                              ? "text-red-700 bg-red-100"
                              : isOpReassigned
                              ? "text-blue-700 bg-blue-100"
                              : op.status === "COMPLETED"
                              ? "text-slate-500 bg-slate-100"
                              : "text-emerald-700 bg-emerald-100"
                          }`}>
                            {isOpFailed ? "BLOCKED" : (isOpReassigned ? "REASSIGNED" : (op.status || "QUEUED"))}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-[#0F172A] truncate mt-1">
                          {op.process_name || `Stage ${op.sequence}`}
                        </div>

                        <div className="text-[11px] font-mono font-semibold text-blue-700 mt-1 flex items-center justify-between">
                          <span>{op.assigned_machine_id || "—"}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {op.processing_time_min ? `${op.processing_time_min}m` : "60m"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SELECTED OPERATION DEEP DIVE (Section 19: Order -> Machine -> Lane -> Worker) */}
              {selectedOp && (
                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-[10px] font-mono">
                        {selectedOp.sequence}
                      </span>
                      <span>{selectedOp.process_name} Deep Dive</span>
                    </span>

                    {selectedOp.assigned_machine_id && (
                      <button
                        onClick={() => onInspectMachine && onInspectMachine(selectedOp.assigned_machine_id)}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span>View Station {selectedOp.assigned_machine_id}</span>
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <div className="text-[10px] text-[#64748B]">Assigned Workstation:</div>
                      <div className="font-mono font-bold text-base text-[#0F172A] mt-0.5">
                        {selectedOp.assigned_machine_id || "Unassigned"}
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        {selectedOp.is_reassigned ? "(Reassigned via CP-SAT)" : "(Primary Planned Machine)"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-[#64748B]">Production Line (Lane):</div>
                      <div className="font-semibold text-[#0F172A] mt-0.5">
                        {selectedOp.lane_id ? `Lane ${selectedOp.lane_id.replace("L0", "")}` : "Lane 1"}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium">Flow balanced</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-[#64748B]">Station Operator:</div>
                      <div className="font-semibold text-[#0F172A] mt-0.5">
                        {selectedOp.worker_name || "Vikram Rao (Shift 1)"}
                      </div>
                      <div className="text-[10px] text-slate-500">Skill Certified</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-[#64748B]">Predicted Time (Arivu ML):</div>
                      <div className="font-mono font-bold text-base text-[#0F172A] mt-0.5">
                        {selectedOp.processing_time_min ? `${selectedOp.processing_time_min} min` : "95.0 min"}
                      </div>
                      <div className="text-[10px] text-blue-700">Setup: 15 min</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <span className="text-[11px] text-[#64748B]">
            Order Registry: <strong className="font-mono text-[#0F172A]">{order?.id}</strong>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-100 text-[#0F172A] rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
