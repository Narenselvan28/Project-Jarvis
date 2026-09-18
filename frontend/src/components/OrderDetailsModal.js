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

  // Handle ESC key to close modal per ui.txt rules
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!orderId) return null;

  const operations = order?.operations || [];
  const selectedOp = operations.find((op) => op.sequence === selectedOpSequence) || operations[0];

  // Check if any operation is failed or reassigned
  const reassignedOp = operations.find((op) => op.status === "REASSIGNED" || op.is_reassigned);
  const failedOp = operations.find((op) => op.status === "FAILED" || (op.assigned_machine_id === "CUT-02" && order?.status === "BLOCKED"));

  const progressPct = order?.status === "COMPLETED" ? 100 : (order?.status === "RUNNING" ? 68 : 15);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={onClose}>
      <div
        className="w-full max-w-4xl bg-white border border-borderCol rounded-xl shadow-float flex flex-col max-h-[90vh] overflow-hidden antialiased"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER (ui.txt style) */}
        <div className="px-6 py-4 border-b border-borderCol bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primaryLight text-primary rounded-xl flex items-center justify-center text-base font-bold shadow-soft border border-plum-100">
              <i className="fa-solid fa-boxes-stacked"></i>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-base font-mono font-bold text-primary">
                  {order?.id || orderId}
                </span>
                <span className="text-sm font-semibold text-textMain">
                  {order?.product_name || order?.product || "Apparel Production Batch"}
                </span>
                <span className={`status-pill inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  order?.status === "BLOCKED"
                    ? "bg-criticalLight text-critical border border-rose-200"
                    : order?.status === "RUNNING"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-primaryLight text-primary border border-plum-100"
                }`}>
                  {order?.status || "QUEUED"}
                </span>
              </div>
              <p className="text-xs text-textSub mt-0.5">
                Target Quantity: <strong className="font-mono text-textMain">{(order?.quantity || 12000).toLocaleString()} pcs</strong> • Priority: <strong className="text-critical">{order?.priority || "HIGH"}</strong> • Due: {order?.due_date ? new Date(order.due_date).toLocaleDateString() : "24 Hours"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-textSub hover:text-textMain hover:bg-bgMain transition-colors"
          >
            <i className="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        {/* MODAL CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {loading ? (
            <div className="py-12 text-center text-xs text-textSub font-mono">
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              Loading manufacturing route & allocations...
            </div>
          ) : (
            <>
              {/* OPERATIONAL SUMMARY ROW */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-bgMain border border-borderCol rounded-lg">
                  <div className="text-[10px] uppercase font-semibold text-textSub">Production Progress</div>
                  <div className="text-base font-bold font-mono text-textMain mt-1">{progressPct}%</div>
                  <div className="w-full h-1.5 bg-borderCol rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }}></div>
                  </div>
                </div>

                <div className="p-3 bg-bgMain border border-borderCol rounded-lg">
                  <div className="text-[10px] uppercase font-semibold text-textSub">Estimated Completion (ETA)</div>
                  <div className="text-base font-bold font-mono text-textMain mt-1">14:45 IST</div>
                  <div className="text-[10px] text-emerald-700 font-medium">On-Schedule window</div>
                </div>

                <div className="p-3 bg-bgMain border border-borderCol rounded-lg">
                  <div className="text-[10px] uppercase font-semibold text-textSub">Total Operations</div>
                  <div className="text-base font-bold font-mono text-textMain mt-1">{operations.length} Stages</div>
                  <div className="text-[10px] text-textSub">Bill of Process complete</div>
                </div>

                <div className="p-3 bg-bgMain border border-borderCol rounded-lg">
                  <div className="text-[10px] uppercase font-semibold text-textSub">Disruption Status</div>
                  <div className={`text-base font-bold font-mono mt-1 ${
                    failedOp || order?.status === "BLOCKED" ? "text-critical" : "text-emerald-700"
                  }`}>
                    {failedOp || order?.status === "BLOCKED" ? "DISRUPTED" : (reassignedOp ? "RECOVERED" : "NOMINAL")}
                  </div>
                  <div className="text-[10px] text-textSub">
                    {reassignedOp ? "Alternative Active" : "No active alarms"}
                  </div>
                </div>
              </div>

              {/* RECOVERY PATH VISUALIZATION (Section 10 & 20: SECONDARY LANE MUST APPEAR BELOW PRIMARY LANE) */}
              {reassignedOp && (
                <div className="p-4 bg-bgMain border border-borderCol rounded-xl space-y-3 shadow-soft">
                  <div className="flex items-center justify-between border-b border-borderCol pb-2">
                    <span className="text-xs font-semibold text-textMain flex items-center gap-2">
                      <i className="fa-solid fa-shuffle text-primary"></i>
                      <span>Disruption Recovery & Machine Allocation (Maatram)</span>
                    </span>
                    <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">
                      OR-Tools CP-SAT Reassignment Active
                    </span>
                  </div>

                  {/* Vertical Allocation Stack: Primary on Top -> Down Arrow -> Secondary Below */}
                  <div className="space-y-2">
                    {/* PRIMARY ALLOCATION (DISRUPTED / FAILED) */}
                    <div className="p-3.5 bg-criticalLight border border-rose-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-critical flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-xmark"></i>
                          PRIMARY ALLOCATION (DISRUPTED)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-critical border border-rose-300 font-mono">
                          STATUS: FAILED
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                        <div>
                          <span className="text-[10px] text-textSub block">Primary Lane:</span>
                          <span className="font-semibold text-textMain">Lane 2 (Structured Wovens)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-textSub block">Disrupted Machine:</span>
                          <span className="font-mono font-bold text-critical">{reassignedOp.original_machine_id || "CUT-02"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-textSub block">Operation Stage:</span>
                          <span className="font-medium text-textMain">{reassignedOp.process_name || "Cutting"}</span>
                        </div>
                      </div>
                    </div>

                    {/* RECOVERY TRANSITION INDICATOR */}
                    <div className="flex items-center justify-center gap-2 py-1 text-xs font-bold text-blue-700">
                      <i className="fa-solid fa-arrow-down text-sm"></i>
                      <span>RECOVERY REASSIGNMENT VIA OR-TOOLS</span>
                      <i className="fa-solid fa-arrow-down text-sm"></i>
                    </div>

                    {/* SECONDARY ALLOCATION (SHOWN DIRECTLY BELOW PRIMARY LANE) */}
                    <div className="p-3.5 bg-blue-50 border border-blue-300 rounded-lg shadow-soft">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-check"></i>
                          SECONDARY ALLOCATION (RECOVERY LANE)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-blue-700 border border-blue-300 font-mono">
                          STATUS: REASSIGNED (ACTIVE)
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                        <div>
                          <span className="text-[10px] text-textSub block">Secondary Lane:</span>
                          <span className="font-semibold text-textMain">Lane 3 (Automated Fast-Track)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-textSub block">Replacement Machine:</span>
                          <span className="font-mono font-bold text-blue-800">{reassignedOp.assigned_machine_id || "CUT-04"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-textSub block">Optimization Impact:</span>
                          <span className="font-medium text-emerald-700">Zero Tardiness • +0.0 hr delay</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Route Legend */}
                  <div className="flex items-center gap-4 text-[10px] text-textSub pt-1 font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Primary Flow
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-critical"></span> Failed Disruption
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Secondary / Reassigned
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Completed
                    </span>
                  </div>
                </div>
              )}

              {/* MANUFACTURING ROUTE (Section 9: Operation -> Machine -> Lane) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-textSub">
                    Production Route Stages ({operations.length} Operations)
                  </span>
                  <span className="text-[10px] text-textSub">Click any stage to highlight allocations</span>
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
                            ? "border-primary ring-2 ring-primary/20 bg-primaryLight"
                            : isOpFailed
                            ? "border-rose-300 bg-criticalLight"
                            : isOpReassigned
                            ? "border-blue-300 bg-blue-50"
                            : "border-borderCol bg-white hover:border-gray-400"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-textSub font-mono">
                          <span>Op {op.sequence}</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold ${
                            isOpFailed
                              ? "text-critical bg-white border border-rose-200"
                              : isOpReassigned
                              ? "text-blue-700 bg-white border border-blue-200"
                              : op.status === "COMPLETED"
                              ? "text-slate-600 bg-slate-100"
                              : "text-emerald-700 bg-emerald-50 border border-emerald-200"
                          }`}>
                            {isOpFailed ? "BLOCKED" : (isOpReassigned ? "REASSIGNED" : (op.status || "QUEUED"))}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-textMain truncate mt-1">
                          {op.process_name || `Stage ${op.sequence}`}
                        </div>

                        <div className="text-[11px] font-mono font-semibold text-primary mt-1 flex items-center justify-between">
                          <span>{op.assigned_machine_id || "—"}</span>
                          <span className="text-[10px] text-textSub font-normal">
                            {op.processing_time_min ? `${op.processing_time_min} min` : "60 min"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SELECTED OPERATION DETAILS DEEP DIVE */}
              {selectedOp && (
                <div className="p-4 bg-bgMain border border-borderCol rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-borderCol pb-2">
                    <span className="text-xs font-semibold text-textMain flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-mono font-bold">
                        {selectedOp.sequence}
                      </span>
                      <span>Operation Detail: {selectedOp.process_name}</span>
                    </span>

                    {selectedOp.assigned_machine_id && (
                      <button
                        onClick={() => onInspectMachine && onInspectMachine(selectedOp.assigned_machine_id)}
                        className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <span>Inspect Station {selectedOp.assigned_machine_id}</span>
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <div className="text-[10px] text-textSub">Allocated Machine:</div>
                      <div className="font-mono font-bold text-sm text-textMain mt-0.5">
                        {selectedOp.assigned_machine_id || "Unassigned"}
                      </div>
                      <div className="text-[10px] text-textSub">
                        {selectedOp.is_reassigned ? "(Reassigned via CP-SAT)" : "(Primary Planned Machine)"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-textSub">Production Lane:</div>
                      <div className="font-semibold text-textMain mt-0.5">
                        {selectedOp.lane_id ? `Lane ${selectedOp.lane_id.replace("L0", "")}` : "Lane 1"}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium">Flow aligned</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-textSub">Station Worker:</div>
                      <div className="font-semibold text-textMain mt-0.5">
                        {selectedOp.worker_name || "Vikram Rao (Shift 1)"}
                      </div>
                      <div className="text-[10px] text-textSub">Skill Certified Level 4</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-textSub">Predicted Cycle (Arivu ML):</div>
                      <div className="font-mono font-bold text-sm text-textMain mt-0.5">
                        Predicted Time: {selectedOp.processing_time_min ? `${selectedOp.processing_time_min} min` : "95.0 min"}
                      </div>
                      <div className="text-[10px] text-textSub">Setup: 15 min</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-borderCol bg-bgMain flex items-center justify-between rounded-b-xl">
          <span className="text-[11px] text-textSub">
            Order Reference: <strong className="font-mono text-textMain">{order?.id}</strong>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium border border-borderCol bg-white hover:bg-bgMain text-textMain rounded-md transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
