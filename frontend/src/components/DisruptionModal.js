import React, { useState } from "react";
import api from "../services/api";

export default function DisruptionModal({ machines = [], defaultMachineId = "CUT-02", onClose, onSuccess }) {
  const initialId = (defaultMachineId && defaultMachineId !== "M04") ? defaultMachineId : "CUT-02";
  const [selectedMachineId, setSelectedMachineId] = useState(initialId);
  const [failureType, setFailureType] = useState("MECHANICAL_FAILURE");
  const [durationHours, setDurationHours] = useState(6.0);
  const [loading, setLoading] = useState(false);
  const [disruptionRes, setDisruptionRes] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);

  const fallbackList = [
    { id: "CUT-02", name: "Lectra Cutter 02", lane_id: "L02", process_id: "P03" },
    { id: "CUT-01", name: "Gerber Cutter 01", lane_id: "L01", process_id: "P03" },
    { id: "SP-01", name: "Auto Spreader 01", lane_id: "L01", process_id: "P02" },
    { id: "BND-01", name: "Auto Bundler 01", lane_id: "L01", process_id: "P04" },
    { id: "SH-01", name: "Shoulder Overlock 01", lane_id: "L01", process_id: "P05" }
  ];
  const machineList = machines && machines.length > 0 ? machines : fallbackList;

  const handleSimulate = async () => {
    try {
      setLoading(true);
      setActionStatus(null);
      const res = await api.post("/admin/disruptions", {
        machine_id: selectedMachineId,
        failure_type: failureType,
        duration_hours: durationHours
      });
      setDisruptionRes(res.data);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to trigger machine disruption");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOption = async (optionKey) => {
    if (!disruptionRes) return;
    try {
      setLoading(true);
      const res = await api.post(`/recommendations/${disruptionRes.disruption_id}/approve`, {
        option: optionKey
      });
      setActionStatus({ type: "APPROVED", message: `APPROVED ${optionKey}! Production schedule and Order Gantt updated.` });
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      alert("Failed to approve recovery option");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectBoth = async () => {
    if (!disruptionRes) return;
    try {
      setLoading(true);
      const res = await api.post(`/recommendations/${disruptionRes.disruption_id}/reject`, {
        reason: "Manager rejected both recovery options"
      });
      setActionStatus({ type: "REJECTED", message: "REJECTED BOTH OPTIONS. Machine remains failed and order remains blocked." });
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      alert("Failed to reject recovery options");
    } finally {
      setLoading(false);
    }
  };

  const optA = disruptionRes?.option_a;
  const optB = disruptionRes?.option_b;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(15, 23, 42, 0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999,
      padding: "1rem"
    }}>
      <div style={{
        background: "#ffffff",
        width: "820px",
        maxWidth: "96vw",
        borderRadius: "8px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        border: "1px solid #cbd5e1",
        overflow: "hidden"
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "1.25rem 1.5rem",
          background: "#0f172a",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: "700", letterSpacing: "0.03em" }}>
              DISRUPTION SIMULATOR &amp; AI RECOVERY (INTELLIGENCE LOOP 2)
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.15rem" }}>
              Machine Failure &rarr; ML Prediction &rarr; OR-Tools CP-SAT &rarr; Human Approval
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.5rem", cursor: "pointer" }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: "1.5rem", maxHeight: "80vh", overflowY: "auto" }}>
          {/* Step 1: Disruption Trigger Form */}
          {!disruptionRes && (
            <div>
              <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "#475569" }}>
                Introduce an unexpected machine failure to simulate shopfloor disruption recovery:
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.3rem" }}>
                    TARGET MACHINE:
                  </label>
                  <select
                    value={selectedMachineId}
                    onChange={(e) => setSelectedMachineId(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontFamily: "monospace", fontSize: "0.9rem" }}
                  >
                    {machineList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id} - {m.name} ({m.lane_id} &bull; {m.process_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.3rem" }}>
                    FAILURE TYPE:
                  </label>
                  <select
                    value={failureType}
                    onChange={(e) => setFailureType(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  >
                    <option value="MECHANICAL_FAILURE">Mechanical Failure (Blade / Servo breakdown)</option>
                    <option value="ELECTRICAL_FAULT">Electrical Fault (Controller overload)</option>
                    <option value="PNEUMATIC_PRESSURE_LOSS">Pneumatic Pressure Loss</option>
                    <option value="CALIBRATION_DRIFT">Sensor Calibration Drift</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.3rem" }}>
                    EXPECTED DOWNTIME DURATION (HOURS):
                  </label>
                  <input
                    type="number"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    min="1"
                    max="48"
                    step="0.5"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    onClick={handleSimulate}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "0.6rem 1rem",
                      background: "#b91c1c",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      fontWeight: "700",
                      fontSize: "0.9rem",
                      cursor: loading ? "wait" : "pointer"
                    }}
                  >
                    {loading ? "RUNNING ML & OR-TOOLS..." : "TRIGGER MACHINE FAILURE"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Status Confirmation */}
          {actionStatus && (
            <div style={{
              padding: "1rem 1.25rem",
              background: actionStatus.type === "APPROVED" ? "#f0fdf4" : "#fef2f2",
              border: "1px solid",
              borderColor: actionStatus.type === "APPROVED" ? "#bbf7d0" : "#fecaca",
              color: actionStatus.type === "APPROVED" ? "#166534" : "#991b1b",
              borderRadius: "6px",
              marginBottom: "1.5rem",
              fontWeight: "600",
              fontSize: "0.9rem"
            }}>
              {actionStatus.type === "APPROVED" ? "✓" : "✕"} {actionStatus.message}
            </div>
          )}

          {/* Step 2: TWO RECOVERY OPTIONS PRESENTATION */}
          {disruptionRes && (
            <div>
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                padding: "0.85rem 1.25rem",
                borderRadius: "6px",
                color: "#991b1b",
                marginBottom: "1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <strong>MACHINE FAILURE DETECTED:</strong> {disruptionRes.machine_id} &bull; {disruptionRes.failure_type}
                  <div style={{ fontSize: "0.8rem", color: "#b91c1c", marginTop: "0.2rem" }}>
                    Work Order {disruptionRes.work_order?.id} created for Service Person &bull; Affected Orders: {disruptionRes.affected_orders?.join(", ")}
                  </div>
                </div>
                <span style={{ fontFamily: "monospace", fontWeight: "700", fontSize: "0.8rem" }}>
                  DOWNTIME: {disruptionRes.duration_hours}h
                </span>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem", color: "#0f172a" }}>
                  AI / OR-Tools Generated 2 Feasible Recovery Options
                </h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                  The Manager must review and approve one option. No schedule is silently committed without human approval.
                </p>
              </div>

              {/* Side-by-Side Options Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
                {/* OPTION A CARD */}
                {optA && (
                  <div style={{
                    border: "2px solid #0284c7",
                    borderRadius: "8px",
                    padding: "1.25rem",
                    background: "#f0f9ff",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "#0369a1", letterSpacing: "0.03em" }}>
                          OPTION A &mdash; DEADLINE PROTECTION
                        </span>
                        <span style={{ fontSize: "0.7rem", fontWeight: "700", background: "#dcfce7", color: "#15803d", padding: "0.15rem 0.5rem", borderRadius: "3px" }}>
                          FASTEST
                        </span>
                      </div>

                      <div style={{ fontSize: "0.85rem", color: "#1e293b", lineHeight: "1.6" }}>
                        <div><strong>Target Machine:</strong> <span style={{ fontFamily: "monospace", color: "#0284c7", fontWeight: "700" }}>{optA.machine} ({optA.machine_name})</span></div>
                        <div><strong>Predicted Processing:</strong> {optA.predicted_processing_min} min</div>
                        <div><strong>Setup Time:</strong> {optA.setup_min} min</div>
                        <div><strong>Deadline Impact:</strong> <span style={{ color: "#16a34a", fontWeight: "700" }}>{optA.deadline_impact_min} min (ON TIME)</span></div>
                        <div><strong>Additional Cost:</strong> ₹{optA.additional_cost}</div>
                        <div><strong>Schedule Changes:</strong> {optA.schedule_changes}</div>
                        <div><strong>Operational Risk:</strong> {optA.risk}</div>
                      </div>

                      <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#475569", background: "#ffffff", padding: "0.6rem", borderRadius: "4px", border: "1px solid #e0f2fe" }}>
                        <strong>WHY:</strong> {optA.why}
                      </div>
                    </div>

                    <button
                      onClick={() => handleApproveOption("OPTION_A")}
                      disabled={loading || !!actionStatus}
                      style={{
                        marginTop: "1.25rem",
                        width: "100%",
                        padding: "0.65rem",
                        background: "#0284c7",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        fontWeight: "700",
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      APPROVE OPTION A
                    </button>
                  </div>
                )}

                {/* OPTION B CARD */}
                {optB && (
                  <div style={{
                    border: "2px solid #64748b",
                    borderRadius: "8px",
                    padding: "1.25rem",
                    background: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "#334155", letterSpacing: "0.03em" }}>
                          OPTION B &mdash; COST / STABILITY
                        </span>
                        <span style={{ fontSize: "0.7rem", fontWeight: "700", background: "#f1f5f9", color: "#475569", padding: "0.15rem 0.5rem", borderRadius: "3px" }}>
                          MIN COST
                        </span>
                      </div>

                      <div style={{ fontSize: "0.85rem", color: "#1e293b", lineHeight: "1.6" }}>
                        <div><strong>Target Machine:</strong> <span style={{ fontFamily: "monospace", color: "#334155", fontWeight: "700" }}>{optB.machine} ({optB.machine_name})</span></div>
                        <div><strong>Predicted Processing:</strong> {optB.predicted_processing_min} min</div>
                        <div><strong>Setup Time:</strong> {optB.setup_min} min</div>
                        <div><strong>Deadline Impact:</strong> +{optB.deadline_impact_min} min</div>
                        <div><strong>Additional Cost:</strong> <span style={{ color: "#16a34a", fontWeight: "700" }}>₹{optB.additional_cost}</span></div>
                        <div><strong>Schedule Changes:</strong> {optB.schedule_changes}</div>
                        <div><strong>Operational Risk:</strong> {optB.risk}</div>
                      </div>

                      <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#475569", background: "#ffffff", padding: "0.6rem", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                        <strong>WHY:</strong> {optB.why}
                      </div>
                    </div>

                    <button
                      onClick={() => handleApproveOption("OPTION_B")}
                      disabled={loading || !!actionStatus}
                      style={{
                        marginTop: "1.25rem",
                        width: "100%",
                        padding: "0.65rem",
                        background: "#334155",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        fontWeight: "700",
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      APPROVE OPTION B
                    </button>
                  </div>
                )}
              </div>

              {/* REJECT BOTH BUTTON */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={handleRejectBoth}
                  disabled={loading || !!actionStatus}
                  style={{
                    padding: "0.5rem 1.5rem",
                    background: "#ffffff",
                    color: "#b91c1c",
                    border: "1px solid #fecaca",
                    borderRadius: "4px",
                    fontWeight: "700",
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  REJECT BOTH OPTIONS
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: "1rem 1.5rem",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "flex-end"
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            {actionStatus ? "Done & View Schedule" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
