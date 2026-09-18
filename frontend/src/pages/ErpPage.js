import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";

export default function ErpPage({ user }) {
  const [activeTab, setActiveTab] = useState("contracts"); // 'contracts' | 'materials' | 'workforce'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data States
  const [contracts, setContracts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [workforce, setWorkforce] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Edit Modal State for Workforce
  const [selectedDept, setSelectedDept] = useState(null);
  const [availableOperators, setAvailableOperators] = useState(10);
  const [updatingWf, setUpdatingWf] = useState(false);

  // New Material Modal
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    id: "",
    name: "",
    category: "Yarn",
    stock_on_hand: 1000,
    unit: "kg",
    unit_cost: 250,
    supplier: "Premier Spinning Mills Ltd",
    lead_time_days: 3
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cRes, mRes, wRes] = await Promise.all([
        api.get("/contracts"),
        api.get("/materials"),
        api.get("/workforce")
      ]);
      setContracts(cRes.data?.data || cRes.data || []);
      setMaterials(mRes.data?.data || mRes.data || []);
      setWorkforce(wRes.data?.data || wRes.data || []);
    } catch (err) {
      console.error("Error loading ERP resources:", err);
      setError("Failed to load ERP business datasets from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateWorkforce = async (e) => {
    e.preventDefault();
    if (!selectedDept) return;
    try {
      setUpdatingWf(true);
      await api.patch(`/workforce/${selectedDept.id}`, {
        available_operators: parseInt(availableOperators, 10)
      });
      setSelectedDept(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to update workforce capacity.");
    } finally {
      setUpdatingWf(false);
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    try {
      await api.post("/materials", newMaterial);
      setShowMaterialModal(false);
      setNewMaterial({
        id: "",
        name: "",
        category: "Yarn",
        stock_on_hand: 1000,
        unit: "kg",
        unit_cost: 250,
        supplier: "Premier Spinning Mills Ltd",
        lead_time_days: 3
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to create material record.");
    }
  };

  // Filtered lists
  const filteredContracts = contracts.filter((c) =>
    (c.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.order_id || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMaterials = materials.filter((m) =>
    (m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.supplier || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWorkforce = workforce.filter((w) =>
    (w.department || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.shift_lead || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderCol pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl text-primary tracking-tight">ReFlow</span>
            <span className="text-xs bg-primaryLight text-primary px-2 py-0.5 rounded font-semibold border border-plum-100">
              Unified ERP
            </span>
          </div>
          <h1 className="text-2xl font-bold text-textMain mt-1">
            Enterprise Resource Planning & Business Context
          </h1>
          <p className="text-sm text-textSub mt-1">
            Customer contracts with SLA delay penalties, live materials inventory feasibility, and shift workforce allocations.
          </p>
        </div>

        {/* Action Button & Search */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-textSub text-xs"></i>
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-bgMain border border-borderCol rounded-md focus:outline-none focus:border-primary w-48 transition-all"
            />
          </div>
          {activeTab === "materials" && user?.role === "MANAGER" && (
            <button
              onClick={() => setShowMaterialModal(true)}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <i className="fa-solid fa-plus"></i>
              Add Material
            </button>
          )}
          <button
            onClick={loadData}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="Refresh ERP Datasets"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? "animate-spin" : ""}`}></i>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-borderCol rounded-lg p-4 shadow-sm">
          <div className="text-xs font-semibold text-textSub uppercase tracking-wider">Active Customer Contracts</div>
          <div className="text-2xl font-extrabold text-textMain mt-1">
            {contracts.length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            <i className="fa-solid fa-file-contract mr-1"></i>
            Total value: ₹{contracts.reduce((acc, c) => acc + (c.contract_value || 0), 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-borderCol rounded-lg p-4 shadow-sm">
          <div className="text-xs font-semibold text-textSub uppercase tracking-wider">Inventory SKUs Tracked</div>
          <div className="text-2xl font-extrabold text-textMain mt-1">
            {materials.length}
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">
            <i className="fa-solid fa-boxes-stacked mr-1"></i>
            Total valuation: ₹{materials.reduce((acc, m) => acc + (m.stock_on_hand * m.unit_cost || 0), 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-borderCol rounded-lg p-4 shadow-sm">
          <div className="text-xs font-semibold text-textSub uppercase tracking-wider">Workforce Departments</div>
          <div className="text-2xl font-extrabold text-textMain mt-1">
            {workforce.length}
          </div>
          <div className="text-[11px] text-purple-600 font-medium mt-1">
            <i className="fa-solid fa-users mr-1"></i>
            {workforce.reduce((acc, w) => acc + (w.active_operators || 0), 0)} Active Operators on Shift
          </div>
        </div>

        <div className="bg-white border border-borderCol rounded-lg p-4 shadow-sm">
          <div className="text-xs font-semibold text-textSub uppercase tracking-wider">At-Risk Contracts (SLA)</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {contracts.filter((c) => c.status === "Approaching Deadline" || c.status === "Breached").length}
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">
            <i className="fa-solid fa-triangle-exclamation mr-1"></i>
            OR-Tools Protection Active
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-borderCol gap-8">
        <button
          onClick={() => setActiveTab("contracts")}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "contracts"
              ? "border-primary text-primary"
              : "border-transparent text-textSub hover:text-textMain"
          }`}
        >
          <i className="fa-solid fa-file-signature text-xs"></i>
          Customer Contracts & SLAs
          <span className="text-[10px] bg-bgMain text-textSub px-2 py-0.5 rounded-full border border-borderCol">
            {contracts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("materials")}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "materials"
              ? "border-primary text-primary"
              : "border-transparent text-textSub hover:text-textMain"
          }`}
        >
          <i className="fa-solid fa-warehouse text-xs"></i>
          Materials & Inventory (BOM)
          <span className="text-[10px] bg-bgMain text-textSub px-2 py-0.5 rounded-full border border-borderCol">
            {materials.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("workforce")}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "workforce"
              ? "border-primary text-primary"
              : "border-transparent text-textSub hover:text-textMain"
          }`}
        >
          <i className="fa-solid fa-people-carry-box text-xs"></i>
          Workforce & Shift Operations
          <span className="text-[10px] bg-bgMain text-textSub px-2 py-0.5 rounded-full border border-borderCol">
            {workforce.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Contracts & SLA Table */}
      {activeTab === "contracts" && (
        <div className="bg-white border border-borderCol rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-borderCol bg-bgMain flex justify-between items-center">
            <h3 className="text-sm font-bold text-textMain">Customer Commercial Contracts & SLA Penalties</h3>
            <span className="text-xs text-textSub">Feeds ReFlow OR-Tools Deadline Penalties</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bgMain text-textSub font-semibold border-b border-borderCol">
                <tr>
                  <th className="py-2.5 px-4">Contract ID</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Order Ref</th>
                  <th className="py-2.5 px-4">Delivery Deadline</th>
                  <th className="py-2.5 px-4">Contract Value</th>
                  <th className="py-2.5 px-4">Delay Penalty (SLA)</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderCol">
                {filteredContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-bgMain transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">{c.id}</td>
                    <td className="py-3 px-4 font-semibold text-textMain">{c.customer_name}</td>
                    <td className="py-3 px-4 font-mono text-textSub">{c.order_id || "ORD-1042"}</td>
                    <td className="py-3 px-4 text-textMain">{c.delivery_deadline || "2026-09-25 18:00"}</td>
                    <td className="py-3 px-4 font-bold text-textMain">₹{(c.contract_value || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-rose-600 font-semibold">
                      ₹{(c.penalty_per_hour_delay || 5000).toLocaleString()} / hr
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          c.status === "Breached"
                            ? "bg-rose-100 text-rose-800"
                            : c.status === "Approaching Deadline"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {c.status || "Safe"}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-6 text-textSub">
                      No contracts matching search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Materials & Inventory */}
      {activeTab === "materials" && (
        <div className="bg-white border border-borderCol rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-borderCol bg-bgMain flex justify-between items-center">
            <h3 className="text-sm font-bold text-textMain">Raw Material Inventory & Stock Feasibility</h3>
            <span className="text-xs text-textSub">Feeds ReFlow Order Feasibility & BOM Validation</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bgMain text-textSub font-semibold border-b border-borderCol">
                <tr>
                  <th className="py-2.5 px-4">SKU / ID</th>
                  <th className="py-2.5 px-4">Material Name</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Stock on Hand</th>
                  <th className="py-2.5 px-4">Allocated</th>
                  <th className="py-2.5 px-4">Available</th>
                  <th className="py-2.5 px-4">Unit Cost</th>
                  <th className="py-2.5 px-4">Supplier</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderCol">
                {filteredMaterials.map((m) => {
                  const avail = (m.stock_on_hand || 0) - (m.allocated_quantity || 0);
                  const isLow = avail < (m.reorder_level || 500);
                  return (
                    <tr key={m.id} className="hover:bg-bgMain transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{m.id}</td>
                      <td className="py-3 px-4 font-semibold text-textMain">{m.name}</td>
                      <td className="py-3 px-4 text-textSub">{m.category}</td>
                      <td className="py-3 px-4 font-bold text-textMain">
                        {(m.stock_on_hand || 0).toLocaleString()} {m.unit}
                      </td>
                      <td className="py-3 px-4 text-textSub">
                        {(m.allocated_quantity || 0).toLocaleString()} {m.unit}
                      </td>
                      <td className={`py-3 px-4 font-extrabold ${avail > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                        {avail.toLocaleString()} {m.unit}
                      </td>
                      <td className="py-3 px-4 text-textMain">₹{m.unit_cost} / {m.unit}</td>
                      <td className="py-3 px-4 text-textSub">{m.supplier}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isLow ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isLow ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredMaterials.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center py-6 text-textSub">
                      No materials matching search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Workforce & Shifts */}
      {activeTab === "workforce" && (
        <div className="bg-white border border-borderCol rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-borderCol bg-bgMain flex justify-between items-center">
            <h3 className="text-sm font-bold text-textMain">Departmental Workforce & Shift Capacity</h3>
            <span className="text-xs text-textSub">Feeds ReFlow Machine Labor Allocation & Suitability</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bgMain text-textSub font-semibold border-b border-borderCol">
                <tr>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4">Shift Lead</th>
                  <th className="py-2.5 px-4">Shift Timing</th>
                  <th className="py-2.5 px-4">Active Operators</th>
                  <th className="py-2.5 px-4">Available Operators</th>
                  <th className="py-2.5 px-4">Skill Level</th>
                  <th className="py-2.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderCol">
                {filteredWorkforce.map((w) => (
                  <tr key={w.id} className="hover:bg-bgMain transition-colors">
                    <td className="py-3 px-4 font-bold text-textMain">{w.department}</td>
                    <td className="py-3 px-4 font-medium text-textSub">{w.shift_lead}</td>
                    <td className="py-3 px-4 text-textSub">{w.shift_time}</td>
                    <td className="py-3 px-4 font-bold text-primary">{w.active_operators} Staff</td>
                    <td className="py-3 px-4 font-extrabold text-emerald-700">{w.available_operators} Available</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-800 rounded border border-blue-200">
                        {w.skill_level}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {(user?.role === "MANAGER" || user?.role === "SUPERVISOR") && (
                        <button
                          onClick={() => {
                            setSelectedDept(w);
                            setAvailableOperators(w.available_operators);
                          }}
                          className="btn btn-secondary text-[11px] py-1 px-2.5"
                        >
                          <i className="fa-solid fa-pen-to-square mr-1"></i>
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredWorkforce.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-6 text-textSub">
                      No departments matching search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Workforce Modal */}
      {selectedDept && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-borderCol shadow-xl max-w-md w-full p-6 animate-scaleIn">
            <h3 className="text-lg font-bold text-textMain">Adjust Department Capacity</h3>
            <p className="text-xs text-textSub mt-1">
              Modifying available operators directly impacts ReFlow OR-Tools worker availability constraints.
            </p>

            <form onSubmit={handleUpdateWorkforce} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-textSub block mb-1">Department</label>
                <input
                  type="text"
                  disabled
                  value={selectedDept.department}
                  className="w-full text-xs p-2 bg-bgMain border border-borderCol rounded font-semibold text-textMain"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-textSub block mb-1">
                  Available Operators (0 - {selectedDept.active_operators})
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedDept.active_operators + 10}
                  value={availableOperators}
                  onChange={(e) => setAvailableOperators(e.target.value)}
                  className="w-full text-xs p-2 border border-borderCol rounded focus:outline-none focus:border-primary font-bold text-textMain"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-borderCol">
                <button
                  type="button"
                  onClick={() => setSelectedDept(null)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingWf}
                  className="btn btn-primary text-xs"
                >
                  {updatingWf ? "Saving..." : "Save Capacity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-borderCol shadow-xl max-w-lg w-full p-6 animate-scaleIn">
            <h3 className="text-lg font-bold text-textMain">Add Raw Material Inventory SKU</h3>
            <form onSubmit={handleCreateMaterial} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-textSub block mb-1">Material SKU</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MAT-COT-09"
                    value={newMaterial.id}
                    onChange={(e) => setNewMaterial({ ...newMaterial, id: e.target.value })}
                    className="w-full text-xs p-2 border border-borderCol rounded focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-textSub block mb-1">Category</label>
                  <select
                    value={newMaterial.category}
                    onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
                    className="w-full text-xs p-2 border border-borderCol rounded focus:outline-none focus:border-primary"
                  >
                    <option value="Yarn">Yarn</option>
                    <option value="Dyes & Chemicals">Dyes & Chemicals</option>
                    <option value="Fabric">Fabric</option>
                    <option value="Trims & Accessories">Trims & Accessories</option>
                    <option value="Packaging">Packaging</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-textSub block mb-1">Material Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100% Combed Cotton Single Jersey 200 GSM"
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                  className="w-full text-xs p-2 border border-borderCol rounded focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-textSub block mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newMaterial.stock_on_hand}
                    onChange={(e) => setNewMaterial({ ...newMaterial, stock_on_hand: parseFloat(e.target.value) })}
                    className="w-full text-xs p-2 border border-borderCol rounded focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-textSub block mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={newMaterial.unit}
                    onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                    className="w-full text-xs p-2 border border-borderCol rounded focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-textSub block mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newMaterial.unit_cost}
                    onChange={(e) => setNewMaterial({ ...newMaterial, unit_cost: parseFloat(e.target.value) })}
                    className="w-full text-xs p-2 border border-borderCol rounded focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-textSub block mb-1">Supplier</label>
                <input
                  type="text"
                  required
                  value={newMaterial.supplier}
                  onChange={(e) => setNewMaterial({ ...newMaterial, supplier: e.target.value })}
                  className="w-full text-xs p-2 border border-borderCol rounded focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-borderCol">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
