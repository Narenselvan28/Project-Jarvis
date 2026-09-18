import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function MaintenanceInvoiceModal({ workOrder, machine, onClose, onSuccess }) {
  const [servicePersons, setServicePersons] = useState([]);
  const [selectedSpId, setSelectedSpId] = useState("SP-01");
  const [problemSummary, setProblemSummary] = useState(workOrder?.fault_type || "Mechanical Component Malfunction");
  const [actionTaken, setActionTaken] = useState("");
  const [labourCost, setLabourCost] = useState(1500);
  const [partsCost, setPartsCost] = useState(2800);
  const [additionalCost, setAdditionalCost] = useState(200);
  const [downtimeHours, setDowntimeHours] = useState(2.5);
  const [partsUsed, setPartsUsed] = useState("OEM High-Speed Bearing & Hydraulic Seal");
  const [remarks, setRemarks] = useState("Diagnostic inspection passed, test run completed successfully.");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/maintenance/service-persons")
      .then((res) => {
        const sps = res.data?.data || res.data || [];
        setServicePersons(sps);
        if (sps.length > 0 && !selectedSpId) {
          setSelectedSpId(sps[0].id);
        }
      })
      .catch((err) => console.error("Error loading service persons:", err));
  }, []);

  const totalCost = (parseFloat(labourCost) || 0) + (parseFloat(partsCost) || 0) + (parseFloat(additionalCost) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const activeSp = servicePersons.find((s) => s.id === selectedSpId) || {
      id: "SP-01",
      name: "Vikram Patel"
    };

    const payload = {
      work_order_id: workOrder?.id || `WO-${machine?.id || "CUT-02"}`,
      machine_id: machine?.id || workOrder?.machine_id || "CUT-02",
      service_person_id: activeSp.id,
      service_person_name: activeSp.name,
      problem_summary: problemSummary,
      action_taken: actionTaken || "Replaced defective assembly, calibrated tolerances, and executed thermal stress test.",
      labour_cost: parseFloat(labourCost) || 0,
      parts_cost: parseFloat(partsCost) || 0,
      additional_cost: parseFloat(additionalCost) || 0,
      downtime_hours: parseFloat(downtimeHours) || 1.0,
      parts_used: partsUsed,
      remarks: remarks
    };

    try {
      const res = await api.post("/maintenance/invoices", payload);
      if (onSuccess) {
        onSuccess(res.data?.data || res.data);
      }
      onClose();
    } catch (err) {
      console.error("Error generating invoice:", err);
      setError(err.response?.data?.error?.message || err.response?.data?.error || "Failed to generate invoice and complete repair.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-borderCol shadow-2xl max-w-xl w-full p-6 animate-scaleIn max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-borderCol pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-primary">ReFlow Enterprise Maintenance</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                Repair Completion & Billing
              </span>
            </div>
            <h2 className="text-lg font-bold text-textMain mt-1">
              Generate Service Invoice — {machine?.id || workOrder?.machine_id || "Machine"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-textSub hover:text-textMain p-1 rounded hover:bg-bgMain transition-colors"
          >
            <i className="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
            <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Machine & Technician Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-textSub block mb-1">Target Machine ID</label>
              <input
                type="text"
                disabled
                value={machine?.id || workOrder?.machine_id || "CUT-02"}
                className="w-full p-2 bg-bgMain border border-borderCol rounded font-mono font-bold text-textMain"
              />
            </div>
            <div>
              <label className="font-semibold text-textSub block mb-1">Assigned Service Technician</label>
              <select
                value={selectedSpId}
                onChange={(e) => setSelectedSpId(e.target.value)}
                className="w-full p-2 bg-white border border-borderCol rounded focus:outline-none focus:border-primary font-medium text-textMain"
              >
                {servicePersons.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} ({sp.id} • {sp.specialization})
                  </option>
                ))}
                {servicePersons.length === 0 && (
                  <option value="SP-01">Vikram Patel (SP-01 • Mechanical Lead)</option>
                )}
              </select>
            </div>
          </div>

          {/* Problem & Action */}
          <div>
            <label className="font-semibold text-textSub block mb-1">Problem Summary</label>
            <input
              type="text"
              required
              value={problemSummary}
              onChange={(e) => setProblemSummary(e.target.value)}
              className="w-full p-2 border border-borderCol rounded focus:outline-none focus:border-primary text-textMain"
            />
          </div>

          <div>
            <label className="font-semibold text-textSub block mb-1">Corrective Action Taken</label>
            <textarea
              required
              rows="2"
              placeholder="e.g. Replaced defective hydraulic valve, flushed pressure lines, and re-aligned feeder roller."
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              className="w-full p-2 border border-borderCol rounded focus:outline-none focus:border-primary text-textMain"
            />
          </div>

          {/* Parts Used & Downtime */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-textSub block mb-1">Parts / Components Replaced</label>
              <input
                type="text"
                value={partsUsed}
                onChange={(e) => setPartsUsed(e.target.value)}
                className="w-full p-2 border border-borderCol rounded focus:outline-none focus:border-primary text-textMain"
              />
            </div>
            <div>
              <label className="font-semibold text-textSub block mb-1">Actual Downtime (Hours)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={downtimeHours}
                onChange={(e) => setDowntimeHours(e.target.value)}
                className="w-full p-2 border border-borderCol rounded focus:outline-none focus:border-primary text-textMain font-mono font-bold"
              />
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-bgMain p-3.5 rounded-lg border border-borderCol space-y-2.5">
            <div className="font-bold text-textMain text-[11px] uppercase tracking-wider flex justify-between">
              <span>Cost & Billing Breakdown</span>
              <span className="text-primary font-bold">Total: ₹{totalCost.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-textSub block mb-0.5">Labour (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={labourCost}
                  onChange={(e) => setLabourCost(e.target.value)}
                  className="w-full p-1.5 bg-white border border-borderCol rounded text-textMain font-mono font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] text-textSub block mb-0.5">Parts (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={partsCost}
                  onChange={(e) => setPartsCost(e.target.value)}
                  className="w-full p-1.5 bg-white border border-borderCol rounded text-textMain font-mono font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] text-textSub block mb-0.5">Additional (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={additionalCost}
                  onChange={(e) => setAdditionalCost(e.target.value)}
                  className="w-full p-1.5 bg-white border border-borderCol rounded text-textMain font-mono font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="font-semibold text-textSub block mb-1">Technician Sign-Off Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-2 border border-borderCol rounded focus:outline-none focus:border-primary text-textMain"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-borderCol">
            <div className="text-[11px] text-textSub">
              Restores machine state to <span className="text-emerald-700 font-bold">AVAILABLE</span> and records audit trail.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary text-xs flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    Generating Invoice...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-file-invoice-dollar"></i>
                    Complete Repair & Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
