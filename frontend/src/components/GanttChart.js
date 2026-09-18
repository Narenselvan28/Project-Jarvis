import React from "react";

const STATUS_COLORS = {
  COMPLETED: "#10b981",
  RUNNING: "#06b6d4",
  REASSIGNED: "#14b8a6",
  QUEUED: "#3b82f6",
  BLOCKED: "#ef4444"
};

export default function GanttChart({ operations = [], machines = [] }) {
  const maxTime = Math.max(480, ...operations.map((op) => op.end_min || 0));
  const timeScale = 900 / Math.max(1, maxTime);

  // Group operations by machine_id
  const opsByMachine = {};
  machines.forEach((m) => {
    opsByMachine[m.id] = [];
  });
  operations.forEach((op) => {
    if (op.machine_id) {
      if (!opsByMachine[op.machine_id]) opsByMachine[op.machine_id] = [];
      opsByMachine[op.machine_id].push(op);
    }
  });

  return (
    <div style={{ overflowX: "auto", background: "#0b1220", border: "1px solid #243452", borderRadius: "6px", padding: "1rem" }}>
      <svg width="1050" height={machines.length * 36 + 50}>
        {/* Time Axis Markers */}
        {[0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600].map((t) => {
          const x = 120 + t * timeScale;
          return (
            <g key={t}>
              <line x1={x} y1={25} x2={x} y2={machines.length * 36 + 30} stroke="#1a273e" strokeDasharray="3 3" />
              <text x={x} y={18} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                {t}m
              </text>
            </g>
          );
        })}

        {/* Machine Rows */}
        {machines.map((m, idx) => {
          const y = 35 + idx * 36;
          const mOps = opsByMachine[m.id] || [];

          return (
            <g key={m.id}>
              {/* Machine label */}
              <text x="15" y={y + 18} fill="#94a3b8" fontSize="11" fontWeight="700" fontFamily="monospace">
                {m.id} ({m.lane_id})
              </text>

              {/* Row guide */}
              <line x1="120" y1={y + 28} x2="1020" y2={y + 28} stroke="#172239" strokeWidth="0.8" />

              {/* Operations Blocks */}
              {mOps.map((op) => {
                const opX = 120 + op.start_min * timeScale;
                const opW = Math.max(12, (op.end_min - op.start_min) * timeScale);
                const color = STATUS_COLORS[op.status] || "#3b82f6";

                return (
                  <g key={op.id || `${op.order_id}-${op.sequence}`}>
                    <rect
                      x={opX}
                      y={y + 4}
                      width={opW}
                      height="20"
                      rx="3"
                      fill={color}
                      fillOpacity="0.85"
                      stroke={color}
                      strokeWidth="1"
                    >
                      <title>{`${op.order_id} - ${op.process_name} (${op.start_min}m - ${op.end_min}m) [${op.status}]`}</title>
                    </rect>
                    {opW > 45 && (
                      <text
                        x={opX + 6}
                        y={y + 17}
                        fill="#ffffff"
                        fontSize="9.5"
                        fontWeight="700"
                        fontFamily="monospace"
                      >
                        {op.order_id}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
