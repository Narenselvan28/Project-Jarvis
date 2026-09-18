import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function SimulationPage() {
  const [machines, setMachines] = useState([]);
  const [targetMachineId, setTargetMachineId] = useState("M04");
  const [failureType, setFailureType] = useState("Mechanical Bearing Failure");
  const [durationHours, setDurationHours] = useState(6.0);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [applying, setApplying] = useState(false);
  const [appliedMsg, setAppliedMsg] = useState(null);

  useEffect(() => {
    api.get("/machines").then((res) => {
      setMachines(res.data.machines || []);
    });
  }, []);

  const runSimulation = async () => {
    try {
      setLoading(true);
      setAppliedMsg(null);
      const res = await api.post("/simulation/what-if", {
        machine_id: targetMachineId,
        failure_type: failureType,
        duration_hours: durationHours
      });
      setSimResult(res.data);
    } catch (err) {
      console.error("Simulation failed:", err);
      alert("Simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  const applyToProduction = async () => {
    try {
      setApplying(true);
      const res = await api.post("/simulation/apply", {
        machine_id: targetMachineId,
        failure_type: failureType,
        duration_hours: durationHours
      });
      setAppliedMsg("Simulation successfully applied to live production!");
      setSimResult(null);
    } catch (err) {
      console.error(err);
      alert("Failed to apply simulation.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          What-If Disruption Simulation Sandbox
        </h1>
        <p style={{ fontSize: "0.8rem", color: "#94a3b8", fontFamily: "monospace", marginTop: "0.2rem" }}>
          Model hypothetical machine failures and evaluate recovery cost, delay, and alternative substitutions without modifying live state
        </p>
      </div>

      {appliedMsg && (
        <div style={{ padding: "0.75rem", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#6ee7b7", borderRadius: "4px", marginBottom: "1rem" }}>
          {appliedMsg}
        </div>
      )}

      {/* Simulator Inputs Panel */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-header">
          <span className="panel-title">Simulation Parameters</span>
          <span style={{ fontSize: "0.72rem", color: "#38bdf8", fontFamily: "monospace" }}>
            NON-DESTRUCTIVE SANDBOX
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontFamily: "monospace", color: "#94a3b8", marginBottom: "0.35rem" }}>
              HYPOTHETICAL TARGET MACHINE
            </label>
            <select
              value={targetMachineId}
              onChange={(e) => setTargetMachineId(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", background: "#0b1220", border: "1px solid #243452", color: "#f8fafc", borderRadius: "4px" }}
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} - {m.name} ({m.lane_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontFamily: "monospace", color: "#94a3b8", marginBottom: "0.35rem" }}>
              FAILURE CLASSIFICATION
            </label>
            <select
              value={failureType}
              onChange={(e) => setFailureType(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", background: "#0b1220", border: "1px solid #243452", color: "#f8fafc", borderRadius: "4px" }}
            >
              <option value="Mechanical Bearing Failure">Mechanical Bearing Failure</option>
              <option value="Overheating & Coolant Failure">Overheating & Coolant Failure</option>
              <option value="Spindle Motor Stall">Spindle Motor Stall</option>
              <option value="Electrical Drive Trip">Electrical Drive Trip</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontFamily: "monospace", color: "#94a3b8", marginBottom: "0.35rem" }}>
              ESTIMATED DURATION: {durationHours}h
            </label>
            <input
              type="range"
              min="1"
              max="24"
              step="0.5"
              value={durationHours}
              onChange={(e) => setDurationHours(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={runSimulation}
          disabled={loading}
        >
          {loading ? "Running Sandbox Pipeline..." : "Execute What-If Simulation"}
        </button>
      </div>

      {/* Simulation Results */}
      {simResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            <div className="stat-box">
              <div className="stat-label">Impacted Orders</div>
              <div className="stat-val" style={{ color: "#ef4444" }}>
                {simResult.impact_analysis?.affected_orders_count || 0}
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-label">Projected Downtime</div>
              <div className="stat-val">{simResult.duration_hours}h</div>
            </div>

            <div className="stat-box">
              <div className="stat-label">Alternative Candidates</div>
              <div className="stat-val" style={{ color: "#38bdf8" }}>
                {simResult.candidate_evaluations?.length || 0}
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-label">CP-SAT Feasibility</div>
              <div className="stat-val" style={{ color: "#10b981" }}>
                {simResult.projected_optimization?.status || "FEASIBLE"}
              </div>
            </div>
          </div>

          {/* Projected Machine Substitutions */}
          {simResult.projected_optimization?.schedule_changes?.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Projected Machine Substitution Changes</span>
              </div>
              <table className="tech-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Process</th>
                    <th>Disrupted Machine</th>
                    <th>Substituted Alternative</th>
                    <th>Predicted Window</th>
                  </tr>
                </thead>
                <tbody>
                  {simResult.projected_optimization.schedule_changes.map((c, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#38bdf8" }}>{c.order_id}</td>
                      <td>{c.process_name}</td>
                      <td style={{ color: "#f87171" }}>{c.previous_machine}</td>
                      <td style={{ color: "#34d399", fontWeight: 700 }}>{c.new_machine}</td>
                      <td>{c.scheduled_start}m - {c.scheduled_end}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Action Bar */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <button
              className="btn btn-danger"
              onClick={applyToProduction}
              disabled={applying}
            >
              {applying ? "Applying..." : "APPLY SIMULATION TO LIVE FACTORY"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
