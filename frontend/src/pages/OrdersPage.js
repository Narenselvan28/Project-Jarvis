import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import OrderDetailsModal from "../components/OrderDetailsModal";

export default function OrdersPage({ user }) {
  const { orderId: routeOrderId } = useParams();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(routeOrderId || null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Order Creation Form State
  const [productName, setProductName] = useState("Classic Crew Neck T-Shirt");
  const [productCode, setProductCode] = useState("PRD-TSHIRT-01");
  const [quantity, setQuantity] = useState(10000);
  const [priority, setPriority] = useState("HIGH");
  const [customer, setCustomer] = useState("Athletica Global Ltd");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/orders");
      const payload = res.data?.data || res.data;
      setOrders(payload.orders || payload || []);
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (routeOrderId) {
      setSelectedOrderId(routeOrderId);
    }
  }, [routeOrderId]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      setCreateMsg(null);
      const res = await api.post("/orders", {
        product: productName,
        product_code: productCode,
        quantity: parseInt(quantity, 10),
        priority,
        customer
      });
      setCreateMsg("Order successfully committed to MongoDB schedule queue!");
      loadOrders();
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateMsg(null);
      }, 1200);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error?.message || err.response?.data?.error || "Failed to create order.");
    } finally {
      setCreating(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    return (
      o.id.toLowerCase().includes(term) ||
      (o.product_name || o.product || "").toLowerCase().includes(term) ||
      (o.customer || "").toLowerCase().includes(term)
    );
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

  const isAuthorizedToCreate = user?.role === "MANAGER" || user?.role === "SUPERVISOR";

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-hidden p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
            <span>Aanaigal / Production Orders Registry</span>
            <span className="text-xs font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
              {orders.length}
            </span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Full manufacturing order queue, sequence allocations, routing paths, and live tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order ID, product, client..."
              className="pl-9 pr-3 py-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800 w-64"
            />
          </div>

          {isAuthorizedToCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm transition-all"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>Create New Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="flex-1 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
              <tr>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Product Formulation</th>
                <th className="py-3.5 px-4 text-right">Volume</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Active Stage</th>
                <th className="py-3.5 px-4">Allocated Workstation</th>
                <th className="py-3.5 px-4">Production Line</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-mono text-xs">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Loading production orders from MongoDB...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((o) => {
                  const ops = o.operations || [];
                  const activeOp =
                    ops.find((op) => op.status === "RUNNING" || op.status === "BLOCKED") ||
                    ops.find((op) => op.status !== "COMPLETED") ||
                    ops[0];

                  const currentOpName = activeOp ? activeOp.process_name || `Op ${activeOp.sequence}` : "Queued";
                  const currentMachine = activeOp ? activeOp.assigned_machine_id || activeOp.machine_id || "—" : "—";
                  const currentLane = activeOp ? (activeOp.lane_id || o.assigned_lane_id || "L01").replace("L0", "Lane ") : "—";

                  return (
                    <tr
                      key={o.id}
                      onClick={() => {
                        setSelectedOrderId(o.id);
                        navigate(`/orders/${o.id}`);
                      }}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        {o.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {o.product_name || o.product || "Classic Garment Batch"}
                        {o.customer && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Customer: {o.customer}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium">
                        {(o.quantity || 0).toLocaleString()} pcs
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] ${getPriorityBadge(o.priority)}`}>
                          {o.priority || "NORMAL"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {currentOpName}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {currentMachine}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {currentLane}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] ${getStatusBadge(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(o.id);
                            navigate(`/orders/${o.id}`);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-[#1E293B] hover:text-white rounded transition-colors"
                        >
                          View Route →
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-mono text-xs">
                    No matching orders in registry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal (when an order is clicked) */}
      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => {
            setSelectedOrderId(null);
            navigate("/orders");
          }}
        />
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div
            className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-xl shadow-modal p-6 flex flex-col antialiased"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  New Production Order (Aanaigal)
                </h2>
                <p className="text-xs text-[#64748B]">
                  Creates and injects a validated batch order into the shopfloor schedule
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] flex items-center justify-center text-sm"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {createMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg mb-3">
                {createMsg}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Product Formulation
                </label>
                <select
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    if (e.target.value.includes("Polo")) setProductCode("PRD-POLO-02");
                    else if (e.target.value.includes("Hoodie")) setProductCode("PRD-HOODIE-03");
                    else setProductCode("PRD-TSHIRT-01");
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                >
                  <option value="Classic Crew Neck T-Shirt">Classic Crew Neck T-Shirt (PRD-TSHIRT-01)</option>
                  <option value="Pique Collar Polo Shirt">Pique Collar Polo Shirt (PRD-POLO-02)</option>
                  <option value="Heavyweight Fleece Pullover">Heavyweight Fleece Pullover (PRD-HOODIE-03)</option>
                  <option value="Tapered Rib Joggers">Tapered Rib Joggers (PRD-JOGGER-04)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Order Volume (Pieces)
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min={500}
                    max={50000}
                    step={500}
                    required
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Scheduling Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                  >
                    <option value="URGENT">Urgent (Express SLA)</option>
                    <option value="HIGH">High Priority</option>
                    <option value="NORMAL">Normal Standard</option>
                    <option value="LOW">Low Fill Batch</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Customer / Buyer Reference
                </label>
                <input
                  type="text"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="e.g. Athletica Brands USA"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                      <span>Committing Order...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check text-xs"></i>
                      <span>Commit Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
