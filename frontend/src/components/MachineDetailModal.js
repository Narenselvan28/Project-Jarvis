import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function MachineDetailModal({ machine, onClose, onSimulateFailure, onViewOrder }) {
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  useEffect(() => {
    if (machine) {
      setLoadingCandidates(true);
      api.get(`/machines/${machine.id}/candidates`)
        .then((res) => {
          setCandidates(res.data.candidates || []);
        })
        .catch((err) => {
          console.error("Error loading candidates:", err);
          setCandidates([]);
        })
        .finally(() => setLoadingCandidates(false));
    }
  }, [machine]);

  if (!machine) return null;

  const isFailed = machine.status === "FAILED";

  return (
    <aside className="factory-inspector-drawer">
      <div className="drawer-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "monospace", color: "#f8fafc" }}>
              {machine.id}
            </span>
            <span className={`status-pill status-${machine.status.toLowerCase()}`}>
              {machine.status}
            </span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.2rem" }}>
            {machine.name} • {machine.lane_name || machine.lane_id}
          </div>
        </div>

        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="drawer-content">
        {/* Quick Operations Bar */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {!isFailed && (
            <button
              className="btn btn-danger btn-sm"
              style={{ flex: 1 }}
              onClick={() => onSimulateFailure(machine)}
            >
              Simulate Failure
            </button>
          )}

          {machine.current_order_id && (
            <button
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={() => onViewOrder(machine.current_order_id)}
            >
              Inspect Order ({machine.current_order_id})
            </button>
          )}
        </div>

        {/* Operational Telemetry Grid */}
        <div className="stat-grid">
          <div className="stat-box">
            <div className="stat-label">Process Stage</div>
            <div className="stat-val" style={{ fontSize: "0.95rem" }}>
              {machine.process_name || machine.process_id}
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Precision Grade</div>
            <div className="stat-val" style={{ fontSize: "0.95rem", color: "#38bdf8" }}>
              {machine.precision_level || "HIGH"}
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Utilization</div>
            <div className="stat-val" style={{ color: "#34d399" }}>
              {machine.current_utilization}%
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Hourly Rate</div>
            <div className="stat-val">
              ₹{machine.hourly_rate?.toLocaleString()}
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Cycle Time (Base)</div>
            <div className="stat-val">
              {machine.base_cycle_time}m
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Setup Time</div>
            <div className="stat-val">
              {machine.setup_time_min}m
            </div>
          </div>
        </div>

        {/* Machine Health & Sensor Diagnostics */}
        <div className="panel" style={{ padding: "0.85rem" }}>
          <div className="panel-header" style={{ marginBottom: "0.5rem" }}>
            <span className="panel-title">Sensors & Predictive Health</span>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "0.78rem",
                color: machine.failure_risk > 50 ? "#ef4444" : "#10b981"
              }}
            >
              Risk: {machine.failure_risk}%
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", textAlign: "center" }}>
            <div style={{ background: "#0b1220", padding: "0.4rem", borderRadius: "3px" }}>
              <div style={{ fontSize: "0.65rem", color: "#64748b" }}>TEMPERATURE</div>
              <div style={{ fontFamily: "monospace", fontWeight: 700, color: machine.temperature > 80 ? "#ef4444" : "#e2e8f0" }}>
                {machine.temperature}°C
              </div>
            </div>

            <div style={{ background: "#0b1220", padding: "0.4rem", borderRadius: "3px" }}>
              <div style={{ fontSize: "0.65rem", color: "#64748b" }}>VIBRATION</div>
              <div style={{ fontFamily: "monospace", fontWeight: 700, color: machine.vibration > 3.0 ? "#f97316" : "#e2e8f0" }}>
                {machine.vibration} mm/s
              </div>
            </div>

            <div style={{ background: "#0b1220", padding: "0.4rem", borderRadius: "3px" }}>
              <div style={{ fontSize: "0.65rem", color: "#64748b" }}>RUNTIME</div>
              <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#e2e8f0" }}>
                {machine.runtime_hours}h
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Operator */}
        <div className="panel" style={{ padding: "0.85rem" }}>
          <div className="panel-header" style={{ marginBottom: "0.5rem" }}>
            <span className="panel-title">Assigned Operator</span>
            <span style={{ fontSize: "0.72rem", color: "#10b981" }}>CERTIFIED</span>
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            {machine.current_worker ? machine.current_worker.name : "Devika Nair (Lead Technician)"}
          </div>
          <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
            Shift 1 • Experience: 4.5 yrs • Skill Level: 4/5
          </div>
        </div>

        {/* Compatible Alternative Candidate Machines (Cross-Lane Intelligence) */}
        <div className="panel" style={{ padding: "0.85rem" }}>
          <div className="panel-header" style={{ marginBottom: "0.5rem" }}>
            <span className="panel-title">Compatible Alternatives</span>
            <span style={{ fontSize: "0.72rem", color: "#38bdf8" }}>ML Evaluated</span>
          </div>

          {loadingCandidates ? (
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Evaluating candidate suitability...</div>
          ) : candidates.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {candidates.map((c) => (
                <div
                  key={c.machine_id}
                  style={{
                    background: "#0d1527",
                    border: "1px solid #1e2e4a",
                    padding: "0.6rem",
                    borderRadius: "4px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#38bdf8" }}>
                      {c.machine_id} ({c.lane_id})
                    </span>
                    <span style={{ fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 700, color: "#34d399" }}>
                      Score: {c.suitability_score}%
                    </span>
                  </div>

                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                    Pred. Time: <strong style={{ color: "#e2e8f0" }}>{c.predicted_processing_time}m</strong> • 
                    Setup: {c.setup_time_min}m • 
                    Cost: ₹{c.production_cost}
                  </div>

                  {c.reasons && (
                    <div style={{ marginTop: "0.35rem", fontSize: "0.68rem", color: "#64748b" }}>
                      {c.reasons[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              No alternative machines configured for this process.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
