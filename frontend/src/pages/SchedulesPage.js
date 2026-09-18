import React, { useState, useEffect } from "react";
import api from "../services/api";
import GanttChart from "../components/GanttChart";

export default function SchedulesPage({ user }) {
  const [scheduleData, setScheduleData] = useState(null);
  const [baselines, setBaselines] = useState(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reoptimizing, setReoptimizing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [schedRes, baseRes, machRes] = await Promise.all([
        api.get("/schedules/current"),
        api.get("/schedules/baselines"),
        api.get("/machines")
      ]);
      setScheduleData(schedRes.data);
      setBaselines(baseRes.data);
      setMachines(machRes.data.machines || []);
    } catch (err) {
      console.error("Error loading schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReoptimize = async () => {
    try {
      setReoptimizing(true);
      await api.post("/schedules/reoptimize");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Re-optimization failed.");
    } finally {
      setReoptimizing(false);
    }
  };

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Production Schedules & Algorithm Benchmarking
          </h1>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", fontFamily: "monospace", marginTop: "0.2rem" }}>
            Real-time Gantt tracking and heuristic comparison (FCFS, SPT, EDD, WSPT vs Adaptive CP-SAT)
          </p>
        </div>

        {user?.role === "MANAGER" && (
          <button
            className="btn btn-primary"
            onClick={handleReoptimize}
            disabled={reoptimizing}
          >
            {reoptimizing ? "Solving CP-SAT..." : "Re-Optimize Schedule"}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading timeline schedule...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Gantt Timeline */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Production Floor Timeline Gantt</span>
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", fontFamily: "monospace" }}>
                <span style={{ color: "#10b981" }}>■ COMPLETED</span>
                <span style={{ color: "#06b6d4" }}>■ RUNNING</span>
                <span style={{ color: "#14b8a6" }}>■ REASSIGNED</span>
                <span style={{ color: "#3b82f6" }}>■ QUEUED</span>
                <span style={{ color: "#ef4444" }}>■ BLOCKED</span>
              </div>
            </div>

            <GanttChart
              operations={scheduleData?.operations || []}
              machines={machines}
            />
          </div>

          {/* Baseline Algorithms Benchmark Table */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Scheduling Heuristics vs Adaptive ML + CP-SAT</span>
              <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
                LABELED: SYNTHETIC BENCHMARK DEMONSTRATION DATA
              </span>
            </div>

            <table className="tech-table">
              <thead>
                <tr>
                  <th>Algorithm Strategy</th>
                  <th>Makespan (Hours)</th>
                  <th>Total Tardiness</th>
                  <th>Late Orders</th>
                  <th>Est. Production Cost</th>
                  <th>Avg Utilization</th>
                </tr>
              </thead>
              <tbody>
                {baselines && Object.entries(baselines).map(([key, data]) => {
                  const isAdaptive = key === "ADAPTIVE_CP_SAT";
                  return (
                    <tr
                      key={key}
                      style={{
                        background: isAdaptive ? "rgba(16, 185, 129, 0.08)" : "transparent",
                        fontWeight: isAdaptive ? 700 : 400
                      }}
                    >
                      <td style={{ color: isAdaptive ? "#34d399" : "#f8fafc" }}>
                        {data.algorithm}
                        {isAdaptive && <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", color: "#38bdf8" }}>★ PROPOSED</span>}
                      </td>
                      <td style={{ fontFamily: "monospace" }}>{data.makespan_hours}h</td>
                      <td style={{ fontFamily: "monospace", color: data.total_tardiness_minutes > 50 ? "#f87171" : "#e2e8f0" }}>
                        {data.total_tardiness_minutes}m
                      </td>
                      <td style={{ fontFamily: "monospace" }}>{data.late_orders}</td>
                      <td style={{ fontFamily: "monospace" }}>₹{data.total_cost?.toLocaleString()}</td>
                      <td style={{ fontFamily: "monospace", color: "#38bdf8" }}>{data.utilization_pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
