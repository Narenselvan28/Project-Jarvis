import React, { useState, useRef } from "react";
import MachineNode from "./MachineNode";
import FlowConnector from "./FlowConnector";

export default function FactoryMap({
  lanes = [],
  machines = [],
  activeOrders = [],
  selectedMachine,
  onSelectMachine,
  onSelectOrder
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.target.closest(".svg-machine-node")) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleZoomIn = () => setZoom((z) => Math.min(2.0, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.6, z - 0.15));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Map of machine_id -> machine object
  const machineMap = {};
  machines.forEach((m) => {
    machineMap[m.id] = m;
  });

  // Check if ORD-1042 or any order has a cross-lane substitution active
  let crossLaneReassignments = [];
  activeOrders.forEach((ord) => {
    if (ord.operations) {
      ord.operations.forEach((op, idx) => {
        if (op.status === "REASSIGNED" && op.original_machine_id && op.assigned_machine_id) {
          const prevOp = ord.operations[idx - 1];
          const nextOp = ord.operations[idx + 1];
          if (prevOp && prevOp.assigned_machine_id) {
            crossLaneReassignments.push({
              from: machineMap[prevOp.assigned_machine_id],
              to: machineMap[op.assigned_machine_id],
              orderId: ord.id
            });
          }
          if (nextOp && nextOp.assigned_machine_id) {
            crossLaneReassignments.push({
              from: machineMap[op.assigned_machine_id],
              to: machineMap[nextOp.assigned_machine_id],
              orderId: ord.id
            });
          }
        }
      });
    }
  });

  return (
    <div className="factory-canvas-area" ref={containerRef}>
      {/* Zoom / Pan Overlay Controls */}
      <div className="factory-canvas-controls">
        <button className="canvas-ctrl-btn" onClick={handleZoomIn} title="Zoom In">+</button>
        <button className="canvas-ctrl-btn" onClick={handleZoomOut} title="Zoom Out">-</button>
        <button className="canvas-ctrl-btn" onClick={handleResetView} title="Reset View">Reset</button>
        <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace", marginLeft: "0.5rem" }}>
          Zoom: {Math.round(zoom * 100)}%
        </span>
      </div>

      <svg
        className="factory-svg-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        viewBox="0 0 1520 660"
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Top Process Column Headers */}
          {[
            { code: "FI", name: "Inspection", x: 80 },
            { code: "SP", name: "Spreading", x: 190 },
            { code: "CUT", name: "Cutting", x: 300 },
            { code: "BND", name: "Bundling", x: 410 },
            { code: "SH", name: "Shoulder", x: 520 },
            { code: "COL", name: "Collar", x: 630 },
            { code: "SL", name: "Sleeve", x: 740 },
            { code: "SS", name: "Side Seam", x: 850 },
            { code: "HM", name: "Hemming", x: 960 },
            { code: "PR/EMB", name: "Print/Emb", x: 1070 },
            { code: "FIN", name: "Finishing", x: 1180 },
            { code: "QC", name: "Quality", x: 1290 },
            { code: "PK", name: "Packing", x: 1400 },
          ].map((col) => (
            <g key={col.code} transform={`translate(${col.x}, 28)`}>
              <line x1="0" y1="20" x2="0" y2="580" stroke="#1e293b" strokeDasharray="3 4" strokeWidth="0.8" opacity="0.4" />
              <rect x="-42" y="-18" width="84" height="26" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              <text x="0" y="-5" fill="#38bdf8" fontSize="9" fontWeight="700" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
                {col.code}
              </text>
              <text x="0" y="5" fill="#94a3b8" fontSize="7.5" fontFamily="Inter, sans-serif" textAnchor="middle">
                {col.name}
              </text>
            </g>
          ))}

          {/* Lane Background Guides */}
          {lanes.map((lane, idx) => {
            const laneY = 90 + idx * 180;
            return (
              <g key={lane.id}>
                {/* Lane Guide Container */}
                <rect
                  x="20"
                  y={laneY - 20}
                  width="1460"
                  height="160"
                  rx="6"
                  fill="#090d16"
                  stroke="#172239"
                  strokeWidth="1"
                />

                {/* Lane Header Banner */}
                <g transform={`translate(35, ${laneY - 10})`}>
                  <rect
                    x="0"
                    y="0"
                    width="220"
                    height="18"
                    rx="3"
                    className="lane-label-box"
                  />
                  <text x="8" y="13" className="lane-title-text">
                    {lane.name.toUpperCase()}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Sequential Connectors within Each Lane */}
          {lanes.map((lane) => {
            const laneMachines = lane.machines || [];
            return laneMachines.map((m, idx) => {
              if (idx === laneMachines.length - 1) return null;
              const nextM = laneMachines[idx + 1];
              const isBlocked = m.status === "FAILED" || nextM.status === "FAILED";
              return (
                <FlowConnector
                  key={`${m.id}-${nextM.id}`}
                  fromMachine={m}
                  toMachine={nextM}
                  isActive={m.status === "RUNNING"}
                  isBlocked={isBlocked}
                />
              );
            });
          })}

          {/* Cross-Lane Dynamic Reassignment Connectors */}
          {crossLaneReassignments.map((c, i) => (
            <FlowConnector
              key={`reassign-${i}`}
              fromMachine={c.from}
              toMachine={c.to}
              isReassigned={true}
            />
          ))}

          {/* Machine Nodes */}
          {machines.map((m) => (
            <MachineNode
              key={m.id}
              machine={m}
              isSelected={selectedMachine && selectedMachine.id === m.id}
              onClick={onSelectMachine}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
