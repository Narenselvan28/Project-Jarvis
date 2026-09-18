import React from "react";

export default function FlowConnector({
  fromMachine,
  toMachine,
  isActive = true,
  isReassigned = false,
  isBlocked = false
}) {
  if (!fromMachine || !toMachine) return null;

  const x1 = fromMachine.x_position !== undefined ? fromMachine.x_position : (fromMachine.svg_x || 100);
  const y1 = fromMachine.y_position !== undefined ? fromMachine.y_position : (fromMachine.svg_y || 100);
  const x2 = toMachine.x_position !== undefined ? toMachine.x_position : (toMachine.svg_x || 100);
  const y2 = toMachine.y_position !== undefined ? toMachine.y_position : (toMachine.svg_y || 100);

  // Cubic Bezier curve control points
  const dx = (x2 - x1) * 0.5;
  const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

  let pathClass = "flow-path-base";
  if (isBlocked) {
    pathClass = "flow-path-blocked";
  } else if (isReassigned) {
    pathClass = "flow-path-reassigned";
  } else if (isActive) {
    pathClass = "flow-path-active";
  }

  // Mid-point coordinates for reassignment badge
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g>
      {/* Background track line */}
      <path d={pathD} className="flow-path-base" />

      {/* Dynamic Animated flow line */}
      <path d={pathD} className={pathClass} />

      {/* Explicit RECOVERY badge on reassigned paths (Section 13) */}
      {isReassigned && (
        <g transform={`translate(${midX}, ${midY})`}>
          <rect
            x="-32"
            y="-8"
            width="64"
            height="16"
            rx="4"
            fill="#2563EB"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            filter="drop-shadow(0 2px 4px rgba(37,99,235,0.25))"
          />
          <text
            x="0"
            y="3.5"
            fill="#FFFFFF"
            fontSize="7.5"
            fontWeight="800"
            fontFamily="Inter, sans-serif"
            textAnchor="middle"
          >
            ↳ RECOVERY
          </text>
        </g>
      )}
    </g>
  );
}
