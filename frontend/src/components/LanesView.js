import React from "react";

export default function LanesView({
  lanes = [],
  processes = [],
  machines = [],
  onSelectMachine
}) {
  // Sort processes by sequence_index
  const sortedProcesses = [...processes].sort(
    (a, b) => (a.sequence_index || 1) - (b.sequence_index || 1)
  );

  // Group machines by lane_id and grid_column
  const machineGrid = {};
  machines.forEach((m) => {
    const laneId = m.lane_id || "L01";
    const col = m.grid_column || 1;
    if (!machineGrid[laneId]) machineGrid[laneId] = {};
    if (!machineGrid[laneId][col]) machineGrid[laneId][col] = [];
    machineGrid[laneId][col].push(m);
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "RUNNING":
        return {
          bg: "bg-emerald-50 border-emerald-300 text-emerald-800",
          icon: "fa-solid fa-circle-play",
          label: "RUNNING"
        };
      case "FAILED":
        return {
          bg: "bg-red-100 border-red-500 text-red-900 font-extrabold",
          icon: "fa-solid fa-triangle-exclamation",
          label: "FAILED"
        };
      case "BLOCKED":
        return {
          bg: "bg-orange-50 border-orange-300 text-orange-800",
          icon: "fa-solid fa-hand",
          label: "BLOCKED"
        };
      case "SETUP":
        return {
          bg: "bg-amber-50 border-amber-300 text-amber-800",
          icon: "fa-solid fa-screwdriver-wrench",
          label: "SETUP"
        };
      case "MAINTENANCE":
        return {
          bg: "bg-purple-50 border-purple-300 text-purple-800",
          icon: "fa-solid fa-wrench",
          label: "MAINT"
        };
      case "REASSIGNED":
        return {
          bg: "bg-blue-50 border-blue-400 text-blue-800 font-bold",
          icon: "fa-solid fa-shuffle",
          label: "REASSIGNED"
        };
      case "REPAIRED":
        return {
          bg: "bg-teal-50 border-teal-300 text-teal-800",
          icon: "fa-solid fa-check-double",
          label: "REPAIRED"
        };
      case "VERIFIED":
        return {
          bg: "bg-emerald-50 border-emerald-400 text-emerald-800",
          icon: "fa-solid fa-certificate",
          label: "VERIFIED"
        };
      case "IDLE":
        return {
          bg: "bg-slate-50 border-slate-300 text-slate-700",
          icon: "fa-solid fa-pause",
          label: "IDLE"
        };
      case "AVAILABLE":
      default:
        return {
          bg: "bg-teal-50 border-teal-300 text-teal-800",
          icon: "fa-solid fa-circle-check",
          label: "AVAILABLE"
        };
    }
  };

  return (
    <div className="lanes-view-scroll-container">
      <div className="lanes-grid">
        {/* Process Flow Header (Sticky deterministic columns) */}
        <div className="process-header-row">
          <div className="flex flex-col justify-center px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Flow Direction →
            </span>
            <span className="text-xs font-bold text-slate-800">
              Lanes & Workstations
            </span>
          </div>

          {sortedProcesses.map((p) => (
            <div key={p.id} className="process-col-header">
              <span className="col-seq">P{p.sequence_index || 1}</span>
              <span className="col-code">{p.code || p.name}</span>
              <span className="col-name" title={p.name}>
                {p.name}
              </span>
            </div>
          ))}
        </div>

        {/* Lanes Row Bands */}
        {lanes.map((lane) => {
          const laneId = lane.id;
          const laneMachinesByCol = machineGrid[laneId] || {};
          const util = lane.utilization || 75.0;

          return (
            <div key={laneId} className="lane-row-band">
              {/* Lane Info Card */}
              <div className="lane-badge-card">
                <div className="lane-title">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>{lane.name ? lane.name.split("-")[0].trim() : laneId}</span>
                </div>
                <div className="lane-desc truncate">
                  {lane.name ? lane.name.split("-").slice(1).join("-").trim() : lane.description || "Production Line"}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold mt-1">
                  <span>Line Load:</span>
                  <span className="font-mono text-emerald-700">{util}%</span>
                </div>
                <div className="lane-util-bar">
                  <div
                    className="lane-util-fill"
                    style={{
                      width: `${Math.min(100, util)}%`,
                      backgroundColor: util > 90 ? "#DC2626" : util > 75 ? "#16A34A" : "#2563EB"
                    }}
                  ></div>
                </div>
              </div>

              {/* 13 Process Columns */}
              {sortedProcesses.map((p) => {
                const colIndex = p.sequence_index || 1;
                const machList = laneMachinesByCol[colIndex] || [];

                return (
                  <div key={p.id} className="machine-cell space-y-2">
                    {machList.length > 0 ? (
                      machList.map((m) => {
                        const isFailed = m.status === "FAILED";
                        const isReassigned = m.status === "REASSIGNED";
                        const badge = getStatusBadge(m.status);
                        const nodeClass = isFailed
                          ? "status-failed"
                          : isReassigned
                          ? "status-reassigned"
                          : `status-${(m.status || "available").toLowerCase()}`;

                        return (
                          <div
                            key={m.id}
                            onClick={() => onSelectMachine(m)}
                            className={`machine-node-card ${nodeClass}`}
                            title={`Click to inspect ${m.id} (${m.name})`}
                          >
                            <div className="machine-node-header">
                              <span className="machine-node-id flex items-center gap-1">
                                {isFailed && (
                                  <i className="fa-solid fa-triangle-exclamation text-red-600 animate-pulse text-[11px]"></i>
                                )}
                                {m.id}
                              </span>
                              <span className="text-[9px] font-mono text-slate-500">
                                {m.utilization ? `${m.utilization}%` : "—"}
                              </span>
                            </div>

                            <div className="machine-node-process">
                              {p.name}
                            </div>

                            <div className={`machine-node-status border ${badge.bg}`}>
                              <i className={`${badge.icon} text-[9px]`}></i>
                              <span>{badge.label}</span>
                            </div>

                            <div className="machine-node-order">
                              <span className="truncate">
                                {m.current_order_id ? (
                                  <span className="text-blue-700 font-bold">
                                    {m.current_order_id}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">No Active Job</span>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full min-h-[84px] border border-dashed border-slate-200 rounded-md flex items-center justify-center bg-slate-50/50">
                        <span className="text-[10px] text-slate-300 font-mono">—</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
