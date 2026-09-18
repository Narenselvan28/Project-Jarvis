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
        return "bg-red-50 border-red-300 text-red-700 font-bold";
      case "HIGH":
        return "bg-orange-50 border-orange-300 text-orange-700 font-bold";
      case "NORMAL":
      case "MEDIUM":
        return "bg-blue-50 border-blue-300 text-blue-700";
      case "LOW":
      default:
        return "bg-slate-50 border-slate-300 text-slate-700";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "RUNNING":
        return "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold";
      case "BLOCKED":
        return "bg-orange-50 border-orange-400 text-orange-900 font-bold animate-pulse";
      case "COMPLETED":
        return "bg-slate-100 border-slate-300 text-slate-700";
      case "QUEUED":
      case "PLANNED":
      default:
        return "bg-blue-50 border-blue-300 text-blue-700 font-semibold";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-hidden p-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <span>Aanaigal / Production Orders Registry</span>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
              {filteredOrders.length}
            </span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Click any order to inspect manufacturing route, machine allocations, and disruption recovery paths
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search order or product..."
              className="pl-8 pr-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal / Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="RUNNING">Running</option>
            <option value="BLOCKED">Blocked</option>
            <option value="QUEUED">Queued</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Orders Table (Section 17: Compact Professional Table) */}
      <div className="flex-1 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Current Operation</th>
                <th className="py-3 px-4">Machine</th>
                <th className="py-3 px-4">Lane</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((o) => {
                  // Determine active operation
                  const ops = o.operations || [];
                  const activeOp =
                    ops.find((op) => op.status === "RUNNING" || op.status === "BLOCKED") ||
                    ops.find((op) => op.status !== "COMPLETED") ||
                    ops[0];

                  const currentOpName = activeOp ? activeOp.process_name || `Op ${activeOp.sequence}` : "Queued";
                  const currentMachine = activeOp ? activeOp.assigned_machine_id || activeOp.machine_id || "—" : "—";
                  const currentLane = activeOp ? (activeOp.lane_id || o.assigned_lane_id || "L01").replace("L0", "L") : "—";

                  return (
                    <tr
                      key={o.id}
                      onClick={() => onSelectOrder(o.id)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {o.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {o.product_name || o.product || "Apparel Batch"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {(o.quantity || 0).toLocaleString()} pcs
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] ${getPriorityBadge(o.priority)}`}>
                          {o.priority || "NORMAL"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {currentOpName}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {currentMachine}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {currentLane}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] ${getStatusBadge(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOrder(o.id);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-[#1E293B] hover:text-white rounded transition-colors"
                        >
                          Inspect Route →
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400 font-mono text-xs">
                    No matching orders found.
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
