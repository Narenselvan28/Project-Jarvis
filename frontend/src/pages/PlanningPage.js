import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function PlanningPage({ user }) {
  const navigate = useNavigate();
  const [productName, setProductName] = useState("Classic Crew Neck T-Shirt");
  const [quantity, setQuantity] = useState(12000);
  const [priority, setPriority] = useState("URGENT");
  const [deadline, setDeadline] = useState("2026-09-25T18:00");
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [error, setError] = useState(null);

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/planning/generate", {
        product_name: productName,
        quantity: parseInt(quantity, 10),
        priority: priority,
        deadline: deadline
      });
      setGeneratedPlan(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate AI production plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
          New Order Production Planning (Intelligence Loop 1)
        </h1>
        <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.875rem" }}>
          Automate the manual calculations: Machine Availability + Capacities + ML Predictions + OR-Tools CP-SAT
        </p>
      </div>

      {error && (
        <div style={{ padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px", marginBottom: "1.5rem" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Order Creation Form */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1.5rem", marginBottom: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a", marginTop: 0, marginBottom: "1rem" }}>
          1. Confirm Customer Order Requirements
        </h2>

        <form onSubmit={handleGeneratePlan} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700", display: "block", marginBottom: "0.3rem" }}>
              PRODUCT TYPE:
            </label>
            <select
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            >
              <option value="Classic Crew Neck T-Shirt">Classic Crew Neck T-Shirt (PRD-TSHIRT-01)</option>
              <option value="Pique Collar Polo Shirt">Pique Collar Polo Shirt (PRD-POLO-02)</option>
              <option value="Heavyweight Fleece Pullover">Heavyweight Fleece Pullover (PRD-HOODIE-03)</option>
              <option value="Tapered Rib Joggers">Tapered Rib Joggers (PRD-JOGGER-04)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700", display: "block", marginBottom: "0.3rem" }}>
              ORDER QUANTITY (PIECES):
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="100"
              step="500"
              required
              style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700", display: "block", marginBottom: "0.3rem" }}>
              ORDER PRIORITY:
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            >
              <option value="URGENT">URGENT (High Priority)</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700", display: "block", marginBottom: "0.3rem" }}>
              DELIVERY DEADLINE:
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                background: loading ? "#94a3b8" : "#0f172a",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                fontWeight: "700",
                fontSize: "0.9rem",
                cursor: loading ? "wait" : "pointer"
              }}
            >
              {loading ? "CALCULATING PRODUCTION PLAN (ML + OR-TOOLS)..." : "CONFIRM REQUIREMENTS & GENERATE AI PRODUCTION PLAN"}
            </button>
          </div>
        </form>
      </div>

      {/* Generated AI Production Plan Display */}
      {generatedPlan && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "1.25rem 1.5rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#64748b" }}>{generatedPlan.id}</span>
              <h3 style={{ margin: "0.2rem 0 0", fontSize: "1.15rem", fontWeight: "700", color: "#0f172a" }}>
                AI-Generated Production Plan &mdash; Awaiting Supervisor Review
              </h3>
            </div>
            <span style={{
              padding: "0.3rem 0.75rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: "700",
              background: "#fef3c7",
              color: "#b45309"
            }}>
              {generatedPlan.status}
            </span>
          </div>

          {/* AI Metrics Grid */}
          <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: "700" }}>ESTIMATED DURATION</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "700", fontFamily: "monospace", color: "#0f172a" }}>{generatedPlan.estimated_duration_hours} hrs</div>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: "700" }}>WORKING DAYS</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "700", fontFamily: "monospace", color: "#0f172a" }}>{generatedPlan.estimated_working_days} days</div>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: "700" }}>ESTIMATED COST</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "700", fontFamily: "monospace", color: "#0f172a" }}>₹{generatedPlan.estimated_cost?.toLocaleString()}</div>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: "700" }}>BOTTLENECK RISK</div>
              <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#b45309" }}>{generatedPlan.bottleneck_risk}</div>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: "700" }}>DEADLINE RISK</div>
              <div style={{ fontSize: "0.95rem", fontWeight: "700", color: generatedPlan.deadline_risk === "LOW" ? "#15803d" : "#b91c1c" }}>
                {generatedPlan.deadline_risk}
              </div>
            </div>
          </div>

          {/* Generated Machine Allocations Table */}
          <div style={{ padding: "1.5rem" }}>
            <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "#334155" }}>
              Machine &amp; Operator Allocation Schedule
            </h4>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", color: "#475569", textTransform: "uppercase", fontSize: "0.7rem" }}>
                    <th style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0" }}>Seq</th>
                    <th style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0" }}>Process</th>
                    <th style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0" }}>Allocated Machine</th>
                    <th style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0" }}>Lane</th>
                    <th style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0" }}>Predicted Time</th>
                    <th style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0" }}>Setup Time</th>
                    <th style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0" }}>Assigned Worker</th>
                    <th style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedPlan.operations?.map((op) => (
                    <tr key={op.sequence} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0", fontFamily: "monospace" }}>{op.sequence}</td>
                      <td style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0", fontWeight: "600" }}>{op.process_name}</td>
                      <td style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0", fontFamily: "monospace", fontWeight: "700", color: "#0284c7" }}>
                        {op.machine_id}
                      </td>
                      <td style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0", fontFamily: "monospace" }}>{op.lane_id}</td>
                      <td style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0", fontFamily: "monospace" }}>{op.predicted_time_min}m</td>
                      <td style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0", fontFamily: "monospace" }}>{op.setup_time_min}m</td>
                      <td style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0" }}>{op.worker_name}</td>
                      <td style={{ padding: "0.6rem 0.8rem", border: "1px solid #e2e8f0", fontFamily: "monospace" }}>₹{op.operation_cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button
                onClick={() => navigate("/supervisor/plans")}
                style={{
                  padding: "0.65rem 1.25rem",
                  background: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  fontWeight: "700",
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                OPEN SUPERVISOR REVIEW SCREEN &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
