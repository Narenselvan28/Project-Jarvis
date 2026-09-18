import React, { useState, useEffect } from "react";
import api from "../services/api";

const STATUS_COLORS = {
  COMPLETED: "#10b981", // green
  RUNNING: "#0284c7",   // industrial blue
  REASSIGNED: "#d97706", // amber/orange reassigned alert
  QUEUED: "#64748b",    // slate
  BLOCKED: "#ef4444"    // red
};

const ZOOM_CONFIGS = {
  "1h": { totalMinutes: 60, intervalMinutes: 10, label: "1 Hour" },
  "6h": { totalMinutes: 360, intervalMinutes: 30, label: "6 Hours" },
  "12h": { totalMinutes: 720, intervalMinutes: 60, label: "12 Hours" },
  "1d": { totalMinutes: 1440, intervalMinutes: 120, label: "1 Day" },
  "3d": { totalMinutes: 4320, intervalMinutes: 360, label: "3 Days" },
  "1w": { totalMinutes: 10080, intervalMinutes: 720, label: "1 Week" }
};

export default function OrderGanttChart({ orderId = "ORD-1042", onOrderChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState("1d");
  const [selectedOp, setSelectedOp] = useState(null);
  const [viewMode, setViewMode] = useState("ORDER"); // "ORDER" or "MACHINE"

  const fetchGantt = () => {
    setLoading(true);
    api.get(`/gantt/order/${orderId}`)
      .then((res) => {
        setData(res.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Failed to load Gantt schedule");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGantt();
    const interval = setInterval(fetchGantt, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading && !data) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", fontFamily: "monospace", color: "#64748b" }}>
        LOADING REAL-TIME GANTT SCHEDULE DATA...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "2rem", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "6px" }}>
        <strong>Schedule Data Error:</strong> {error || "Order timeline unavailable"}
      </div>
    );
  }

  const { order, operations = [], metrics = {} } = data;
  const zoomConf = ZOOM_CONFIGS[zoom] || ZOOM_CONFIGS["1d"];
  const horizonMinutes = Math.max(zoomConf.totalMinutes, (metrics.total_duration_hours || 16) * 60 * 1.2);
  const timelineWidth = 950;
  const timeScale = timelineWidth / horizonMinutes;

  // Generate tick markers
  const ticks = [];
  for (let m = 0; m <= horizonMinutes; m += zoomConf.intervalMinutes) {
    ticks.push(m);
  }

  // Deadline x position
  const deadlineMin = (order.deadline_hours || 12.0) * 60;
  const deadlineX = 260 + (deadlineMin * timeScale);

  // Now marker x position (relative offset)
  const nowMin = 180; // approximate progress marker for demo
  const nowX = 260 + (nowMin * timeScale);

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      {/* 1. Header Order Banner & Live Metrics */}
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: "700", fontFamily: "monospace", color: "#0f172a" }}>
                {order.id}
              </span>
              <span style={{
                padding: "0.2rem 0.6rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: "700",
                background: order.priority === "URGENT" ? "#fee2e2" : "#e0f2fe",
                color: order.priority === "URGENT" ? "#b91c1c" : "#0369a1"
              }}>
                {order.priority}
              </span>
              <span style={{
                padding: "0.2rem 0.6rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: "700",
                background: metrics.deadline_status === "ON TIME" ? "#dcfce7" : (metrics.deadline_status === "AT RISK" ? "#fef3c7" : "#fee2e2"),
                color: metrics.deadline_status === "ON TIME" ? "#15803d" : (metrics.deadline_status === "AT RISK" ? "#b45309" : "#b91c1c")
              }}>
                {metrics.deadline_status}
              </span>
            </div>
            <div style={{ fontSize: "0.875rem", color: "#475569" }}>
              <strong>Product:</strong> {order.product_name} &bull; <strong>Quantity:</strong> {order.quantity ? order.quantity.toLocaleString() : 0} pieces &bull; <strong>Route:</strong> 13 Sequential Apparel Processes
            </div>
          </div>

          {/* View Mode & Zoom Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", border: "1px solid #cbd5e1", borderRadius: "6px", overflow: "hidden" }}>
              <button
                onClick={() => setViewMode("ORDER")}
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  border: "none",
                  background: viewMode === "ORDER" ? "#0f172a" : "#ffffff",
                  color: viewMode === "ORDER" ? "#ffffff" : "#475569"
                }}
              >
                ORDER FLOW
              </button>
              <button
                onClick={() => setViewMode("MACHINE")}
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  border: "none",
                  borderLeft: "1px solid #cbd5e1",
                  background: viewMode === "MACHINE" ? "#0f172a" : "#ffffff",
                  color: viewMode === "MACHINE" ? "#ffffff" : "#475569"
                }}
              >
                MACHINE VIEW
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>ZOOM:</span>
              {Object.keys(ZOOM_CONFIGS).map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  style={{
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.7rem",
                    fontFamily: "monospace",
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: zoom === z ? "#0f172a" : "#cbd5e1",
                    background: zoom === z ? "#f1f5f9" : "#ffffff",
                    color: zoom === z ? "#0f172a" : "#64748b",
                    borderRadius: "4px"
                  }}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Metrics Summary Ribbon */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ background: "#ffffff", padding: "0.6rem 0.8rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>TOTAL DURATION</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "700", fontFamily: "monospace", color: "#0f172a" }}>{metrics.total_duration || "15h 15m"}</div>
          </div>

          <div style={{ background: "#ffffff", padding: "0.6rem 0.8rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>PROCESSING</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "700", fontFamily: "monospace", color: "#0284c7" }}>{metrics.processing_time || "12h 45m"}</div>
          </div>

          <div style={{ background: "#ffffff", padding: "0.6rem 0.8rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>SETUP TIME</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "700", fontFamily: "monospace", color: "#475569" }}>{metrics.setup_time || "2h 30m"}</div>
          </div>

          <div style={{ background: "#ffffff", padding: "0.6rem 0.8rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>WAITING TIME</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "700", fontFamily: "monospace", color: "#64748b" }}>{metrics.waiting_time || "0m"}</div>
          </div>

          <div style={{
            background: metrics.reassignments_count > 0 ? "#fffbeb" : "#ffffff",
            padding: "0.6rem 0.8rem",
            borderRadius: "6px",
            border: "1px solid",
            borderColor: metrics.reassignments_count > 0 ? "#fef3c7" : "#e2e8f0"
          }}>
            <div style={{ fontSize: "0.65rem", color: metrics.reassignments_count > 0 ? "#b45309" : "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
              REASSIGNMENTS
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: "700", fontFamily: "monospace", color: metrics.reassignments_count > 0 ? "#d97706" : "#0f172a" }}>
              {metrics.reassignments_count} {metrics.reassignments_count > 0 ? "⚡" : ""}
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: "0.6rem 0.8rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>ESTIMATED COST</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "700", fontFamily: "monospace", color: "#0f172a" }}>₹{metrics.total_cost?.toLocaleString() || "18,300"}</div>
          </div>
        </div>
      </div>

      {/* 2. Gantt Chart SVG Timeline Area */}
      <div style={{ overflowX: "auto", padding: "1.5rem", background: "#fcfdfd" }}>
        <div style={{ minWidth: "1250px" }}>
          <svg width="1250" height={operations.length * 44 + 60} style={{ display: "block" }}>
            {/* Grid Header & Time Ticks */}
            <g>
              <line x1="260" y1="35" x2="1220" y2="35" stroke="#cbd5e1" strokeWidth="1" />
              {ticks.map((t) => {
                const x = 260 + t * timeScale;
                if (x > 1220) return null;
                const hrs = Math.floor(t / 60);
                const mins = t % 60;
                const label = mins === 0 ? `${hrs}h` : `${hrs}h${mins}m`;
                return (
                  <g key={t}>
                    <line x1={x} y1="30" x2={x} y2={operations.length * 44 + 45} stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1={x} y1="30" x2={x} y2="35" stroke="#94a3b8" strokeWidth="1" />
                    <text x={x} y="22" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                      {label}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* DEADLINE VERTICAL MARKER */}
            {deadlineX <= 1220 && (
              <g>
                <line
                  x1={deadlineX}
                  y1="25"
                  x2={deadlineX}
                  y2={operations.length * 44 + 45}
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <rect x={deadlineX - 35} y="4" width="70" height="18" rx="3" fill="#ef4444" />
                <text x={deadlineX} y="16" fill="#ffffff" fontSize="9" fontWeight="700" fontFamily="monospace" textAnchor="middle">
                  DEADLINE
                </text>
              </g>
            )}

            {/* CURRENT TIME / NOW MARKER */}
            {nowX <= 1220 && (
              <g>
                <line
                  x1={nowX}
                  y1="25"
                  x2={nowX}
                  y2={operations.length * 44 + 45}
                  stroke="#0284c7"
                  strokeWidth="1.5"
                />
                <rect x={nowX - 20} y="4" width="40" height="18" rx="3" fill="#0284c7" />
                <text x={nowX} y="16" fill="#ffffff" fontSize="9" fontWeight="700" fontFamily="monospace" textAnchor="middle">
                  NOW
                </text>
              </g>
            )}

            {/* OPERATION ROWS */}
            {operations.map((op, idx) => {
              const y = 45 + idx * 44;
              const startM = op.scheduled_start_min || (idx * 65);
              const durM = op.predicted_processing_time || op.duration_min || 60;
              const endM = op.scheduled_end_min || (startM + durM);

              const barX = 260 + (startM * timeScale);
              const barW = Math.max(16, durM * timeScale);
              const isReassigned = op.is_reassigned || op.status === "REASSIGNED";
              const barColor = isReassigned ? STATUS_COLORS.REASSIGNED : (STATUS_COLORS[op.status] || STATUS_COLORS.QUEUED);

              return (
                <g
                  key={op.id || idx}
                  onClick={() => setSelectedOp(op)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Left Label: Process Name, Sequence, Machine ID */}
                  <rect x="10" y={y + 4} width="240" height="34" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
                  
                  <text x="20" y={y + 20} fill="#0f172a" fontSize="11" fontWeight="700">
                    {op.sequence}. {op.process_name}
                  </text>
                  
                  <text x="20" y={y + 32} fill="#64748b" fontSize="9.5" fontFamily="monospace">
                    {op.machine_id} &bull; {op.worker_name || "Operator"} &bull; {Math.round(durM)}m
                  </text>

                  {/* Row Separator */}
                  <line x1="260" y1={y + 40} x2="1220" y2={y + 40} stroke="#f1f5f9" strokeWidth="1" />

                  {/* Scheduled Bar */}
                  <rect
                    x={barX}
                    y={y + 8}
                    width={barW}
                    height="24"
                    rx="4"
                    fill={barColor}
                    stroke={isReassigned ? "#b45309" : "none"}
                    strokeWidth={isReassigned ? "1.5" : "0"}
                    style={{ transition: "all 0.2s" }}
                  >
                    <title>{`${op.process_name} on ${op.machine_id} (${Math.round(startM)}m - ${Math.round(endM)}m) [${op.status}]`}</title>
                  </rect>

                  {/* In-bar text */}
                  {barW > 60 && (
                    <text
                      x={barX + 8}
                      y={y + 24}
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {op.machine_id}
                    </text>
                  )}

                  {/* Reassignment Badge */}
                  {isReassigned && (
                    <g transform={`translate(${barX + barW + 8}, ${y + 11})`}>
                      <rect x="0" y="0" width="130" height="18" rx="3" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.8" />
                      <text x="6" y="12" fill="#b45309" fontSize="8.5" fontWeight="700" fontFamily="monospace">
                        ⚡ {op.original_machine_id} &rarr; {op.machine_id}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 3. Operation Detail Panel Modal */}
      {selectedOp && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: "#ffffff",
            width: "520px",
            maxWidth: "92vw",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            border: "1px solid #e2e8f0",
            overflow: "hidden"
          }}>
            <div style={{ padding: "1.25rem 1.5rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#64748b" }}>{selectedOp.id || `OP-${selectedOp.sequence}`}</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>{selectedOp.sequence}. {selectedOp.process_name}</div>
              </div>
              <button
                onClick={() => setSelectedOp(null)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>ASSIGNED MACHINE</span>
                <div style={{ fontSize: "1rem", fontWeight: "700", fontFamily: "monospace", color: "#0f172a" }}>{selectedOp.machine_id}</div>
              </div>

              <div>
                <span style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>STATUS</span>
                <div style={{ fontSize: "0.95rem", fontWeight: "700", color: STATUS_COLORS[selectedOp.status] || "#0f172a" }}>
                  {selectedOp.status}
                </div>
              </div>

              {selectedOp.is_reassigned && (
                <div style={{ gridColumn: "span 2", background: "#fffbeb", padding: "0.75rem", borderRadius: "6px", border: "1px solid #fef3c7" }}>
                  <span style={{ fontSize: "0.7rem", color: "#b45309", textTransform: "uppercase", fontWeight: "700" }}>REASSIGNMENT AUDIT</span>
                  <div style={{ fontSize: "0.875rem", color: "#92400e", marginTop: "0.25rem" }}>
                    Original Allocation: <strong>{selectedOp.original_machine_id}</strong> &rarr; New: <strong>{selectedOp.machine_id}</strong>
                    <br />
                    Reason: <em>{selectedOp.reassignment_reason || "Dynamic disruption recovery optimization"}</em>
                  </div>
                </div>
              )}

              <div>
                <span style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>PREDICTED PROCESSING TIME</span>
                <div style={{ fontSize: "0.95rem", fontFamily: "monospace", color: "#0f172a" }}>{selectedOp.predicted_processing_time || 60} minutes</div>
              </div>

              <div>
                <span style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>SETUP TIME</span>
                <div style={{ fontSize: "0.95rem", fontFamily: "monospace", color: "#0f172a" }}>{selectedOp.setup_time || 15} minutes</div>
              </div>

              <div>
                <span style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>ASSIGNED WORKER</span>
                <div style={{ fontSize: "0.95rem", color: "#0f172a" }}>{selectedOp.worker_name || "Assigned Operator"}</div>
              </div>

              <div>
                <span style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>OPERATION COST</span>
                <div style={{ fontSize: "0.95rem", fontFamily: "monospace", color: "#0f172a" }}>₹{selectedOp.production_cost || 1200}</div>
              </div>
            </div>

            <div style={{ padding: "1rem 1.5rem", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedOp(null)}
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
