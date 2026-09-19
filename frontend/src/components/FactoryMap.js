import React, { useState, useRef, useMemo } from "react";
import MachineNode from "./MachineNode";
import FlowConnector from "./FlowConnector";

export default function FactoryMap({
  lanes = [],
  machines = [],
  activeOrders = [],
  orderRoutes = {},
  activeSchedule = null,
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
  const machineMap = useMemo(() => {
    const map = {};
    machines.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [machines]);

  // Derive genuine sequential operation routes from backend order_routes topology (Part 16 & 17)
  const orderRouteSegments = useMemo(() => {
    const segments = [];
    const routeEntries = Object.entries(orderRoutes);

    if (routeEntries.length > 0) {
      routeEntries.forEach(([ordId, ops]) => {
        // Sort explicitly by sequence index
        const sortedOps = [...ops].sort((a, b) => (a.sequence || 1) - (b.sequence || 1));
        for (let i = 0; i < sortedOps.length - 1; i++) {
          const curr = sortedOps[i];
          const next = sortedOps[i + 1];
          const fromM = machineMap[curr.machine_id];
          const toM = machineMap[next.machine_id];
          if (fromM && toM) {
            const isReassigned = Boolean(
              curr.is_reassigned || next.is_reassigned ||
              curr.status === "REASSIGNED" || next.status === "REASSIGNED" ||
              curr.original_machine_id || next.original_machine_id
            );
            segments.push({
              key: `${ordId}-seq-${curr.sequence}-${next.sequence}`,
              fromMachine: fromM,
              toMachine: toM,
              isReassigned,
              isActive: fromM.status === "RUNNING" || toM.status === "RUNNING",
              orderId: ordId
            });
          }
        }
      });
    }
    return segments;
  }, [orderRoutes, machineMap]);

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
        {activeSchedule && (
          <span style={{ fontSize: "0.72rem", color: "#047857", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace", fontWeight: 700, marginLeft: "0.75rem" }}>
            SCHEDULE: {activeSchedule.id || "SCHED-V1"} (v{activeSchedule.version || 1}) • {activeSchedule.status || "ACTIVE"}
          </span>
        )}
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
              <line x1="0" y1="20" x2="0" y2="580" stroke="#E5E7EB" strokeDasharray="3 4" strokeWidth="0.8" opacity="0.8" />
              <rect x="-42" y="-18" width="84" height="26" rx="4" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
              <text x="0" y="-5" fill="#714B67" fontSize="9" fontWeight="700" fontFamily="Inter, sans-serif" textAnchor="middle">
                {col.code}
              </text>
              <text x="0" y="5" fill="#6B7280" fontSize="7.5" fontFamily="Inter, sans-serif" textAnchor="middle">
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
                  rx="8"
                  fill="#FFFFFF"
                  stroke="#E5E7EB"
                  strokeWidth="1"
                />

                {/* Lane Header Banner */}
                <g transform={`translate(35, ${laneY - 10})`}>
                  <rect
                    x="0"
                    y="0"
                    width="220"
                    height="20"
                    rx="4"
                    fill="#F4EBF1"
                    stroke="#E5E7EB"
                    strokeWidth="1"
                  />
                  <text x="10" y="14" fill="#714B67" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">
                    {lane.name.toUpperCase()}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Baseline Physical Lane Connectors */}
          {lanes.map((lane) => {
            const laneMachines = lane.machines || [];
            return laneMachines.map((m, idx) => {
              if (idx === laneMachines.length - 1) return null;
              const nextM = laneMachines[idx + 1];
              const isBlocked = m.status === "FAILED" || nextM.status === "FAILED";
              const hasOrderRoutes = orderRouteSegments.length > 0;
              return (
                <FlowConnector
                  key={`lane-${m.id}-${nextM.id}`}
                  fromMachine={m}
                  toMachine={nextM}
                  isActive={!hasOrderRoutes && m.status === "RUNNING"}
                  isBlocked={isBlocked}
                />
              );
            });
          })}

          {/* Sequential Order Production & Recovery Routes (Part 16 & 17) */}
          {orderRouteSegments.map((seg) => (
            <FlowConnector
              key={seg.key}
              fromMachine={seg.fromMachine}
              toMachine={seg.toMachine}
              isReassigned={seg.isReassigned}
              isActive={seg.isActive}
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
