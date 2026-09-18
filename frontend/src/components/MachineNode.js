import React from "react";

const STATE_COLORS = {
  AVAILABLE: "#10b981",
  RUNNING: "#06b6d4",
  IDLE: "#64748b",
  SETUP: "#f59e0b",
  BLOCKED: "#f97316",
  FAILED: "#ef4444",
  MAINTENANCE: "#ec4899",
  REPAIRED: "#8b5cf6",
  VERIFIED: "#3b82f6",
  REASSIGNED: "#14b8a6"
};

export default function MachineNode({ machine, isSelected, onClick }) {
  const {
    id,
    name,
    process_name,
    status,
    current_order_id,
    current_utilization = 75,
    failure_risk = 15
  } = machine;

  const posX = machine.x_position !== undefined ? machine.x_position : (machine.svg_x || 100);
  const posY = machine.y_position !== undefined ? machine.y_position : (machine.svg_y || 100);

  const color = STATE_COLORS[status] || "#64748b";
  const isFailed = status === "FAILED";
  const isRunning = status === "RUNNING";
  const isReassigned = status === "REASSIGNED";

  return (
    <g
      className="svg-machine-node"
      transform={`translate(${posX}, ${posY})`}
      onClick={() => onClick(machine)}
    >
      {/* Pulse wave when failed */}
      {isFailed && (
        <circle
          cx="0"
          cy="0"
          r="36"
          fill="none"
          stroke="#ef4444"
          className="node-pulse-failed"
        />
      )}

      {/* Reassigned glow */}
      {isReassigned && (
        <circle
          cx="0"
          cy="0"
          r="34"
          fill="none"
          stroke="#14b8a6"
          strokeWidth="2"
          className="node-pulse-reassigned"
        />
      )}

      {/* Selected Halo */}
      {isSelected && (
        <circle
          cx="0"
          cy="0"
          r="38"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />
      )}

      {/* Outer Status Ring */}
      <circle
        cx="0"
        cy="0"
        r="28"
        fill="#0f172a"
        stroke={color}
        strokeWidth={isSelected ? "3" : "2"}
        className="node-outer-ring"
      />

      {/* Rotating spinner activity indicator if RUNNING */}
      {isRunning && (
        <circle
          cx="0"
          cy="0"
          r="24"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="14 18"
          className="node-indicator-running"
        />
      )}

      {/* Inner Technical Core */}
      <circle cx="0" cy="0" r="18" fill="#1e293b" />

      {/* Machine ID Monospace Text */}
      <text
        x="0"
        y="1"
        className="machine-id-text"
        fill={isFailed ? "#fca5a5" : "#f8fafc"}
      >
        {id}
      </text>

      {/* Process Title */}
      <text x="0" y="42" className="machine-sub-text">
        {process_name ? process_name.split(" ")[0] : "Process"}
      </text>

      {/* Current Order or Status Badge */}
      {current_order_id ? (
        <g transform="translate(0, -36)">
          <rect
            x="-32"
            y="-8"
            width="64"
            height="15"
            rx="3"
            fill="#1e293b"
            stroke={color}
            strokeWidth="1"
          />
          <text
            x="0"
            y="3"
            fill="#e2e8f0"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="JetBrains Mono, monospace"
            textAnchor="middle"
          >
            {current_order_id}
          </text>
        </g>
      ) : (
        <g transform="translate(0, -35)">
          <circle cx="0" cy="0" r="3.5" fill={color} />
        </g>
      )}

      {/* Failure Risk Indicator (subtle dot if risk > 50%) */}
      {failure_risk > 50 && !isFailed && (
        <circle
          cx="20"
          cy="-20"
          r="4"
          fill="#f97316"
          stroke="#0f172a"
          strokeWidth="1.5"
        >
          <title>High Failure Risk: {failure_risk}%</title>
        </circle>
      )}
    </g>
  );
}
