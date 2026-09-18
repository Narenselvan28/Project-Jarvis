import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function SupervisorReviewPage({ user }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSupervisorOrManager = user?.role === "SUPERVISOR" || user?.role === "MANAGER";

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

  const handleApprove = async () => {
    if (!editingPlan) return;
    try {
      setIsSubmitting(true);
      const res = await api.post(`/orders/plan/${editingPlan.id}/approve`, {
        operations: editingPlan.operations,
        notes: "Approved by Production Supervisor"
      });
      setActionMessage({
        type: "SUCCESS",
        text: `Plan ${editingPlan.id} approved successfully! Order ${res.data?.data?.order_id || editingPlan.order_id} committed to active schedule.`
      });
      await loadPlans();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error?.message || err.response?.data?.error || "Approval failed.";
      setActionMessage({ type: "ERROR", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!editingPlan) return;
    try {
      setIsSubmitting(true);
      await api.post(`/orders/plan/${editingPlan.id}/reject`, {
        reason: "Supervisor rejected machine allocations or delivery window."
      });
      setActionMessage({
        type: "SUCCESS",
        text: `Plan ${editingPlan.id} rejected.`
      });
      await loadPlans();
    } catch (err) {
      console.error(err);
      setActionMessage({ type: "ERROR", text: "Rejection failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bgMain overflow-hidden p-6 antialiased">
      {/* Page Header matching ui.txt */}
      <div className="flex items-start justify-between mb-6">
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
          <i className="fa-solid fa-rotate text-xs text-textSub"></i>
          <span>Refresh Plans</span>
        </button>
      </div>

      {actionMessage && (
        <div className={`p-3.5 mb-4 rounded-lg border text-xs font-medium flex items-center gap-2 ${
          actionMessage.type === "SUCCESS"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-criticalLight border-rose-200 text-critical"
        }`}>
          <i className={`fa-solid ${actionMessage.type === "SUCCESS" ? "fa-circle-check" : "fa-circle-exclamation"} text-sm`}></i>
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Plans Sidebar + Plan Deep Dive */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        {/* Left Column: Plans List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-borderCol rounded-xl shadow-soft overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-borderCol bg-white flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-textSub">
              Proposed Production Plans
            </span>
            <span className="text-[10px] text-textSub font-mono">Status: Pending</span>
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

        {/* Right Column: Plan Detail & Constraint Validator (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-borderCol rounded-xl shadow-soft overflow-hidden flex flex-col">
          {editingPlan ? (
            <>
              {/* Header Toolbar */}
              <div className="px-6 py-4 border-b border-borderCol bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-primary">{editingPlan.id}</span>
                    <span className="text-xs text-textSub font-mono">({editingPlan.order_id})</span>
                    <span className="text-[10px] bg-primaryLight text-primary px-2 py-0.5 rounded font-semibold border border-plum-100">
                      {editingPlan.status}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-textMain mt-0.5">
                    {editingPlan.product_name} — {(editingPlan.quantity || 0).toLocaleString()} Units
                  </h2>
                </div>

                {isSupervisorOrManager && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleValidate}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-white border border-borderCol hover:bg-bgMain text-textMain rounded-md text-xs font-medium transition-colors shadow-sm"
                    >
                      <i className="fa-solid fa-check-double mr-1 text-primary"></i>
                      <span>Validate</span>
                    </button>

                    <button
                      onClick={handleApprove}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 bg-primary hover:bg-primaryHover text-white rounded-md text-xs font-medium transition-colors shadow-sm"
                    >
                      <i className="fa-solid fa-check mr-1"></i>
                      <span>Approve Plan</span>
                    </button>

                    <button
                      onClick={handleReject}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-criticalLight text-critical border border-rose-200 hover:bg-critical hover:text-white rounded-md text-xs font-medium transition-colors"
                    >
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Validation Result Banner */}
              {validationResult && (
                <div className={`px-6 py-3 border-b text-xs font-medium flex items-center gap-2.5 ${
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

              {/* Operations Table with Inline Machine Override */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-textSub">
                    Stage Operations & Machine Allocation Overrides
                  </span>
                  <span className="text-[10px] text-textSub">
                    Edit machine ID to test supervisor overrides against constraint solver
                  </span>
                </div>

                <div className="border border-borderCol rounded-xl overflow-hidden shadow-soft bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-borderCol text-[10px] font-semibold text-textSub uppercase tracking-wider">
                        <th className="py-3 px-4 w-12">Seq</th>
                        <th className="py-3 px-4">Process</th>
                        <th className="py-3 px-4">Assigned Machine</th>
                        <th className="py-3 px-4">Predicted Time</th>
                        <th className="py-3 px-4">Worker</th>
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
                            <input
                              type="text"
                              value={op.machine_id || op.assigned_machine_id || ""}
                              onChange={(e) => handleMachineChange(op.sequence, e.target.value.toUpperCase())}
                              className="w-24 px-2 py-1 text-xs font-mono font-bold text-primary bg-bgMain border border-borderCol rounded focus:outline-none focus:border-primary uppercase"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono text-textSub">
                            Predicted Time: {op.predicted_time_min || op.processing_time_min || 60} min
                          </td>
                          <td className="py-3 px-4 text-textSub">{op.worker_name || "Senior Operator"}</td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              ✓ AVAILABLE
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
            </>
          ) : (
            <div className="py-16 text-center text-xs text-textSub font-mono">
              Select a production plan from the queue to inspect allocations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
