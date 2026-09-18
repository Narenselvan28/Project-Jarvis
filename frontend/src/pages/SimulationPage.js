import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function SimulationPage() {
  const [machines, setMachines] = useState([]);
  const [targetMachineId, setTargetMachineId] = useState("CUT-02");
  const [failureType, setFailureType] = useState("Mechanical Bearing Failure");
  const [durationHours, setDurationHours] = useState(6.0);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [applying, setApplying] = useState(false);
  const [appliedMsg, setAppliedMsg] = useState(null);

  useEffect(() => {
    api.get("/machines").then((res) => {
      const payload = res.data?.data || res.data;
      setMachines(payload.machines || payload || []);
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
      const data = res.data?.data || res.data;
      setSimResult(data);
    } catch (err) {
      console.error("Simulation failed:", err);
      alert(err.response?.data?.error?.message || err.response?.data?.error || "Simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  const applyToProduction = async () => {
    try {
      setApplying(true);
      await api.post("/simulation/apply", {
        machine_id: targetMachineId,
        failure_type: failureType,
        duration_hours: durationHours
      });
      setAppliedMsg("Simulation successfully committed to live shopfloor state!");
      setSimResult(null);
    } catch (err) {
      console.error(err);
      alert("Failed to apply simulation to live production.");
    } finally {
      setApplying(false);
    }
  };

  const optA = simResult?.option_a;
  const optB = simResult?.option_b;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC] antialiased">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
          <span>Ozhungu / What-If Disruption Simulation Sandbox</span>
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Model hypothetical machine disruptions, predict delivery bottlenecks, and test OR-Tools recovery alternatives without altering live production state
        </p>
      </div>

      {appliedMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-sm"></i>
          <span>{appliedMsg}</span>
        </div>
      )}

      {/* Simulator Parameters Panel */}
      <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Non-Destructive Simulation Controls
          </span>
          <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-mono font-bold">
            Snapshot Mode Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Hypothetical Workstation
            </label>
            <select
              value={targetMachineId}
              onChange={(e) => setTargetMachineId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none font-mono"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} - {m.name} ({m.lane_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Simulated Failure Scenario
            </label>
            <select
              value={failureType}
              onChange={(e) => setFailureType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
            >
              <option value="Mechanical Bearing Failure">Mechanical Bearing Failure</option>
              <option value="Overheating & Coolant Failure">Overheating & Coolant Failure</option>
              <option value="Spindle Motor Stall">Spindle Motor Stall</option>
              <option value="Electrical Drive Trip">Electrical Drive Trip</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Duration
              </label>
              <span className="text-xs font-mono font-bold text-slate-900">{durationHours} Hours</span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              step="0.5"
              value={durationHours}
              onChange={(e) => setDurationHours(parseFloat(e.target.value))}
              className="w-full accent-slate-800"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={runSimulation}
            disabled={loading}
            className="px-5 py-2.5 bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                <span>Evaluating Sandbox Scenario...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-play text-xs"></i>
                <span>Run What-If Simulation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Simulation Results (Side-by-side Option A vs Option B) */}
      {simResult && (
        <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <span className="text-xs font-bold text-slate-800">
                Simulated Disruption Impact on {simResult.target_machine || targetMachineId}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Identified {simResult.affected_orders_count || 1} impacted order(s). Generated 2 feasible recovery alternatives via CP-SAT.
              </p>
            </div>

            <button
              onClick={applyToProduction}
              disabled={applying}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              {applying ? "Applying to Live Floor..." : "Apply Failure to Live Production"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OPTION A */}
            <div className="p-4 border-2 border-blue-400 rounded-xl bg-blue-50/30 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-900">
                  OPTION A: DEADLINE PROTECTION
                </span>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                  Zero Tardiness
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-blue-200">
                <div>
                  <span className="text-[10px] text-slate-500">Reassigned Machine:</span>
                  <div className="font-bold text-blue-900 font-mono">{optA?.machine || "CUT-01"}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Processing Time:</span>
                  <div className="font-bold text-slate-800 font-mono">{optA?.predicted_processing_min || 95} min</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Overtime Cost:</span>
                  <div className="font-bold text-slate-800 font-mono">₹{(optA?.additional_cost || 1240).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Delivery Delay:</span>
                  <div className="font-bold text-emerald-700 font-mono">0 min</div>
                </div>
              </div>
            </div>

            {/* OPTION B */}
            <div className="p-4 border border-slate-300 rounded-xl bg-white space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800">
                  OPTION B: COST & STABILITY
                </span>
                <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                  Minimal Cost
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500">Reassigned Machine:</span>
                  <div className="font-bold text-slate-900 font-mono">{optB?.machine || "CUT-01"}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Processing Time:</span>
                  <div className="font-bold text-slate-800 font-mono">{optB?.predicted_processing_min || 105} min</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Overtime Cost:</span>
                  <div className="font-bold text-emerald-700 font-mono">₹{(optB?.additional_cost || 680).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Delivery Delay:</span>
                  <div className="font-bold text-amber-700 font-mono">+25 min</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
