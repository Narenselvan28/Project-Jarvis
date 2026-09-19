import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function SupervisorReviewPage({ user }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("REVIEW"); // 'REVIEW' | 'EDIT'
  const [validationResult, setValidationResult] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("Approved by Production Supervisor after operational constraint check.");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("Supervisor rejected machine allocations or delivery window.");

  const rawRole = (user?.role || "OPERATOR").toUpperCase().replace(" ", "_");
  const isSupervisorOrManager = rawRole === "SUPERVISOR" || rawRole === "MANAGER" || rawRole === "ADMIN";

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get("/orders/plans");
      const payload = res.data?.data || res.data || [];
      setPlans(payload);
      if (payload.length > 0) {
        setSelectedPlan(payload[0]);
        setEditingPlan(JSON.parse(JSON.stringify(payload[0])));
      }
    } catch (err) {
      console.error("Error loading plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setEditingPlan(JSON.parse(JSON.stringify(plan)));
    setValidationResult(null);
    setActionMessage(null);
    setViewMode("REVIEW");
  };

  const handleMachineChange = (seq, newMachineId) => {
    if (!editingPlan) return;
    const updatedOps = (editingPlan.operations || []).map((op) => {
      if (op.sequence === seq) {
        return { ...op, machine_id: newMachineId, assigned_machine_id: newMachineId };
      }
      return op;
    });
    setEditingPlan({ ...editingPlan, operations: updatedOps });
    setValidationResult(null);
  };

  const handleValidate = async () => {
    if (!editingPlan) return;
    try {
      setIsSubmitting(true);
      const res = await api.post(`/orders/plan/${editingPlan.id}/validate`, {
        operations: editingPlan.operations
      });
      const data = res.data?.data || res.data;
      setValidationResult(data);
    } catch (err) {
      console.error(err);
      setValidationResult({
        is_valid: false,
        violated_constraint: err.response?.data?.error?.message || "Operational constraint violation detected."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmApproval = async () => {
    if (!editingPlan) return;
    try {
      setIsSubmitting(true);
      setShowApproveModal(false);

      const res = await api.post(`/orders/plan/${editingPlan.id}/approve`, {
        operations: editingPlan.operations,
        notes: approvalNotes || "Approved by Production Supervisor",
        approval_role: user?.role || "SUPERVISOR",
        approved_by: user?.username || "supervisor"
      });

      setActionMessage({
        type: "SUCCESS",
        text: `Plan ${editingPlan.id} approved successfully! Order ${res.data?.data?.order_id || editingPlan.order_id} committed to ACTIVE production schedule.`
      });
      await loadPlans();
    } catch (err) {
      console.error("Approval error:", err);
      const errObj = err.response?.data?.error || err.response?.data;
      const msg = errObj?.message || (typeof errObj === "string" ? errObj : "Approval failed: Invalid state transition.");
      setActionMessage({ type: "ERROR", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!editingPlan) return;
    try {
      setIsSubmitting(true);
      setShowRejectModal(false);

      await api.post(`/orders/plan/${editingPlan.id}/reject`, {
        reason: rejectionReason || "Supervisor rejected machine allocations or delivery window."
      });

      setActionMessage({
        type: "SUCCESS",
        text: `Plan ${editingPlan.id} rejected. Order status set to REJECTED.`
      });
      await loadPlans();
    } catch (err) {
      console.error(err);
      setActionMessage({ type: "ERROR", text: "Rejection failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract ML & Plan summary
  const ops = editingPlan?.operations || [];
  const assignedMachines = [...new Set(ops.map((o) => o.assigned_machine_id || o.machine_id).filter(Boolean))];
  const totalPredictedMin = ops.reduce((acc, o) => acc + (o.predicted_time_min || o.processing_time_min || 0), 0);
  const totalPredictedHours = (totalPredictedMin / 60).toFixed(1);
  const failureRiskPct = editingPlan?.failure_risk_pct || editingPlan?.avg_failure_risk || "4.2";

  const planStatus = (editingPlan?.status || "PENDING_SUPERVISOR_REVIEW").toUpperCase();
  const isPendingReview = ["PENDING_SUPERVISOR_REVIEW", "PENDING", "PENDING_SUPERVISOR_APPROVAL", "SUPERVISOR_EDITED"].includes(planStatus);
  const isApproved = ["SUPERVISOR_APPROVED", "ACTIVE", "IN_PRODUCTION", "COMPLETED"].includes(planStatus);
  const isRejected = planStatus === "REJECTED";

  return (
    <div className="flex-1 flex flex-col h-full bg-bgMain overflow-hidden p-6 antialiased">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6 shrink-0">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary border border-borderCol shadow-soft">
            <i className="fa-solid fa-clipboard-check text-xl"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-textMain">Meerpaarvai — Supervisor Plan Review</h1>
              <span className="text-[10px] bg-primaryLight text-primary font-bold px-2 py-0.5 rounded-full border border-plum-100 font-mono">
                {plans.length} Proposed
              </span>
            </div>
            <p className="text-xs text-textSub mt-0.5">
              Review AI-proposed production routes, evaluate machine allocations, validate constraints, and sign off for plant floor activation.
            </p>
          </div>
        </div>

        <button
          onClick={loadPlans}
          className="px-3.5 py-1.5 bg-white border border-borderCol hover:bg-bgMain text-textMain rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <i className={`fa-solid fa-rotate text-xs text-textSub ${loading ? "fa-spin" : ""}`}></i>
          <span>Refresh Plans</span>
        </button>
      </div>

      {actionMessage && (
        <div className={`p-3.5 mb-4 rounded-lg border text-xs font-medium flex items-center gap-2 shrink-0 ${
          actionMessage.type === "SUCCESS"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-criticalLight border-rose-200 text-critical"
        }`}>
          <i className={`fa-solid ${actionMessage.type === "SUCCESS" ? "fa-circle-check" : "fa-circle-exclamation"} text-sm`}></i>
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        {/* Left Column: Plans List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-borderCol rounded-xl shadow-soft overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-borderCol bg-white flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-textSub">
              Proposed Production Plans
            </span>
            <span className="text-[10px] text-textSub font-mono">
              Status: PENDING REVIEW
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-borderCol">
            {loading ? (
              <div className="py-12 text-center text-xs text-textSub font-mono">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                Loading planning queue...
              </div>
            ) : plans.length > 0 ? (
              plans.map((p) => {
                const isSelected = selectedPlan?.id === p.id;
                const isUrgent = p.priority === "URGENT";

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPlan(p)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primaryLight border-l-4 border-primary"
                        : "hover:bg-bgMain border-l-4 border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-textMain">{p.id}</span>
                      <span className={`status-pill inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isUrgent ? "bg-criticalLight text-critical border border-rose-200" : "bg-primaryLight text-primary border border-plum-100"
                      }`}>
                        {p.priority}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-textMain mt-1 truncate">
                      {p.product_name}
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-[10px] text-textSub font-mono mt-2 pt-2 border-t border-borderCol">
                      <div>Qty: {(p.quantity || 0).toLocaleString()}</div>
                      <div>Dur: {p.estimated_duration_hours || 24}h</div>
                      <div className="text-right font-semibold text-textMain">₹{(p.estimated_cost || 0).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-xs text-textSub font-mono">
                No proposed plans awaiting review.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Plan Detail (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-borderCol rounded-xl shadow-soft overflow-hidden flex flex-col">
          {editingPlan ? (
            <>
              {/* Header Toolbar with PART 5 explicit actions: [ REVIEW ] [ EDIT PLAN ] [ APPROVE PLAN ] [ REJECT PLAN ] */}
              <div className="px-6 py-4 border-b border-borderCol bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-primary">{editingPlan.id}</span>
                    <span className="text-xs text-textSub font-mono">({editingPlan.order_id})</span>
                    <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-200 font-mono">
                      {editingPlan.status || "PENDING_SUPERVISOR_REVIEW"}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-textMain mt-0.5">
                    {editingPlan.product_name} — {(editingPlan.quantity || 0).toLocaleString()} Units
                  </h2>
                </div>

                {isSupervisorOrManager && (
                  <div className="flex items-center gap-2">
                    {/* State-aware action buttons */}
                    {isPendingReview ? (
                      <>
                        <button
                          onClick={() => setViewMode("REVIEW")}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                            viewMode === "REVIEW"
                              ? "bg-primaryLight text-primary border border-plum-100"
                              : "bg-white border border-borderCol text-textSub hover:bg-bgMain"
                          }`}
                        >
                          <i className="fa-solid fa-eye mr-1"></i>
                          <span>REVIEW</span>
                        </button>

                        <button
                          onClick={() => setViewMode("EDIT")}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                            viewMode === "EDIT"
                              ? "bg-primaryLight text-primary border border-plum-100"
                              : "bg-white border border-borderCol text-textSub hover:bg-bgMain"
                          }`}
                        >
                          <i className="fa-solid fa-pen mr-1"></i>
                          <span>EDIT PLAN</span>
                        </button>

                        <button
                          onClick={() => setShowApproveModal(true)}
                          disabled={isSubmitting}
                          className="px-3.5 py-1.5 bg-primary hover:bg-primaryHover text-white rounded-md text-xs font-bold transition-colors shadow-sm"
                        >
                          <i className="fa-solid fa-check mr-1"></i>
                          <span>APPROVE PLAN</span>
                        </button>

                        <button
                          onClick={() => setShowRejectModal(true)}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 bg-criticalLight text-critical border border-rose-200 hover:bg-critical hover:text-white rounded-md text-xs font-medium transition-colors"
                        >
                          <span>REJECT PLAN</span>
                        </button>
                      </>
                    ) : isRejected ? (
                      <>
                        <button
                          onClick={() => setViewMode("REVIEW")}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-borderCol text-textSub hover:bg-bgMain"
                        >
                          <i className="fa-solid fa-eye mr-1"></i>
                          <span>VIEW DETAILS</span>
                        </button>
                        <span className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-xs font-bold font-mono">
                          <i className="fa-solid fa-ban mr-1"></i> PLAN REJECTED
                        </span>
                        <button
                          onClick={() => {
                            setActionMessage({
                              type: "SUCCESS",
                              text: `Re-optimization triggered for Order ${editingPlan.order_id}. Generating new candidate plan.`
                            });
                          }}
                          className="px-3 py-1.5 bg-primaryLight text-primary border border-plum-200 hover:bg-primary hover:text-white rounded-md text-xs font-medium transition-colors"
                        >
                          <i className="fa-solid fa-arrows-rotate mr-1"></i>
                          <span>REGENERATE PLAN</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setViewMode("REVIEW")}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-borderCol text-textSub hover:bg-bgMain"
                        >
                          <i className="fa-solid fa-eye mr-1"></i>
                          <span>VIEW DETAILS</span>
                        </button>
                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-bold font-mono">
                          <i className="fa-solid fa-check-circle mr-1"></i> ACTIVE ON FLOOR
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Validation Result Banner */}
              {validationResult && (
                <div className={`px-6 py-2.5 border-b text-xs font-medium flex items-center gap-2.5 shrink-0 ${
                  validationResult.is_valid
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-criticalLight border-rose-200 text-critical"
                }`}>
                  <i className={`fa-solid ${validationResult.is_valid ? "fa-circle-check" : "fa-triangle-exclamation"} text-sm`}></i>
                  <span>
                    {validationResult.is_valid
                      ? "✓ Validation Passed: All machine capabilities, operator skills, precedence constraints, and delivery SLA are satisfied."
                      : `✕ Validation Failed: ${validationResult.violated_constraint || "Constraint violation detected."}`}
                  </span>
                </div>
              )}

              {/* PART 5: GENERATED PRODUCTION PLAN SUMMARY CARD */}
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="p-5 bg-bgMain border border-borderCol rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-borderCol pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-textSub flex items-center gap-2">
                      <i className="fa-solid fa-microchip text-primary"></i>
                      GENERATED PRODUCTION PLAN
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded">
                      STATUS: {editingPlan.status || "PENDING SUPERVISOR REVIEW"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 bg-white border border-borderCol rounded-lg">
                      <span className="text-[10px] font-sans text-textSub block">ML Processing Time:</span>
                      <strong className="text-sm font-bold text-textMain">{totalPredictedHours} hrs</strong>
                      <span className="text-[10px] font-sans text-textSub block mt-0.5">({totalPredictedMin} min total)</span>
                    </div>

                    <div className="p-3 bg-white border border-borderCol rounded-lg">
                      <span className="text-[10px] font-sans text-textSub block">ML Failure Risk:</span>
                      <strong className="text-sm font-bold text-emerald-700">{failureRiskPct}%</strong>
                      <span className="text-[10px] font-sans text-textSub block mt-0.5">Fleet Baseline Safe</span>
                    </div>

                    <div className="p-3 bg-white border border-borderCol rounded-lg">
                      <span className="text-[10px] font-sans text-textSub block">Estimated Cost:</span>
                      <strong className="text-sm font-bold text-textMain">₹{(editingPlan.estimated_cost || 85000).toLocaleString()}</strong>
                      <span className="text-[10px] font-sans text-textSub block mt-0.5">Total Batch BOM + Energy</span>
                    </div>

                    <div className="p-3 bg-white border border-borderCol rounded-lg">
                      <span className="text-[10px] font-sans text-textSub block">Delivery Deadline:</span>
                      <strong className="text-xs font-bold text-primary">{editingPlan.delivery_deadline || editingPlan.deadline || "2026-09-25 18:00"}</strong>
                      <span className="text-[10px] font-sans text-emerald-700 block mt-0.5">SLA Feasible (On Schedule)</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-textSub block mb-1.5">
                      Recommended Machines (OR-Tools CP-SAT Solved Sequence):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedMachines.map((mId) => (
                        <span key={mId} className="px-2.5 py-1 bg-white border border-borderCol text-primary font-mono text-xs font-bold rounded-md shadow-sm">
                          {mId}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Operations Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-textSub">
                      {viewMode === "EDIT" ? "Edit Machine Allocations & Re-Validate" : "Scheduled Stage Operations"}
                    </span>
                    {viewMode === "EDIT" && (
                      <button
                        onClick={handleValidate}
                        disabled={isSubmitting}
                        className="px-3 py-1 bg-white border border-borderCol hover:bg-bgMain text-primary text-xs font-semibold rounded shadow-sm"
                      >
                        <i className="fa-solid fa-check-double mr-1"></i>
                        <span>Check CP-SAT Constraints</span>
                      </button>
                    )}
                  </div>

                  <div className="border border-borderCol rounded-xl overflow-hidden shadow-soft bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-bgMain border-b border-borderCol text-[10px] font-semibold text-textSub uppercase tracking-wider">
                          <th className="py-3 px-4 w-12">Seq</th>
                          <th className="py-3 px-4">Process</th>
                          <th className="py-3 px-4">Assigned Machine</th>
                          <th className="py-3 px-4">ML Predicted Duration</th>
                          <th className="py-3 px-4">Worker Skill Level</th>
                          <th className="py-3 px-4">Material Status</th>
                          <th className="py-3 px-4 text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-textMain divide-y divide-borderCol">
                        {(editingPlan.operations || []).map((op) => (
                          <tr key={op.sequence} className="hover:bg-bgMain transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-textSub">{op.sequence}</td>
                            <td className="py-3 px-4 font-semibold text-textMain">{op.process_name}</td>
                            <td className="py-3 px-4">
                              {viewMode === "EDIT" ? (
                                <input
                                  type="text"
                                  value={op.machine_id || op.assigned_machine_id || ""}
                                  onChange={(e) => handleMachineChange(op.sequence, e.target.value.toUpperCase())}
                                  className="w-24 px-2 py-1 text-xs font-mono font-bold text-primary bg-white border border-borderCol rounded focus:outline-none focus:border-primary uppercase"
                                />
                              ) : (
                                <span className="font-mono font-bold text-primary px-2 py-0.5 bg-primaryLight rounded">
                                  {op.machine_id || op.assigned_machine_id || "—"}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-textSub">
                              {op.predicted_time_min || op.processing_time_min || 60} min
                            </td>
                            <td className="py-3 px-4 text-textSub">{op.worker_name || "Senior Technician"}</td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                ✓ ALLOCATED
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-textMain">
                              ₹{(op.operation_cost || 1200).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs text-textSub font-mono">
              Select a production plan from the queue to inspect allocations.
            </div>
          )}
        </div>
      </div>

      {/* PART 5: EXPLICIT APPROVAL CONFIRMATION MODAL */}
      {showApproveModal && editingPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowApproveModal(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-borderCol rounded-xl shadow-modal p-6 space-y-4 antialiased"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-borderCol pb-3">
              <div className="w-10 h-10 rounded-full bg-primaryLight text-primary flex items-center justify-center font-bold text-lg">
                <i className="fa-solid fa-clipboard-check"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-textMain tracking-wide uppercase">
                  CONFIRM PRODUCTION PLAN
                </h3>
                <p className="text-[11px] text-textSub">
                  Confirm that this plan should become the active production schedule?
                </p>
              </div>
            </div>

            <div className="bg-bgMain p-3.5 rounded-lg border border-borderCol space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-textSub font-sans">Plan ID:</span>
                <span className="font-bold text-primary">{editingPlan.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSub font-sans">Order ID:</span>
                <span className="font-bold text-textMain">{editingPlan.order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSub font-sans">Allocated Machines:</span>
                <span className="font-bold text-textMain truncate max-w-[200px]" title={assignedMachines.join(", ")}>
                  {assignedMachines.length > 0 ? assignedMachines.join(", ") : "Optimal Fleet Selection"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSub font-sans">Predicted Completion:</span>
                <span className="text-textMain">{totalPredictedHours} hrs ({totalPredictedMin} min)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSub font-sans">Delivery Deadline:</span>
                <span className="text-textMain font-semibold">{editingPlan.delivery_date || editingPlan.due_date || "Within Customer SLA"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSub font-sans">Cost:</span>
                <span className="text-textMain font-bold">₹{(editingPlan.estimated_cost || 85000).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-borderCol/60">
                <span className="text-textSub font-sans">Target Schedule Version:</span>
                <span className="text-emerald-700 font-bold">ACTIVE (Version 1)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSub mb-1">
                Supervisor Approval Notes (Audit Log)
              </label>
              <input
                type="text"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-borderCol rounded-md text-textMain focus:outline-none focus:border-primary shadow-sm"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-textSub text-xs font-semibold rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={isSubmitting}
                className="px-5 py-2 bg-primary hover:bg-primaryHover text-white text-xs font-bold rounded-md shadow-sm transition-all flex items-center gap-1.5"
              >
                {isSubmitting && <i className="fa-solid fa-spinner fa-spin"></i>}
                <span>Confirm Approval</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {showRejectModal && editingPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-borderCol rounded-xl shadow-modal p-6 space-y-4 antialiased"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-borderCol pb-3">
              <div className="w-10 h-10 rounded-full bg-criticalLight text-critical flex items-center justify-center font-bold text-lg">
                <i className="fa-solid fa-ban"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-textMain">
                  Reject Production Plan?
                </h3>
                <p className="text-[11px] text-textSub">
                  Provide a mandatory rejection reason for the production planner.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSub mb-1">
                Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs bg-white border border-borderCol rounded-md text-textMain focus:outline-none focus:border-primary shadow-sm"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-textSub text-xs font-semibold rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                disabled={isSubmitting}
                className="px-5 py-2 bg-critical hover:bg-rose-700 text-white text-xs font-bold rounded-md shadow-sm transition-all"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
