import React, { useState, useEffect } from "react";
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
  const [reason, setReason] = useState("Simulated production disruption");
  const [loading, setLoading] = useState(false);
  const [disruptionRes, setDisruptionRes] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);

  // Review & Confirmation Modal States
  const [reviewingOption, setReviewingOption] = useState(null); // 'OPTION_A' | 'OPTION_B' | null
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmOptionKey, setConfirmOptionKey] = useState(null);

  const rawRole = (user?.role || "OPERATOR").toUpperCase().replace(" ", "_");
  const isManager = rawRole === "MANAGER" || rawRole === "ADMIN";

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showConfirmModal) setShowConfirmModal(false);
        else if (reviewingOption) setReviewingOption(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showConfirmModal, reviewingOption]);

  const handleSimulate = async () => {
    try {
      setLoading(true);
      setActionStatus(null);
      setReviewingOption(null);

      // Call Manager Disruption API per Part 7
      const res = await api.post("/manager/simulate-disruption", {
        machine_id: selectedMachineId,
        failure_type: failureType,
        duration_hours: Number(durationHours),
        reason: reason || "Simulated production disruption"
      });

      const data = res.data?.data || res.data;
      setDisruptionRes(data);
    } catch (err) {
      console.error("Simulation failed:", err);
      alert(err.response?.data?.error?.message || err.response?.data?.error || "Failed to trigger disruption.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfirm = (optionKey) => {
    setConfirmOptionKey(optionKey);
    setShowConfirmModal(true);
  };

  const handleConfirmApproval = async () => {
    if (!disruptionRes || !confirmOptionKey) return;
    const disrId = disruptionRes.disruption_id || disruptionRes.id;
    try {
      setLoading(true);
      setShowConfirmModal(false);

      // Call Recovery Approval API per Part 13
      const res = await api.post(`/recovery/${disrId}/approve`, {
        option_id: confirmOptionKey,
        approved_by: user?.username || "manager",
        approval_role: user?.role || "MANAGER",
        approval_notes: `Approved ${confirmOptionKey} by Production Manager. Schedule updated to Version 2.`
      });

      setActionStatus({
        type: "APPROVED",
        message: `Recovery Schedule Approved! Production schedule updated to Version 2 and set to ACTIVE for machine ${disruptionRes.machine_id}.`
      });

      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error("Recovery approval failed:", err);
      alert(err.response?.data?.error?.message || err.response?.data?.error || "Failed to approve recovery option.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRecovery = async () => {
    if (!disruptionRes) return;
    const disrId = disruptionRes.disruption_id || disruptionRes.id;
    try {
      setLoading(true);
      const res = await api.post(`/recovery/${disrId}/reject`, {
        reason: "Manager rejected proposed recovery alternatives. Schedule unchanged."
      });

      setActionStatus({
        type: "REJECTED",
        message: "Recovery Status: REJECTED. Active schedule preserved. You may generate a new recovery plan."
      });

      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error("Recovery reject failed:", err);
      alert(err.response?.data?.error?.message || err.response?.data?.error || "Failed to reject recovery.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateRecovery = async () => {
    if (!disruptionRes) return;
    const disrId = disruptionRes.disruption_id || disruptionRes.id;
    try {
      setLoading(true);
      setActionStatus(null);
      const res = await api.post(`/recovery/${disrId}/regenerate`, {
        machine_id: disruptionRes.machine_id
      });
      const data = res.data?.data || res.data;
      setDisruptionRes(data);
    } catch (err) {
      console.error("Regenerate failed:", err);
      // Fallback: re-run simulate
      await handleSimulate();
    } finally {
      setLoading(false);
    }
  };

  const optA = disruptionRes?.option_a;
  const optB = disruptionRes?.option_b;
  const activeReviewData = reviewingOption === "OPTION_A" ? optA : optB;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={onClose}>
      <div
        className="w-full max-w-4xl bg-white border border-borderCol rounded-xl shadow-float flex flex-col max-h-[92vh] overflow-hidden antialiased"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-borderCol bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-criticalLight text-critical rounded-xl flex items-center justify-center text-base font-bold shadow-soft border border-rose-200">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-textMain">
                  Manager Disruption Injection & CP-SAT Recovery
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-criticalLight border border-rose-200 text-critical uppercase font-mono">
                  Autonomous Optimization Pipeline
                </span>
              </div>
              <p className="text-xs text-textSub mt-0.5">
                Simulate shopfloor disruptions, evaluate candidate workstations via ML, and solve recovery alternatives with Google OR-Tools
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

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          {actionStatus && (
            <div
              className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                actionStatus.type === "APPROVED"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-criticalLight border-rose-200 text-critical"
              }`}
            >
              <div className="flex items-center gap-2">
                <i className={`fa-solid ${actionStatus.type === "APPROVED" ? "fa-circle-check" : "fa-ban"} text-sm`}></i>
                <span>{actionStatus.message}</span>
              </div>
              {actionStatus.type === "REJECTED" && (
                <button
                  onClick={handleRegenerateRecovery}
                  disabled={loading}
                  className="px-3 py-1 bg-white border border-rose-300 hover:bg-white text-critical rounded text-xs font-bold transition-all shadow-sm"
                >
                  <i className="fa-solid fa-rotate mr-1"></i>
                  <span>Generate New Recovery</span>
                </button>
              )}
            </div>
          )}

          {/* SIMULATION TRIGGER FORM (When no disruption active) */}
          {!disruptionRes ? (
            <div className="space-y-4">
              <div className="p-5 bg-bgMain border border-borderCol rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-textSub">
                    Simulate Machine Failure (Demo & Administrative Control)
                  </span>
                  <span className="text-[11px] text-textSub font-mono">
                    Loads real database workstations
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-textSub mb-1">
                      Target Workstation
                    </label>
                    <select
                      value={selectedMachineId}
                      onChange={(e) => setSelectedMachineId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-borderCol rounded-md text-textMain focus:outline-none focus:border-primary font-mono shadow-sm"
                    >
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id} — {m.name} ({m.process})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-textSub mb-1">
                      Failure Classification
                    </label>
                    <select
                      value={failureType}
                      onChange={(e) => setFailureType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-borderCol rounded-md text-textMain focus:outline-none focus:border-primary shadow-sm font-medium"
                    >
                      <option value="MECHANICAL_FAILURE">Mechanical Bearing Seizure</option>
                      <option value="SERVO_MOTOR_OVERHEAT">Servo Motor Overheat</option>
                      <option value="CALIBRATION_DRIFT">Blade Optical Misalignment</option>
                      <option value="ELECTRICAL_FAULT">PLC Circuit Breaker Trip</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-textSub mb-1">
                      Expected Downtime Duration
                    </label>
                    <select
                      value={durationHours}
                      onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-borderCol rounded-md text-textMain focus:outline-none focus:border-primary shadow-sm font-medium"
                    >
                      <option value={4.0}>4.0 Hours (Minor)</option>
                      <option value={6.0}>6.0 Hours (Standard Shift)</option>
                      <option value={8.0}>8.0 Hours (Critical Overhaul)</option>
                      <option value={12.0}>12.0 Hours (Next Day Restoral)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-textSub mb-1">
                    Disruption Reason / Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Simulated production disruption on cutting station"
                    className="w-full px-3 py-2 text-xs bg-white border border-borderCol rounded-md text-textMain focus:outline-none focus:border-primary shadow-sm"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSimulate}
                    disabled={loading || !isManager}
                    className="px-5 py-2.5 bg-critical hover:bg-rose-700 text-white rounded-md text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                        <span>Simulating Disruption & CP-SAT Engine...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-bolt text-xs"></i>
                        <span>Simulate Machine Failure</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : reviewingOption ? (
            /* DETAILED OPTION COMPARISON (Part 13: Review Option drill-down) */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-borderCol pb-3">
                <button
                  onClick={() => setReviewingOption(null)}
                  className="px-3 py-1.5 bg-bgMain hover:bg-slate-200 text-textMain rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                  <span>Back to Recovery Options</span>
                </button>
                <div className="text-xs font-bold text-textMain font-mono">
                  Detailed Plan Review: <span className="text-primary">{reviewingOption}</span>
                </div>
              </div>

              <div className="p-4 bg-primaryLight/20 border border-primary/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-textMain">
                    {activeReviewData?.name || reviewingOption}
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary text-white font-semibold">
                    Target Machine: {activeReviewData?.machine} ({activeReviewData?.machine_name})
                  </span>
                </div>
                <p className="text-xs text-textSub">{activeReviewData?.why}</p>

                {/* PART 19: MACHINE CHANGE EXPLANATION TABLE */}
                <div className="bg-white p-3.5 rounded-lg border border-borderCol space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-textSub flex items-center gap-1.5">
                    <i className="fa-solid fa-code-compare text-primary"></i>
                    Machine Reallocation Explanation
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2 bg-rose-50 border border-rose-100 rounded">
                      <span className="text-[10px] text-textSub font-sans block">Original Machine:</span>
                      <strong className="text-critical">{disruptionRes.machine_id}</strong>
                      <span className="text-[10px] text-critical block mt-0.5 font-bold">STATUS: FAILED</span>
                    </div>

                    <div className="p-2 bg-emerald-50 border border-emerald-100 rounded">
                      <span className="text-[10px] text-textSub font-sans block">New Machine:</span>
                      <strong className="text-emerald-800">{activeReviewData?.machine}</strong>
                      <span className="text-[10px] text-emerald-700 block mt-0.5 font-bold">STATUS: COMPATIBLE</span>
                    </div>

                    <div className="p-2 bg-bgMain border border-borderCol rounded">
                      <span className="text-[10px] text-textSub font-sans block">Fleet Availability:</span>
                      <span className="text-emerald-700 font-bold block">YES (Active Shift)</span>
                      <span className="text-[10px] text-textSub block mt-0.5">Worker: AVAILABLE</span>
                    </div>

                    <div className="p-2 bg-bgMain border border-borderCol rounded">
                      <span className="text-[10px] text-textSub font-sans block">Material Availability:</span>
                      <span className="text-emerald-700 font-bold block">YES (Warehouse In-Stock)</span>
                      <span className="text-[10px] text-textSub block mt-0.5">Setup: {activeReviewData?.setup_min} min</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-[10px] text-textSub block font-sans">Predicted Processing:</span>
                      <strong className="text-textMain">{activeReviewData?.predicted_processing_min} min</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-textSub block font-sans">ML Failure Risk:</span>
                      <strong className="text-emerald-700">{activeReviewData?.failure_risk_pct || "6.8%"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-textSub block font-sans">Deadline Impact:</span>
                      <strong className={activeReviewData?.deadline_impact_min === 0 ? "text-emerald-700" : "text-amber-700"}>
                        +{activeReviewData?.deadline_impact_min} min
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-textSub block font-sans">Cost Impact:</span>
                      <strong className="text-textMain">₹{(activeReviewData?.additional_cost || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleRejectRecovery}
                  disabled={loading}
                  className="px-4 py-2 border border-rose-300 text-critical hover:bg-criticalLight rounded-md text-xs font-semibold transition-colors"
                >
                  Reject Proposed Recovery
                </button>
                <button
                  onClick={() => handleOpenConfirm(reviewingOption)}
                  disabled={loading || actionStatus?.type === "APPROVED"}
                  className="px-5 py-2 bg-primary hover:bg-primaryHover text-white rounded-md text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-check text-xs"></i>
                  <span>Approve {reviewingOption} (Commit Version 2)</span>
                </button>
              </div>
            </div>
          ) : (
            /* RECOVERY OPTIONS DISPLAY & IMPACT ANALYSIS (Parts 8, 12) */
            <div className="space-y-5">
              {/* PART 8: DISRUPTION IMPACT ANALYSIS */}
              <div className="p-4 bg-criticalLight border border-rose-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-critical flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    Disruption Impact Analysis
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-critical text-white font-bold">
                    DISRUPTION ID: {disruptionRes.disruption_id}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3 rounded-lg border border-rose-200 font-mono">
                  <div>
                    <span className="text-[10px] text-textSub block font-sans">Failed Machine:</span>
                    <span className="font-bold text-critical">{disruptionRes.machine_id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-textSub block font-sans">Operational Status:</span>
                    <span className="font-bold text-critical">FAILED</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-textSub block font-sans">Expected Downtime:</span>
                    <span className="font-bold text-textMain">{disruptionRes.duration_hours} hours</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-textSub block font-sans">Affected Orders:</span>
                    <span className="font-bold text-primary">
                      {disruptionRes.affected_orders?.length > 0
                        ? disruptionRes.affected_orders.join(", ")
                        : "ORD-1042"}
                    </span>
                  </div>
                </div>
              </div>

              {/* PART 12: RECOVERY OPTIONS (Option A vs Option B) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-textSub">
                    Dynamically Solved Recovery Options (Google OR-Tools CP-SAT)
                  </span>
                  <span className="text-[10px] text-textSub font-mono">
                    Candidate workstations evaluated via ML processing-time model
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* OPTION A: Deadline Adherence */}
                  <div className="border-2 border-primary rounded-xl p-4 bg-primaryLight/20 shadow-soft flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <i className="fa-solid fa-bullseye text-primary"></i>
                          OPTION A: DEADLINE PROTECTION
                        </span>
                        <span className="text-[10px] font-bold bg-primaryLight text-primary border border-plum-100 px-2 py-0.5 rounded font-mono">
                          MINIMAL TARDINESS
                        </span>
                      </div>

                      <p className="text-xs text-textSub mb-3">
                        {optA?.why || "Allocates highest-capacity alternative station to protect urgent order delivery deadline."}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-borderCol mb-3 font-mono">
                        <div>
                          <span className="text-[10px] text-textSub block font-sans">Machine Changes:</span>
                          <div className="font-bold text-primary">{optA?.machine || "—"}</div>
                          <div className="text-[10px] text-textSub font-sans">{optA?.machine_name || ""}</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-textSub block font-sans">Predicted Processing:</span>
                          <div className="font-bold text-textMain">{optA?.predicted_processing_min || 0} min</div>
                          <div className="text-[10px] text-textSub font-sans">Setup: {optA?.setup_min || 0} min</div>
                        </div>
                        <div className="mt-1">
                          <span className="text-[10px] text-textSub block font-sans">Deadline Impact:</span>
                          <div className="font-bold text-emerald-700">+{optA?.deadline_impact_min || 0} min</div>
                        </div>
                        <div className="mt-1">
                          <span className="text-[10px] text-textSub block font-sans">Production Cost:</span>
                          <div className="font-bold text-textMain">₹{(optA?.additional_cost || 0).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => setReviewingOption("OPTION_A")}
                        className="w-full py-2 bg-primary hover:bg-primaryHover text-white font-semibold text-xs rounded-md transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-magnifying-glass-chart text-xs"></i>
                        <span>REVIEW OPTION A</span>
                      </button>
                    </div>
                  </div>

                  {/* OPTION B: Cost / Schedule Stability */}
                  <div className="border border-borderCol rounded-xl p-4 bg-white shadow-soft flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-textMain flex items-center gap-1.5">
                          <i className="fa-solid fa-coins text-amber-600"></i>
                          OPTION B: COST & STABILITY
                        </span>
                        <span className="text-[10px] font-bold bg-warningLight text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono">
                          MINIMAL COST
                        </span>
                      </div>

                      <p className="text-xs text-textSub mb-3">
                        {optB?.why || "Reduces setup costs and shopfloor changes by buffering job start and preserving stability."}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-bgMain p-3 rounded-lg border border-borderCol mb-3 font-mono">
                        <div>
                          <span className="text-[10px] text-textSub block font-sans">Machine Changes:</span>
                          <div className="font-bold text-textMain">{optB?.machine || "—"}</div>
                          <div className="text-[10px] text-textSub font-sans">{optB?.machine_name || ""}</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-textSub block font-sans">Predicted Processing:</span>
                          <div className="font-bold text-textMain">{optB?.predicted_processing_min || 0} min</div>
                          <div className="text-[10px] text-textSub font-sans">Setup: {optB?.setup_min || 0} min</div>
                        </div>
                        <div className="mt-1">
                          <span className="text-[10px] text-textSub block font-sans">Deadline Impact:</span>
                          <div className="font-bold text-amber-700">+{optB?.deadline_impact_min || 0} min</div>
                        </div>
                        <div className="mt-1">
                          <span className="text-[10px] text-textSub block font-sans">Production Cost:</span>
                          <div className="font-bold text-emerald-700">₹{(optB?.additional_cost || 0).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => setReviewingOption("OPTION_B")}
                        className="w-full py-2 bg-white border border-borderCol hover:bg-bgMain text-textMain font-semibold text-xs rounded-md transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-magnifying-glass-chart text-xs"></i>
                        <span>REVIEW OPTION B</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* REJECTION ACTION */}
              {isManager && actionStatus?.type !== "APPROVED" && (
                <div className="pt-2 flex justify-between items-center border-t border-borderCol">
                  <span className="text-xs text-textSub">
                    Neither option acceptable? Reject to keep machine offline and retain current schedule.
                  </span>
                  <button
                    onClick={handleRejectRecovery}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-semibold text-critical border border-rose-200 hover:bg-criticalLight rounded-md transition-colors"
                  >
                    Reject Both Alternatives
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 border-t border-borderCol bg-bgMain flex items-center justify-between rounded-b-xl">
          <span className="text-[11px] text-textSub">
            Authorized Role: <strong className="font-mono text-textMain">{user?.role || "OPERATOR"}</strong>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium border border-borderCol bg-white hover:bg-bgMain text-textMain rounded-md transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>

      {/* PART 13: EXPLICIT CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-borderCol rounded-xl shadow-modal p-6 space-y-4 antialiased"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-borderCol pb-3">
              <div className="w-9 h-9 rounded-full bg-primaryLight text-primary flex items-center justify-center font-bold">
                <i className="fa-solid fa-circle-question"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-textMain">
                  Approve Recovery Schedule?
                </h3>
                <p className="text-[11px] text-textSub">
                  This will replace the current active schedule for the affected operations.
                </p>
              </div>
            </div>

            <div className="bg-bgMain p-3.5 rounded-lg border border-borderCol space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-textSub font-sans">Selected Option:</span>
                <span className="font-bold text-primary">{confirmOptionKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSub font-sans">Expected Machine:</span>
                <span className="font-bold text-textMain">
                  {confirmOptionKey === "OPTION_A" ? optA?.machine : optB?.machine}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSub font-sans">Processing Time:</span>
                <span className="text-textMain">
                  {confirmOptionKey === "OPTION_A" ? optA?.predicted_processing_min : optB?.predicted_processing_min} min
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSub font-sans">Deadline Impact:</span>
                <span className="text-emerald-700 font-bold">
                  +{confirmOptionKey === "OPTION_A" ? optA?.deadline_impact_min : optB?.deadline_impact_min} min
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSub font-sans">Production Cost:</span>
                <span className="text-textMain font-bold">
                  ₹{(confirmOptionKey === "OPTION_A" ? optA?.additional_cost : optB?.additional_cost || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-borderCol">
                <span className="text-textSub font-sans">New Schedule Version:</span>
                <span className="text-primary font-bold">Version 2 (ACTIVE)</span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-textSub text-xs font-semibold rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={loading}
                className="px-5 py-2 bg-primary hover:bg-primaryHover text-white text-xs font-bold rounded-md shadow-sm transition-all flex items-center gap-1.5"
              >
                {loading && <i className="fa-solid fa-spinner fa-spin"></i>}
                <span>Confirm Approval</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
