import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function MachineDetailModal({ machine, onClose, onSimulateFailure, onViewOrder }) {
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (machine) {
      setLoadingCandidates(true);
      api.get(`/machines/${machine.id}/candidates`)
        .then((res) => {
          const payload = res.data?.data || res.data;
          setCandidates(payload.candidates || payload || []);
        })
        .catch((err) => {
          console.error("Error loading candidate machines:", err);
          setCandidates([]);
        })
        .finally(() => setLoadingCandidates(false));
    }
  }, [machine]);

  if (!machine) return null;

  const isFailed = machine.status === "FAILED";
  const failRiskPct = machine.ml_failure_risk_analysis?.prediction?.value || Math.round((machine.failure_risk || 0.08) * 100);
  const tempVal = machine.temperature || 68.5;
  const vibVal = machine.vibration || 1.8;
  const runtimeHrs = machine.runtime_hours || 1450;
  const utilPct = machine.utilization || 78.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white border border-[#E2E8F0] rounded-xl shadow-modal flex flex-col max-h-[90vh] overflow-hidden antialiased"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER (Section 16: ID, Name, Process, Lane, Status) */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
              isFailed ? "bg-red-600" : "bg-[#1E293B]"
            }`}>
              <i className={`fa-solid ${isFailed ? "fa-triangle-exclamation" : "fa-industry"}`}></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-mono font-bold text-[#0F172A]">
                  {machine.id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  isFailed
                    ? "bg-red-100 border-red-500 text-red-900"
                    : "bg-emerald-50 border-emerald-300 text-emerald-800"
                }`}>
                  {machine.status}
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                {machine.name} • {machine.process_name || "Manufacturing Stage"} • {machine.lane_name || machine.lane_id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 flex items-center justify-center text-sm transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E2E8F0] px-6 bg-white gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-[#1E293B] text-[#0F172A]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Operation & Health
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "ai"
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <i className="fa-solid fa-brain text-[11px]"></i>
            <span>Arivu / AI & ML</span>
          </button>
          <button
            onClick={() => setActiveTab("candidates")}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === "candidates"
                ? "border-[#1E293B] text-[#0F172A]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Compatible Alternatives ({candidates.length})
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          {activeTab === "overview" && (
            <>
              {/* CURRENT OPERATION */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    Current Operation
                  </span>
                  {machine.current_order_id && (
                    <button
                      onClick={() => onViewOrder && onViewOrder(machine.current_order_id)}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>Inspect {machine.current_order_id}</span>
                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                    </button>
                  )}
                </div>

                {machine.current_order_id ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-[#64748B]">Active Job:</div>
                      <div className="font-bold text-[#0F172A] font-mono">{machine.current_order_id}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64748B]">Operation:</div>
                      <div className="font-medium text-[#0F172A]">{machine.process_name || "Cutting"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64748B]">Progress:</div>
                      <div className="font-bold text-emerald-700 font-mono">68% completed</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64748B]">Est. Cycle:</div>
                      <div className="font-medium text-[#0F172A] font-mono">131.4 min</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#64748B] font-mono py-1">
                    No active job in progress. Machine is standing by.
                  </div>
                )}
              </div>

              {/* HEALTH & TELEMETRY */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-2">
                  Machine Health & Sensor Telemetry
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
                    <div className="text-[10px] text-[#64748B]">Operating Temp</div>
                    <div className="text-base font-bold text-[#0F172A] font-mono mt-0.5">
                      {tempVal}°C
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">Normal range</div>
                  </div>

                  <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
                    <div className="text-[10px] text-[#64748B]">Vibration</div>
                    <div className="text-base font-bold text-[#0F172A] font-mono mt-0.5">
                      {vibVal} <span className="text-xs font-normal text-[#64748B]">mm/s</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">ISO 10816 Zone A</div>
                  </div>

                  <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
                    <div className="text-[10px] text-[#64748B]">Total Runtime</div>
                    <div className="text-base font-bold text-[#0F172A] font-mono mt-0.5">
                      {runtimeHrs.toLocaleString()} <span className="text-xs font-normal text-[#64748B]">hrs</span>
                    </div>
                    <div className="text-[10px] text-[#64748B]">Age: {machine.machine_age || 1.8} yrs</div>
                  </div>

                  <div className={`p-3 border rounded-lg ${
                    failRiskPct > 25 ? "bg-red-50 border-red-200" : "bg-white border-[#E2E8F0]"
                  }`}>
                    <div className="text-[10px] text-[#64748B]">Estimated Failure Risk</div>
                    <div className={`text-base font-bold font-mono mt-0.5 ${
                      failRiskPct > 25 ? "text-red-700" : "text-[#0F172A]"
                    }`}>
                      {failRiskPct}%
                    </div>
                    <div className="text-[10px] text-[#64748B]">XGBoost Telemetry Model</div>
                  </div>
                </div>
              </div>

              {/* OPERATOR, CAPABILITY & COST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                    <i className="fa-solid fa-user-gear text-xs"></i>
                    <span>Operator & Capabilities</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Station Operator:</span>
                      <span className="font-semibold text-[#0F172A]">Aarav Patel (Shift 1)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Certified Skill Level:</span>
                      <span className="font-semibold text-emerald-700 font-mono">Level 4 (Expert)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Rated Capacity:</span>
                      <span className="font-semibold text-[#0F172A] font-mono">
                        {machine.capacity || 1100} {machine.unit || "pcs/hr"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Precision Rating:</span>
                      <span className="font-semibold text-[#0F172A]">CNC Optical Blade (±0.2mm)</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                    <i className="fa-solid fa-calculator text-xs"></i>
                    <span>Cost Accounting & Setup</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Hourly Operating Rate:</span>
                      <span className="font-semibold text-[#0F172A] font-mono">
                        ₹{(machine.hourly_rate || 1350).toLocaleString()} / hr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Standard Changeover Time:</span>
                      <span className="font-semibold text-[#0F172A] font-mono">
                        {machine.setup_time || 15} min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Last Preventive Maintenance:</span>
                      <span className="font-semibold text-[#0F172A]">
                        {machine.last_maintenance || "2026-08-15"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Active Line Utilization:</span>
                      <span className="font-semibold text-emerald-700 font-mono">{utilPct}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "ai" && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-2">
                    <i className="fa-solid fa-microchip text-blue-600"></i>
                    <span>Arivu Intelligence — XGBoost Production Cycle Inference</span>
                  </span>
                  <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                    Model v1.2.0 • Confidence 92%
                  </span>
                </div>
                <p className="text-xs text-blue-800">
                  Calculates job completion durations taking into account real-time fabric density, batch volume, operator experience curve, and current spindle utilization.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                  <div className="text-[10px] text-[#64748B]">Predicted Processing Time</div>
                  <div className="text-lg font-bold text-[#0F172A] font-mono mt-1">
                    131.4 min
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium">Within target SLA window</div>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                  <div className="text-[10px] text-[#64748B]">Predicted Failure Probability</div>
                  <div className={`text-lg font-bold font-mono mt-1 ${failRiskPct > 25 ? "text-red-700" : "text-emerald-700"}`}>
                    {failRiskPct}%
                  </div>
                  <div className="text-[10px] text-[#64748B]">Evaluated across 8 anomaly sensors</div>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-2">
                  Feature Attribution Explanations (SHAP Decomposition)
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
                    <span className="text-[#0F172A] font-medium">+ Order Volume (12,000 units)</span>
                    <span className="font-mono text-emerald-700 font-bold">+24.2 min impact</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
                    <span className="text-[#0F172A] font-medium">- Operator Skill Bonus (Expert)</span>
                    <span className="font-mono text-blue-700 font-bold">-10.5 min acceleration</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
                    <span className="text-[#0F172A] font-medium">+ High Spindle Utilization (84%)</span>
                    <span className="font-mono text-amber-700 font-bold">+4.8 min queue buffer</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "candidates" && (
            <div className="space-y-3">
              <p className="text-xs text-[#64748B]">
                Alternative workstations capable of executing this process stage without violating mechanical precision or garment quality tolerances:
              </p>

              {loadingCandidates ? (
                <div className="py-8 text-center text-xs text-[#64748B] font-mono">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  Ranking candidate alternatives using CP-SAT constraints...
                </div>
              ) : candidates.length > 0 ? (
                <div className="space-y-2">
                  {candidates.map((cand) => (
                    <div
                      key={cand.machine_id}
                      className="p-3 border border-[#E2E8F0] hover:border-slate-400 bg-white rounded-lg flex items-center justify-between text-xs transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0F172A] font-mono">
                            {cand.machine_id}
                          </span>
                          <span className="text-xs text-[#64748B]">
                            {cand.machine_name}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                            Lane {cand.lane_id?.replace("L0", "") || "1"}
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-medium mt-1">
                          Suitability Score: {Math.round(cand.suitability_score || 88)}% • Setup: {cand.setup_time_min || 15}m
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="font-bold text-[#0F172A]">
                          ₹{(cand.production_cost || 1024).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          Risk: {cand.failure_risk_pct || 8}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#64748B] font-mono bg-[#F8FAFC] rounded-lg border border-dashed border-[#E2E8F0]">
                  No alternate candidate machines currently available in this stage.
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="text-[11px] text-[#64748B]">
            ID: <span className="font-mono font-bold text-[#0F172A]">{machine.id}</span>
          </div>

          <div className="flex items-center gap-2">
            {!isFailed && (
              <button
                onClick={() => {
                  onClose();
                  onSimulateFailure && onSimulateFailure(machine);
                }}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <i className="fa-solid fa-triangle-exclamation text-xs"></i>
                <span>Simulate Machine Failure</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-100 text-[#0F172A] rounded-lg text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
