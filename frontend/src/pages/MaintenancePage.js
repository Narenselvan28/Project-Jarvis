import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function MaintenancePage({ user }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWO, setSelectedWO] = useState(null);
  const [repairNotes, setRepairNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/maintenance");
      setWorkOrders(res.data.work_orders || []);
    } catch (err) {
      console.error("Error loading maintenance work orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const handleUpdateStatus = async (woId, newStatus) => {
    try {
      setUpdating(true);
      await api.patch(`/maintenance/${woId}`, {
        status: newStatus,
        notes: repairNotes
      });
      setRepairNotes("");
      setSelectedWO(null);
      await loadWorkOrders();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update work order status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1300px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Maintenance & Service Engineering
          </h1>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", fontFamily: "monospace", marginTop: "0.2rem" }}>
            Work order tracking, fault remediation, and machine verification workflow
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading maintenance queue...</div>
      ) : (
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Active Work Order Queue</span>
            <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#94a3b8" }}>
              Total Orders: {workOrders.length}
            </span>
          </div>

          <table className="tech-table">
            <thead>
              <tr>
                <th>Work Order #</th>
                <th>Target Machine</th>
                <th>Fault Classification</th>
                <th>Priority</th>
                <th>Current Status</th>
                <th>Assigned Technician</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                    No active maintenance work orders. All factory machinery operational.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => {
                  const isOpen = wo.status === "OPEN";
                  const isInProgress = wo.status === "IN_PROGRESS";
                  const isRepaired = wo.status === "REPAIRED";
                  const isVerified = wo.status === "VERIFIED";

                  return (
                    <tr key={wo.id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#38bdf8" }}>
                        {wo.work_order_number}
                      </td>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                        {wo.machine_id} ({wo.lane_id})
                      </td>
                      <td>{wo.fault_type}</td>
                      <td>
                        <span style={{ color: wo.priority === "URGENT" ? "#ef4444" : "#f59e0b", fontWeight: 700 }}>
                          {wo.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill status-${wo.status.toLowerCase()}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td>{wo.assigned_to || "Unassigned"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          {isOpen && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdateStatus(wo.id, "IN_PROGRESS")}
                              disabled={updating}
                            >
                              Accept Task
                            </button>
                          )}

                          {isInProgress && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => setSelectedWO(wo)}
                              disabled={updating}
                            >
                              Complete Repair
                            </button>
                          )}

                          {isRepaired && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdateStatus(wo.id, "VERIFIED")}
                              disabled={updating}
                            >
                              Verify & Certify
                            </button>
                          )}

                          {isVerified && (
                            <span style={{ color: "#34d399", fontSize: "0.75rem", fontFamily: "monospace" }}>
                              READY FOR SERVICE
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Repair Notes Modal */}
      {selectedWO && (
        <div className="modal-overlay" onClick={() => setSelectedWO(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontWeight: 700 }}>
                Complete Repair: {selectedWO.work_order_number} ({selectedWO.machine_id})
              </div>
              <button className="close-btn" onClick={() => setSelectedWO(null)}>×</button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.75rem" }}>
                Enter technician diagnosis, parts replaced, and verification notes:
              </p>
              <textarea
                rows="4"
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                placeholder="e.g. Replaced hydraulic seals and calibrated spindle alignment within 0.002mm..."
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "#0b1220",
                  border: "1px solid #243452",
                  color: "#f8fafc",
                  borderRadius: "4px",
                  fontSize: "0.82rem"
                }}
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedWO(null)}>
                Cancel
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={() => handleUpdateStatus(selectedWO.id, "REPAIRED")}
                disabled={updating}
              >
                Mark Repaired
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
