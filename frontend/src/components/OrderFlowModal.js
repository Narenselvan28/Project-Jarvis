import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function OrderFlowModal({ orderId, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      setLoading(true);
      api.get(`/orders/${orderId}`)
        .then((res) => setOrder(res.data.order))
        .catch((err) => console.error("Error loading order:", err))
        .finally(() => setLoading(false));
    }
  }, [orderId]);

  if (!orderId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "monospace", color: "#38bdf8" }}>
                {orderId}
              </span>
              {order && (
                <span className={`status-pill status-${order.status.toLowerCase()}`}>
                  {order.status}
                </span>
              )}
            </div>
            {order && (
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                {order.product_name} • Priority: <strong style={{ color: order.priority === "URGENT" ? "#ef4444" : "#f59e0b" }}>{order.priority}</strong> • Deadline: {order.deadline_hours}h
              </div>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading manufacturing route...</div>
          ) : order ? (
            <div>
              <div style={{ fontSize: "0.78rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
                End-to-End Production Sequence
              </div>

              {/* Linear Process Route */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Stage 0: Raw Material */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #334155", color: "#94a3b8", fontSize: "0.75rem" }}>
                    IN
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#cbd5e1" }}>Raw Material Ingestion</div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Batch Size: {order.quantity} units • Allocated</div>
                  </div>
                </div>

                {/* Operations 1 to 5 */}
                {order.operations?.map((op, idx) => {
                  const isBlocked = op.status === "BLOCKED";
                  const isReassigned = op.status === "REASSIGNED";
                  const isCompleted = op.status === "COMPLETED";
                  const isRunning = op.status === "RUNNING";

                  let nodeBorder = "#334155";
                  let badgeColor = "#64748b";
                  if (isBlocked) { nodeBorder = "#ef4444"; badgeColor = "#ef4444"; }
                  else if (isReassigned) { nodeBorder = "#14b8a6"; badgeColor = "#14b8a6"; }
                  else if (isCompleted) { nodeBorder = "#10b981"; badgeColor = "#10b981"; }
                  else if (isRunning) { nodeBorder = "#06b6d4"; badgeColor = "#06b6d4"; }

                  return (
                    <React.Fragment key={op.id || idx}>
                      <div style={{ marginLeft: "15px", height: "14px", borderLeft: `2px ${isBlocked ? "dashed #ef4444" : "solid #1e2e4a"}` }} />

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: isBlocked ? "rgba(239, 68, 68, 0.08)" : (isReassigned ? "rgba(20, 184, 166, 0.08)" : "#0f172a"),
                          border: `1px solid ${nodeBorder}`,
                          padding: "0.75rem 1rem",
                          borderRadius: "4px"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background: "#131d33",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "monospace",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              color: badgeColor,
                              border: `1.5px solid ${badgeColor}`
                            }}
                          >
                            {op.assigned_machine_id || "TBD"}
                          </div>

                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>
                              Step {op.sequence}: {op.process_name}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                              Est: {op.processing_time_min} min • Scheduled: {op.scheduled_start_min}m - {op.scheduled_end_min}m
                              {op.original_machine_id && (
                                <span style={{ color: "#2dd4bf", marginLeft: "0.5rem" }}>
                                  (Reassigned from {op.original_machine_id})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className={`status-pill status-${op.status.toLowerCase()}`}>
                          {op.status}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* Stage End: Finished Product */}
                <div style={{ marginLeft: "15px", height: "14px", borderLeft: "2px solid #1e2e4a" }} />
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #334155", color: "#10b981", fontSize: "0.75rem" }}>
                    OUT
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#cbd5e1" }}>Finished Product Warehouse</div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Automated Dispatch Queue</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>Order not found.</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
