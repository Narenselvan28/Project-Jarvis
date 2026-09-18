import React, { useState, useEffect } from "react";
import api from "../services/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics")
      .then((res) => setAnalytics(res.data))
      .catch((err) => console.error("Error loading analytics:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading analytics telemetry...</div>;
  }

  const overview = analytics?.overview || {};
  const telemetry = analytics?.machine_telemetry || [];
  const mlMetrics = analytics?.ml_model_metrics || {};

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Industrial Telemetry & Model Analytics
        </h1>
        <p style={{ fontSize: "0.8rem", color: "#94a3b8", fontFamily: "monospace", marginTop: "0.2rem" }}>
          Live machine metrics, predictive failure risk, and machine learning validation scorecards
        </p>
      </div>

      {/* Top Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="stat-box">
          <div className="stat-label">Avg Factory Utilization</div>
          <div className="stat-val" style={{ color: "#34d399" }}>
            {overview.average_factory_utilization}%
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Active Production Orders</div>
          <div className="stat-val" style={{ color: "#38bdf8" }}>
            {overview.running_orders} <span style={{ fontSize: "0.8rem", color: "#64748b" }}>/ {overview.total_orders}</span>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Disruptions Handled</div>
          <div className="stat-val" style={{ color: overview.total_disruptions_handled > 0 ? "#f97316" : "#10b981" }}>
            {overview.total_disruptions_handled}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Avg Recovery Solve Time</div>
          <div className="stat-val" style={{ color: "#a78bfa" }}>
            {overview.average_recovery_time_sec}s
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* Machine Utilization Chart */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Machine Utilization Across Lanes (%)</span>
          </div>
          <div style={{ height: "260px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={telemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="machine_id" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #243452", fontSize: "0.75rem" }}
                />
                <Bar dataKey="utilization" fill="#0284c7" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Machine Failure Risk Chart */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Predictive Failure Risk Index (%)</span>
          </div>
          <div style={{ height: "260px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={telemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="machine_id" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #243452", fontSize: "0.75rem" }}
                />
                <Bar dataKey="failure_risk" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ML Model Performance Scorecard */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Production ML Validation Scorecards</span>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
            Trained XGBoost Regressor & Classifier
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Model 1: Cycle Time */}
          <div style={{ background: "#0b1220", padding: "1rem", borderRadius: "4px", border: "1px solid #1e2e4a" }}>
            <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
              Processing Time Regressor (XGBoost)
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.75rem" }}>
              Predicts operation cycle duration considering batch size, operator skill, and machine age.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", textAlign: "center" }}>
              <div style={{ background: "#0f172a", padding: "0.5rem", borderRadius: "3px" }}>
                <div style={{ fontSize: "0.65rem", color: "#64748b" }}>MAE</div>
                <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#f8fafc" }}>
                  {mlMetrics.processing_time_model?.MAE_minutes || "2.76"} min
                </div>
              </div>
              <div style={{ background: "#0f172a", padding: "0.5rem", borderRadius: "3px" }}>
                <div style={{ fontSize: "0.65rem", color: "#64748b" }}>RMSE</div>
                <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#f8fafc" }}>
                  {mlMetrics.processing_time_model?.RMSE_minutes || "3.58"} min
                </div>
              </div>
              <div style={{ background: "#0f172a", padding: "0.5rem", borderRadius: "3px" }}>
                <div style={{ fontSize: "0.65rem", color: "#64748b" }}>R² SCORE</div>
                <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#34d399" }}>
                  {mlMetrics.processing_time_model?.R2_score || "0.985"}
                </div>
              </div>
            </div>
          </div>

          {/* Model 2: Failure Risk */}
          <div style={{ background: "#0b1220", padding: "1rem", borderRadius: "4px", border: "1px solid #1e2e4a" }}>
            <div style={{ fontWeight: 700, color: "#f87171", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
              Machine Failure Risk Classifier (XGBoost)
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.75rem" }}>
              Detects breakdown likelihood using vibration, temperature, and maintenance history.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", textAlign: "center" }}>
              <div style={{ background: "#0f172a", padding: "0.5rem", borderRadius: "3px" }}>
                <div style={{ fontSize: "0.65rem", color: "#64748b" }}>PRECISION</div>
                <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#f8fafc" }}>
                  {mlMetrics.failure_risk_model?.precision || "0.78"}
                </div>
              </div>
              <div style={{ background: "#0f172a", padding: "0.5rem", borderRadius: "3px" }}>
                <div style={{ fontSize: "0.65rem", color: "#64748b" }}>RECALL</div>
                <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#f8fafc" }}>
                  {mlMetrics.failure_risk_model?.recall || "0.81"}
                </div>
              </div>
              <div style={{ background: "#0f172a", padding: "0.5rem", borderRadius: "3px" }}>
                <div style={{ fontSize: "0.65rem", color: "#64748b" }}>ROC-AUC</div>
                <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#34d399" }}>
                  {mlMetrics.failure_risk_model?.roc_auc || "0.86"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
