import React, { useState } from "react";

export default function OrderView({ orders = [], onSelectOrder }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.product_name || o.product || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchPrio = priorityFilter === "ALL" || o.priority === priorityFilter;
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchSearch && matchPrio && matchStatus;
  });

  const getPriorityBadge = (prio) => {
    switch (prio) {
      case "URGENT":
        return "bg-criticalLight text-critical border border-rose-200 font-bold";
      case "HIGH":
        return "bg-warningLight text-amber-800 border border-amber-200 font-bold";
      case "NORMAL":
      case "MEDIUM":
        return "bg-blue-50 text-blue-800 border border-blue-200 font-medium";
      case "LOW":
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200 font-medium";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "RUNNING":
        return "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold";
      case "BLOCKED":
        return "bg-criticalLight text-critical border border-rose-200 font-bold animate-pulse";
      case "COMPLETED":
        return "bg-slate-50 text-slate-700 border border-slate-200 font-medium";
      case "QUEUED":
      case "PLANNED":
      default:
        return "bg-primaryLight text-primary border border-plum-100 font-semibold";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bgMain overflow-hidden p-6">
      {/* Header & Filter Toolbar matching ui.txt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-textMain flex items-center gap-2">
            <span>Aanaigal / Production Orders Registry</span>
            <span className="text-[11px] bg-primaryLight text-primary font-mono font-bold px-2 py-0.5 rounded-full">
              {filteredOrders.length}
            </span>
          </h2>
          <p className="text-xs text-textSub mt-0.5">
            Click any order to inspect manufacturing route, machine allocations, and recovery pathways
          </p>
        </div>

        {/* Filters & Actions Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-textSub text-xs"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search order or product..."
              className="w-[190px] pl-8 pr-3 py-1.5 bg-white border border-borderCol rounded-md text-xs font-medium text-textMain placeholder-textSub focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-borderCol rounded-md text-xs font-medium text-textMain shadow-sm focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-borderCol rounded-md text-xs font-medium text-textMain shadow-sm focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="RUNNING">Running</option>
            <option value="BLOCKED">Blocked</option>
            <option value="QUEUED">Queued</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Orders Table Container per ui.txt */}
      <div className="border border-borderCol rounded-xl overflow-hidden shadow-soft bg-white flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-borderCol text-[10px] font-semibold text-textSub uppercase tracking-wider sticky top-0 z-10">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Current Operation</th>
                <th className="py-3 px-4">Machine</th>
                <th className="py-3 px-4">Lane</th>
                <th className="py-3 px-4 text-center">Progress</th>
                <th className="py-3 px-4">ETA</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs text-textMain divide-y divide-borderCol">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((o) => {
                  const ops = o.operations || [];
                  const activeOp =
                    ops.find((op) => op.status === "RUNNING" || op.status === "BLOCKED") ||
                    ops.find((op) => op.status !== "COMPLETED") ||
                    ops[0];

                  const currentOpName = activeOp ? activeOp.process_name || `Op ${activeOp.sequence}` : "Queued";
                  const currentMachine = activeOp ? activeOp.assigned_machine_id || activeOp.machine_id || "—" : "—";
                  const currentLane = activeOp ? (activeOp.lane_id || o.assigned_lane_id || "L01").replace("L0", "Lane ") : "—";
                  const progressPct = o.status === "COMPLETED" ? 100 : (o.status === "RUNNING" ? 68 : 15);
                  const etaTime = o.deadline_hours ? `${Math.round(o.deadline_hours)}h` : "14:45";

                  return (
                    <tr
                      key={o.id}
                      onClick={() => onSelectOrder(o.id)}
                      className="hover:bg-bgMain transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {o.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-textMain">
                        {o.product_name || o.product || "Apparel Batch"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {(o.quantity || 0).toLocaleString()} pcs
                      </td>
                      <td className="py-3 px-4">
                        <span className={`status-pill inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${getPriorityBadge(o.priority)}`}>
                          {o.priority || "NORMAL"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-textMain">
                        {currentOpName}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-textMain">
                        {currentMachine}
                      </td>
                      <td className="py-3 px-4 font-mono text-textSub">
                        {currentLane}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 h-1.5 bg-borderCol rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${progressPct}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-semibold text-textSub">{progressPct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-textSub">
                        {etaTime}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`status-pill inline-flex items-center px-2.5 py-1 rounded-full text-[10px] ${getStatusBadge(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOrder(o.id);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium text-primary bg-primaryLight hover:bg-primary hover:text-white rounded-md transition-colors shadow-sm"
                        >
                          Inspect Route →
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-textSub font-mono text-xs">
                    No production orders match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
