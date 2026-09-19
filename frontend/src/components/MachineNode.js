import React from "react";

const STATE_COLORS = {
  AVAILABLE: "#0D9488",
  RUNNING: "#10B981",
  IDLE: "#6B7280",
  SETUP: "#F59E0B",
  BLOCKED: "#F97316",
  FAILED: "#E11D48",
  MAINTENANCE: "#7C3AED",
  REPAIRED: "#0D9488",
  VERIFIED: "#10B981",
  REASSIGNED: "#2563EB"
};

export default function MachineNode({ machine, isSelected, onClick }) {
  const {
    id,
    name,
    process_name,
    status = "AVAILABLE",
    current_order_id,
    failure_risk = 15
  } = machine;

  const posX = machine.x_position !== undefined ? machine.x_position : (machine.svg_x || 100);
  const posY = machine.y_position !== undefined ? machine.y_position : (machine.svg_y || 100);

  const isFailed = status === "FAILED";
  const isRunning = status === "RUNNING";
  const isReassigned = status === "REASSIGNED" || Boolean(machine.is_reassigned);
  const originalMachine = machine.original_machine_id;
  const color = STATE_COLORS[status] || "#6B7280";

  return (
    <g
      className="svg-machine-node"
      transform={`translate(${posX}, ${posY})`}
      onClick={() => onClick(machine)}
    >
      {/* Outer Pulse Wave when FAILED (Section 12: Must turn RED!) */}
      {isFailed && (
        <circle
          cx="0"
          cy="0"
          r="36"
          fill="none"
          stroke="#E11D48"
          className="node-pulse-failed"
        />
      )}

      {/* Reassigned Wave when REASSIGNED (Section 13) */}
      {isReassigned && (
        <circle
          cx="0"
          cy="0"
          r="35"
          fill="none"
          stroke="#2563EB"
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
          stroke="#714B67"
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />
      )}

      {/* Circular Machine Node Body */}
      <circle
        cx="0"
        cy="0"
        r="28"
        fill={isFailed ? "#FFF1F2" : isReassigned ? "#EFF6FF" : "#FFFFFF"}
        stroke={isFailed ? "#E11D48" : isReassigned ? "#2563EB" : color}
        strokeWidth={isFailed ? "3.5" : isSelected ? "3" : "2"}
        className="node-outer-ring"
      />

      {/* Rotating activity spinner if RUNNING */}
      {isRunning && (
        <circle
          cx="0"
          cy="0"
          r="23"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.5"
          strokeDasharray="12 16"
          className="node-indicator-running"
        />
      )}

      {/* Inner Core Circle */}
      <circle
        cx="0"
        cy="0"
        r="17"
        fill={isFailed ? "#FFE4E6" : isReassigned ? "#DBEAFE" : "#F4EBF1"}
      />

      {/* Machine ID Monospace Text */}
      <text
        x="0"
        y={isFailed ? "-4" : "1"}
        className="machine-id-text"
        fill={isFailed ? "#E11D48" : "#1F2937"}
        fontSize="9.5"
        fontWeight="700"
        fontFamily="Roboto Mono, monospace"
      >
        {id}
      </text>

      {/* Prominent FAILED label & warning icon if FAILED (Section 12) */}
      {isFailed && (
        <g transform="translate(0, 8)">
          <text
            x="0"
            y="0"
            fill="#E11D48"
            fontSize="7"
            fontWeight="800"
            fontFamily="Inter, sans-serif"
            textAnchor="middle"
          >
            ⚠ FAILED
          </text>
        </g>
      )}

      {/* RECOVERED label & Transition Indicator if REASSIGNED (Part 16) */}
      {isReassigned && (
        <g transform="translate(0, 36)">
          <rect
            x="-28"
            y="-6"
            width="56"
            height="13"
            rx="3"
            fill="#2563EB"
            stroke="#FFFFFF"
            strokeWidth="1"
          />
          <text
            x="0"
            y="3.5"
            fill="#FFFFFF"
            fontSize="6.5"
            fontWeight="800"
            fontFamily="Inter, sans-serif"
            textAnchor="middle"
          >
            [RECOVERED]
          </text>
          {originalMachine && (
            <text
              x="0"
              y="14"
              fill="#2563EB"
              fontSize="6.5"
              fontWeight="700"
              fontFamily="Roboto Mono, monospace"
              textAnchor="middle"
            >
              {originalMachine} → {id}
            </text>
          )}
        </g>
      )}

      {/* Process Title below node */}
      <text
        x="0"
        y={isReassigned ? (originalMachine ? "58" : "52") : "42"}
        className="machine-sub-text"
        fill="#6B7280"
        fontSize="8"
      >
        {process_name ? process_name.split(" ")[0] : "Process"}
      </text>

      {/* Active Order Pill on top */}
      {current_order_id && !isFailed && (
        <g transform="translate(0, -36)">
          <rect
            x="-30"
            y="-7"
            width="60"
            height="14"
            rx="3"
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="1"
          />
          <text
            x="0"
            y="3"
            fill="#1F2937"
            fontSize="8"
            fontWeight="700"
            fontFamily="Roboto Mono, monospace"
            textAnchor="middle"
          >
            {current_order_id}
          </text>
        </g>
      )}

      {/* Subtle Failure Risk Warning (if risk > 50% and not yet failed) */}
      {failure_risk > 50 && !isFailed && (
        <circle
          cx="20"
          cy="-20"
          r="4"
          fill="#F59E0B"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        >
          <title>Failure Risk: {failure_risk}%</title>
        </circle>
      )}
    </g>
  );
}
