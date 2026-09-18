import React, { useState } from "react";
import api from "../services/api";

export default function DisruptionModal({
  machines = [],
  lanes = [],
  defaultMachineId = "CUT-02",
  onClose,
  onSuccess,
  user
}) {
  const [selectedMachineId, setSelectedMachineId] = useState(defaultMachineId || "CUT-02");
  const [failureType, setFailureType] = useState("MECHANICAL_FAILURE");
  const [durationHours, setDurationHours] = useState(6.0);
  const [loading, setLoading] = useState(false);
  const [disruptionRes, setDisruptionRes] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);

  const isManager = user?.role === "MANAGER";

  const handleSimulate = async () => {
    try {
      setLoading(true);
      setActionStatus(null);
      const res = await api.post("/admin/disruptions", {
        machine_id: selectedMachineId,
        order_id: "ORD-1042",
        failure_type: failureType,
        duration_hours: durationHours
      });
      const data = res.data?.data || res.data;
      setDisruptionRes(data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error?.message || err.response?.data?.error || "Failed to trigger disruption.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOption = async (optionKey) => {
    if (!disruptionRes) return;
    try {
      setLoading(true);
      const res = await api.post(`/disruptions/${disruptionRes.disruption_id}/approve`, {
        option_id: optionKey
      });
      setActionStatus({
        type: "APPROVED",
        message: `Approved ${optionKey}! Production schedule and Order Gantt re-assigned in MongoDB.`
      });
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error?.message || err.response?.data?.error || "Failed to approve recovery option.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!disruptionRes) return;
    try {
      setLoading(true);
      const res = await api.post(`/disruptions/${disruptionRes.disruption_id}/reject`, {
        reason: "Manager rejected proposed recovery options."
      });
      setActionStatus({
        type: "REJECTED",
        message: "Recovery rejected. Machine remains FAILED and affected jobs remain BLOCKED."
      });
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error?.message || err.response?.data?.error || "Failed to reject recovery.");
    } finally {
      setLoading(false);
    }
  };

  const optA = disruptionRes?.option_a;
  const optB = disruptionRes?.option_b;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={onClose}>
      <div
        className="w-full max-w-4xl bg-white border border-[#E2E8F0] rounded-xl shadow-modal flex flex-col max-h-[92vh] overflow-hidden antialiased"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white text-base font-bold shadow-sm">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#0F172A]">
                  Disruption Injection & CP-SAT Recovery
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-red-50 border-red-300 text-red-700 uppercase font-mono">
                  Autonomous Pipeline
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Simulate shopfloor disruptions, evaluate candidate workstations via ML, and solve recovery alternatives with Google OR-Tools
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

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          {actionStatus && (
            <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
              actionStatus.type === "APPROVED"
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-red-50 border-red-300 text-red-800"
            }`}>
              <i className={`fa-solid ${actionStatus.type === "APPROVED" ? "fa-circle-check" : "fa-ban"}`}></i>
              <span>{actionStatus.message}</span>
            </div>
          )}

          {/* SIMULATION TRIGGER FORM */}
          {!disruptionRes ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Select Target Machine & Failure Parameters
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Target Machine
                    </label>
                    <select
                      value={selectedMachineId}
                      onChange={(e) => setSelectedMachineId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none font-mono"
                    >
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id} ({m.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Failure Classification
                    </label>
                    <select
                      value={failureType}
                      onChange={(e) => setFailureType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                    >
                      <option value="MECHANICAL_FAILURE">Mechanical Bearing Seizure</option>
                      <option value="SERVO_MOTOR_OVERHEAT">Servo Motor Overheat</option>
                      <option value="CALIBRATION_DRIFT">Blade Optical Misalignment</option>
                      <option value="ELECTRICAL_FAULT">PLC Circuit Breaker Trip</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Expected Downtime Duration
                    </label>
                    <select
                      value={durationHours}
                      onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                    >
                      <option value={4.0}>4.0 Hours (Minor)</option>
                      <option value={6.0}>6.0 Hours (Standard Shift)</option>
                      <option value={8.0}>8.0 Hours (Critical Overhaul)</option>
                      <option value={12.0}>12.0 Hours (Next Day Restoral)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSimulate}
                    disabled={loading}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                        <span>Executing Disruption Pipeline...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-bolt text-xs"></i>
                        <span>Trigger Disruption & Solve Recovery</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* RECOVERY OPTIONS DISPLAY (Section 31: Option A vs Option B) */
            <div className="space-y-4">
              {/* Impact Banner */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-red-900 font-bold">
                  <i className="fa-solid fa-triangle-exclamation text-red-600 text-sm"></i>
                  <span>Disruption ID: {disruptionRes.disruption_id}</span>
                  <span className="font-normal text-red-700">
                    • Machine <strong className="font-mono">{disruptionRes.machine_id}</strong> is FAILED ({disruptionRes.failure_type})
                  </span>
                </div>
                <span className="text-[11px] text-red-800 font-mono">
                  Affected Orders: {disruptionRes.affected_orders?.join(", ") || "ORD-1042"}
                </span>
              </div>

              {/* TWO FEASIBLE RECOVERY OPTIONS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* OPTION A: Deadline / Priority Protection */}
                <div className="border-2 border-blue-500 rounded-xl p-4 bg-blue-50/20 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                        <i className="fa-solid fa-bullseye text-blue-600"></i>
                        OPTION A: DEADLINE PROTECTION
                      </span>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono">
                        ZERO TARDINESS
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-3">
                      {optA?.why || "Allocates highest-capacity alternative station to protect urgent order delivery deadline."}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-blue-200 mb-3">
                      <div>
                        <span className="text-[10px] text-slate-500">Reassigned To:</span>
                        <div className="font-bold text-blue-900 font-mono">{optA?.machine || "CUT-01"}</div>
                        <div className="text-[10px] text-slate-500">{optA?.machine_name || "Gerber Cutter 01"}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Processing Cycle:</span>
                        <div className="font-bold text-slate-800 font-mono">{optA?.predicted_processing_min || 95} min</div>
                        <div className="text-[10px] text-slate-500">Setup: {optA?.setup_min || 10}m</div>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-slate-500">Deadline Impact:</span>
                        <div className="font-bold text-emerald-700 font-mono">{optA?.deadline_impact_min || 0} min</div>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-slate-500">Production Cost:</span>
                        <div className="font-bold text-slate-800 font-mono">₹{(optA?.additional_cost || 1240).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {isManager && (
                    <button
                      onClick={() => handleApproveOption("OPTION_A")}
                      disabled={loading || actionStatus?.type === "APPROVED"}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      {actionStatus?.type === "APPROVED" ? "Approved" : "Approve Option A (Deadline Focused)"}
                    </button>
                  )}
                </div>

                {/* OPTION B: Cost / Schedule Stability */}
                <div className="border border-slate-300 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <i className="fa-solid fa-coins text-amber-600"></i>
                        OPTION B: COST & STABILITY
                      </span>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono">
                        MINIMAL COST
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-3">
                      {optB?.why || "Reduces setup costs and shopfloor changes by buffering job start and preserving stability."}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 mb-3">
                      <div>
                        <span className="text-[10px] text-slate-500">Reassigned To:</span>
                        <div className="font-bold text-slate-900 font-mono">{optB?.machine || "CUT-01"}</div>
                        <div className="text-[10px] text-slate-500">{optB?.machine_name || "Gerber Cutter 01"}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Processing Cycle:</span>
                        <div className="font-bold text-slate-800 font-mono">{optB?.predicted_processing_min || 105} min</div>
                        <div className="text-[10px] text-slate-500">Setup: {optB?.setup_min || 15}m</div>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-slate-500">Deadline Impact:</span>
                        <div className="font-bold text-amber-700 font-mono">+{optB?.deadline_impact_min || 25} min</div>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-slate-500">Production Cost:</span>
                        <div className="font-bold text-emerald-700 font-mono">₹{(optB?.additional_cost || 680).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {isManager && (
                    <button
                      onClick={() => handleApproveOption("OPTION_B")}
                      disabled={loading || actionStatus?.type === "APPROVED"}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      {actionStatus?.type === "APPROVED" ? "Approved" : "Approve Option B (Cost Focused)"}
                    </button>
                  )}
                </div>
              </div>

              {/* Reject Action */}
              {isManager && !actionStatus && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleReject}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors font-medium"
                  >
                    Reject Both Options
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <span className="text-[11px] text-[#64748B]">
            Manager Human-In-The-Loop Signoff Required
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-100 text-[#0F172A] rounded-lg text-xs font-semibold transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
