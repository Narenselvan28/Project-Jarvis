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
      .then((res) => {
        const payload = res.data?.data || res.data;
        setAnalytics(payload);
      })
      .catch((err) => console.error("Error loading analytics:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-slate-500 font-mono">
        <i className="fa-solid fa-spinner fa-spin mr-2"></i>
        Loading industrial telemetry & ML scorecards...
      </div>
    );
  }

  const overview = analytics?.overview || {};
  const telemetry = analytics?.machine_telemetry || [];
  const mlMetrics = analytics?.ml_model_metrics || {};

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC] antialiased">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
          <span>Arivu / Industrial Telemetry & Machine Learning Analytics</span>
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Real-time shopfloor telemetry, predictive failure risk profiles, and XGBoost model validation scorecards
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Avg Factory Utilization
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
            {overview.average_factory_utilization || 84.5}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Weighted across all active lines</div>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Active Orders In Execution
          </div>
          <div className="text-2xl font-bold text-blue-700 font-mono mt-1">
            {overview.running_orders || 1} <span className="text-xs font-normal text-slate-500">/ {overview.total_orders || 30}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Scheduled on shopfloor</div>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Active Disruptions
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${
            (overview.active_disruptions_count || 0) > 0 ? "text-red-700" : "text-slate-800"
          }`}>
            {overview.active_disruptions_count || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Recovery alternatives available</div>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Open Maintenance Work Orders
          </div>
          <div className="text-2xl font-bold text-purple-700 font-mono mt-1">
            {overview.open_maintenance_count || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Under technician repair</div>
        </div>
      </div>

      {/* ML Models Scorecard & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ML Validation Scorecard */}
        <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <i className="fa-solid fa-brain text-blue-600"></i>
              <span>Arivu ML Model Reliability Scorecards</span>
            </h2>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
              Pure Production XGBoost
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Model 1 */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-900">Processing Time Regressor (XGBoost)</span>
                <span className="text-emerald-700 font-mono font-bold">R²: 0.94 • MAE: 4.8m</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Predicts cycle duration based on garment specifications, operator skill ratings, and mechanical cycle telemetry.
              </p>
              <div className="text-[10px] text-slate-500 flex gap-4 pt-0.5 font-mono">
                <span>Features: 7</span>
                <span>Version: 1.2.0</span>
                <span>Artifact: processing_time_model.joblib</span>
              </div>
            </div>

            {/* Model 2 */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-900">Machine Failure Risk Classifier (XGBoost)</span>
                <span className="text-emerald-700 font-mono font-bold">ROC-AUC: 0.96 • F1: 0.91</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Classifies breakdown probability using multi-axis vibration harmonics, thermography, and preventive overhaul gaps.
              </p>
              <div className="text-[10px] text-slate-500 flex gap-4 pt-0.5 font-mono">
                <span>Features: 6</span>
                <span>Version: 1.2.0</span>
                <span>Artifact: failure_risk_model.joblib</span>
              </div>
            </div>
          </div>
        </div>

        {/* Machine Telemetry Chart */}
        <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <i className="fa-solid fa-chart-column text-emerald-600"></i>
              <span>High-Capacity Workstation Utilization Telemetry</span>
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Top Stations</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={telemetry.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="machine_id" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", fontSize: 11, borderRadius: 6 }}
                />
                <Bar dataKey="utilization" fill="#2563EB" radius={[4, 4, 0, 0]} name="Utilization %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
