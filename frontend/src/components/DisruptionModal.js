import React, { useState } from "react";
import api from "../services/api";

export default function DisruptionModal({ machines = [], lanes = [], defaultMachineId = "M04", onClose, onSuccess }) {
  const [selectedMachineId, setSelectedMachineId] = useState(defaultMachineId);
  const [failureType, setFailureType] = useState("Mechanical Spindle Breakdown");
  const [durationHours, setDurationHours] = useState(6.0);
  const [loading, setLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0); // 0 to 8
  const [resultData, setResultData] = useState(null);

  const steps = [
    "Machine Failure",
    "Impact Analysis",
    "Affected Orders",
    "Candidate Discovery",
    "ML Prediction",
    "Constraint Check",
    "OR-Tools CP-SAT",
    "Live Factory Update"
  ];

  const handleSimulate = async () => {
    try {
      setLoading(true);
      setPipelineStep(1);

      // Simulate sequential step progression
      const stepInterval = setInterval(() => {
        setPipelineStep((prev) => {
          if (prev < 7) return prev + 1;
          clearInterval(stepInterval);
          return 7;
        });
      }, 400);

      const res = await api.post("/disruptions/simulate", {
        machine_id: selectedMachineId,
        failure_type: failureType,
        duration_hours: durationHours
      });

      clearInterval(stepInterval);
      setPipelineStep(8);
      setResultData(res.data);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to simulate disruption. Ensure backend is active.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "760px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#f8fafc" }}>
              Simulate Disruption & Autonomous Recovery
            </div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
              Trigger real-time machine failure, ML candidate ranking, and OR-Tools CP-SAT rescheduling
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Configuration Form */}
          {!resultData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "monospace", color: "#94a3b8", marginBottom: "0.4rem" }}>
                    TARGET MACHINE
                  </label>
                  <select
                    value={selectedMachineId}
                    onChange={(e) => setSelectedMachineId(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", background: "#0b1220", border: "1px solid #243452", color: "#f8fafc", borderRadius: "4px" }}
                  >
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id} - {m.name} ({m.lane_id} • {m.process_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "monospace", color: "#94a3b8", marginBottom: "0.4rem" }}>
                    FAILURE TYPE
                  </label>
                  <select
                    value={failureType}
                    onChange={(e) => setFailureType(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", background: "#0b1220", border: "1px solid #243452", color: "#f8fafc", borderRadius: "4px" }}
                  >
                    <option value="Mechanical Spindle Breakdown">Mechanical Spindle Breakdown</option>
                    <option value="Thermal Overheating Alert">Thermal Overheating Alert</option>
                    <option value="Hydraulic Pump Leak">Hydraulic Pump Leak</option>
                    <option value="Axis Servo Controller Fault">Axis Servo Controller Fault</option>
                    <option value="Tool Gripper Jam">Tool Gripper Jam</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "monospace", color: "#94a3b8", marginBottom: "0.4rem" }}>
                  FAILURE DURATION (HOURS): {durationHours}h
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

              <div style={{ marginTop: "0.5rem" }}>
                <button
                  className="btn btn-danger"
                  style={{ width: "100%", padding: "0.65rem" }}
                  onClick={handleSimulate}
                  disabled={loading}
                >
                  {loading ? "Executing 8-Step Disruption Pipeline..." : "SIMULATE FAILURE & RUN ADAPTIVE RECOVERY"}
                </button>
              </div>
            </div>
          )}

          {/* Pipeline Step Breadcrumb */}
          {loading && (
            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ fontSize: "0.8rem", color: "#38bdf8", fontFamily: "monospace", textAlign: "center", marginBottom: "0.75rem" }}>
                PIPELINE IN PROGRESS: STEP {pipelineStep}/8 ({steps[pipelineStep - 1] || "Initializing"})
              </div>
              <div className="pipeline-steps-container">
                {steps.map((step, idx) => {
                  const stepNum = idx + 1;
                  const isDone = stepNum < pipelineStep;
                  const isActive = stepNum === pipelineStep;
                  return (
                    <div key={step} className="pipeline-step">
                      <div className={`step-circle ${isDone ? "done" : (isActive ? "active" : "")}`}>
                        {isDone ? "✓" : stepNum}
                      </div>
                      <div className="step-label">{step.split(" ")[0]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results Display */}
          {resultData && (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "0.75rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "4px" }}>
                <div style={{ fontWeight: 700, color: "#34d399", fontSize: "0.9rem" }}>
                  Autonomous Recovery Completed Successfully
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                  Work Order <strong>{resultData.work_order?.work_order_number}</strong> created for Service Person.
                </div>
              </div>

              {/* Schedule Changes */}
              {resultData.optimization_result?.schedule_changes?.length > 0 && (
                <div className="panel" style={{ padding: "0.85rem" }}>
                  <div className="panel-header" style={{ marginBottom: "0.5rem" }}>
                    <span className="panel-title">Dynamic Machine Substitution</span>
                    <span style={{ fontSize: "0.75rem", color: "#34d399" }}>CP-SAT OPTIMAL</span>
                  </div>
                  <table className="tech-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Process</th>
                        <th>Previous</th>
                        <th>Selected Substitute</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultData.optimization_result.schedule_changes.map((chg, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#38bdf8" }}>{chg.order_id}</td>
                          <td>{chg.process_name}</td>
                          <td style={{ color: "#f87171" }}>{chg.previous_machine}</td>
                          <td style={{ color: "#34d399", fontWeight: 700 }}>{chg.new_machine}</td>
                          <td>{chg.scheduled_start}m</td>
                          <td>{chg.scheduled_end}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Optimization Reasoning */}
              {resultData.optimization_result?.optimization_reasoning && (
                <div className="panel" style={{ padding: "0.85rem" }}>
                  <div className="panel-title" style={{ marginBottom: "0.5rem" }}>Decision Reasoning Log</div>
                  <ul style={{ paddingLeft: "1.2rem", fontSize: "0.78rem", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {resultData.optimization_result.optimization_reasoning.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {resultData ? (
            <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
