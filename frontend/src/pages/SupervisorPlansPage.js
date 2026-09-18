import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function SupervisorPlansPage({ user }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchPlans = () => {
    setLoading(true);
    api.get("/planning/pending")
      .then((res) => {
        setPlans(res.data || []);
        if (res.data?.length > 0 && !selectedPlan) {
          setSelectedPlan(res.data[0]);
          setEditingPlan(JSON.parse(JSON.stringify(res.data[0])));
        }
      })
      .catch((err) => {
        setError("Failed to load pending plans");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setEditingPlan(JSON.parse(JSON.stringify(plan)));
    setValidationResult(null);
    setActionMessage(null);
  };

  const handleMachineChange = (seq, newMachineId) => {
    if (!editingPlan) return;
    const updatedOps = editingPlan.operations.map((op) => {
      if (op.sequence === seq) {
        return { ...op, machine_id: newMachineId };
      }
      return op;
    });
    setEditingPlan({ ...editingPlan, operations: updatedOps });
    setValidationResult(null);
  };

  const handleValidate = async () => {
    if (!editingPlan) return;
    setValidationResult({ checking: true });
    try {
      // First save edits
      await api.patch(`/planning/${editingPlan.id}`, { operations: editingPlan.operations });
      // Then validate
      const res = await api.post(`/planning/${editingPlan.id}/validate`);
      setValidationResult(res.data);
    } catch (err) {
      setValidationResult(err.response?.data || { is_valid: false, violated_constraint: "Validation error" });
    }
  };

  const handleApprove = async () => {
    if (!editingPlan) return;
    setActionMessage("Approving plan and committing to live production schedule...");
    try {
      const res = await api.post(`/planning/${editingPlan.id}/approve`);
      setActionMessage(`Plan ${editingPlan.id} APPROVED! Order committed to active shopfloor schedule.`);
      fetchPlans();
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || "Failed to approve plan");
    }
  };

  const handleReject = async () => {
    if (!editingPlan) return;
    const reason = prompt("Enter reason for rejection:", "Capacity bottleneck or line conflict");
    if (!reason) return;
    try {
      await api.post(`/planning/${editingPlan.id}/reject`, { reason });
      setActionMessage(`Plan ${editingPlan.id} REJECTED.`);
      fetchPlans();
    } catch (err) {
      setError("Failed to reject plan");
    }
  };

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
          Supervisor Production Plan Review &amp; Approval
        </h1>
        <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.875rem" }}>
          Human-in-the-loop governance: AI proposes, supervisor reviews, edits, validates, and approves before shopfloor execution
        </p>
      </div>

      {actionMessage && (
        <div style={{ padding: "1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "6px", marginBottom: "1.5rem" }}>
          {actionMessage}
        </div>
      )}

      {error && (
        <div style={{ padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "1.5rem" }}>
        {/* Left Column: Pending Plans List */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: "700", fontSize: "0.9rem", color: "#0f172a" }}>
            PENDING PLANS ({plans.length})
          </div>

          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontFamily: "monospace" }}>Loading...</div>
          ) : plans.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No pending plans for review.</div>
          ) : (
            <div style={{ maxHeight: "650px", overflowY: "auto" }}>
              {plans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPlan(p)}
                  style={{
                    padding: "1rem 1.25rem",
                    borderBottom: "1px solid #f1f5f9",
                    cursor: "pointer",
                    background: selectedPlan?.id === p.id ? "#f1f5f9" : "#ffffff",
                    borderLeft: selectedPlan?.id === p.id ? "4px solid #0284c7" : "4px solid transparent"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "700", fontFamily: "monospace", color: "#0f172a" }}>{p.id}</span>
                    <span style={{ fontSize: "0.7rem", fontWeight: "700", color: p.priority === "URGENT" ? "#b91c1c" : "#0369a1" }}>{p.priority}</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#334155", marginTop: "0.2rem" }}>{p.product_name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
                    Qty: {p.quantity?.toLocaleString()} &bull; Duration: {p.estimated_duration_hours}h &bull; Cost: ₹{p.estimated_cost?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Plan Review, Inline Edit & Actions */}
        {editingPlan ? (
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#64748b" }}>ORDER: {editingPlan.order_id}</span>
                <h3 style={{ margin: "0.2rem 0 0", fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
                  {editingPlan.product_name} ({editingPlan.quantity?.toLocaleString()} units)
                </h3>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleValidate}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#ffffff",
                    color: "#0f172a",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontWeight: "600",
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  VALIDATE PLAN
                </button>
                <button
                  onClick={handleApprove}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: "700",
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  APPROVE
                </button>
                <button
                  onClick={handleReject}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: "700",
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  REJECT
                </button>
              </div>
            </div>

            {/* Validation Feedback Banner */}
            {validationResult && (
              <div style={{
                padding: "0.8rem 1.5rem",
                borderBottom: "1px solid #e2e8f0",
                background: validationResult.is_valid ? "#f0fdf4" : "#fef2f2",
                color: validationResult.is_valid ? "#166534" : "#991b1b",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <strong>{validationResult.is_valid ? "✓ VALIDATION PASSED:" : "✕ VALIDATION FAILED:"}</strong>
                <span>{validationResult.is_valid ? validationResult.message : validationResult.violated_constraint}</span>
              </div>
            )}

            {/* Operations Table with Inline Machine Editing */}
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>
                  EDIT MACHINE ALLOCATIONS &amp; WORKFORCE
                </span>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Click machine dropdown to test supervisor override &amp; constraint validator
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", color: "#64748b", textTransform: "uppercase", fontSize: "0.7rem" }}>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0" }}>Seq</th>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0" }}>Process</th>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0" }}>Assigned Machine</th>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0" }}>Predicted Time</th>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0" }}>Worker</th>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0" }}>Material</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingPlan.operations?.map((op) => (
                      <tr key={op.sequence} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0", fontFamily: "monospace" }}>{op.sequence}</td>
                        <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0", fontWeight: "600" }}>{op.process_name}</td>
                        <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0" }}>
                          <input
                            type="text"
                            value={op.machine_id}
                            onChange={(e) => handleMachineChange(op.sequence, e.target.value.toUpperCase())}
                            style={{
                              padding: "0.3rem 0.5rem",
                              borderRadius: "4px",
                              border: "1px solid #cbd5e1",
                              fontFamily: "monospace",
                              fontWeight: "700",
                              fontSize: "0.85rem",
                              color: "#0f172a",
                              width: "110px"
                            }}
                          />
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0", fontFamily: "monospace" }}>{op.predicted_time_min}m</td>
                        <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0" }}>{op.worker_name}</td>
                        <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0" }}>
                          <span style={{ color: "#16a34a", fontWeight: "600", fontSize: "0.75rem" }}>✓ AVAILABLE</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
