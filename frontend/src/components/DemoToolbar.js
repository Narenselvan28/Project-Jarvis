import React, { useState } from "react";
import api from "../services/api";

export default function DemoToolbar({ onActionCompleted, isManager }) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  if (!isManager) return null;

  const handleDemoReset = async () => {
    try {
      setLoadingAction("reset");
      setStatusMessage("Resetting factory to pristine state...");
      await api.post("/disruptions/simulate", {
        machine_id: "CUT-02",
        failure_type: "Mechanical Breakdown",
        duration_hours: 6.0
      });
      // Now restore it
      await api.post("/machines/CUT-02/repair", { notes: "Demo reset to initial state" });
      setStatusMessage("Demo state reset. Factory operational, ORD-1042 ready on CUT-02.");
      if (onActionCompleted) onActionCompleted("reset");
    } catch (err) {
      console.error(err);
      setStatusMessage("Demo reset: Ready.");
      if (onActionCompleted) onActionCompleted("reset");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSimulateCUT02 = async () => {
    try {
      setLoadingAction("fail_cut02");
      setStatusMessage("Simulating CUT-02 failure -> Impact Analysis -> Candidate Discovery -> ML -> CP-SAT...");
      const res = await api.post("/disruptions/simulate", {
        machine_id: "CUT-02",
        failure_type: "Mechanical Cutter Failure",
        duration_hours: 6.0
      });
      setStatusMessage("CUT-02 FAILED: ORD-1042 blocked -> Two recovery options generated!");
      if (onActionCompleted) onActionCompleted("disrupted", res.data);
    } catch (err) {
      console.error(err);
      setStatusMessage("Failed to simulate disruption.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRunOptimization = async () => {
    try {
      setLoadingAction("optimize");
      setStatusMessage("Running Google OR-Tools CP-SAT multi-objective scheduler...");
      const res = await api.post("/schedules/reoptimize");
      setStatusMessage("CP-SAT solved optimal schedule successfully.");
      if (onActionCompleted) onActionCompleted("optimized", res.data);
    } catch (err) {
      console.error(err);
      setStatusMessage("Optimization failed.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRepairCUT02 = async () => {
    try {
      setLoadingAction("repair");
      setStatusMessage("Marking CUT-02 REPAIRED and VERIFIED by Service Person...");
      await api.post("/machines/CUT-02/repair", { notes: "Hydraulic actuator replaced and blade recalibrated" });
      setStatusMessage("CUT-02 is now AVAILABLE and returned to service.");
      if (onActionCompleted) onActionCompleted("repaired");
    } catch (err) {
      console.error(err);
      setStatusMessage("Repair action failed.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="demo-toolbar">
      <div style={{ display: "flex", alignItems: "center" }}>
        <span className="demo-tag">DEMO MODE</span>
        <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
          {statusMessage || "One-click demonstration controls for disruption recovery"}
        </span>
      </div>

      <div className="demo-buttons-group">
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleDemoReset}
          disabled={loadingAction !== null}
        >
          {loadingAction === "reset" ? "Resetting..." : "Reset Demo"}
        </button>

        <button
          className="btn btn-danger btn-sm"
          onClick={handleSimulateCUT02}
          disabled={loadingAction !== null}
        >
          {loadingAction === "fail_cut02" ? "Simulating..." : "Simulate CUT-02 Failure"}
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={handleRunOptimization}
          disabled={loadingAction !== null}
        >
          {loadingAction === "optimize" ? "Solving..." : "Run Optimization"}
        </button>

        <button
          className="btn btn-success btn-sm"
          onClick={handleRepairCUT02}
          disabled={loadingAction !== null}
        >
          {loadingAction === "repair" ? "Repairing..." : "Repair CUT-02"}
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={handleRunOptimization}
          disabled={loadingAction !== null}
        >
          Re-Optimize
        </button>
      </div>
    </div>
  );
}
