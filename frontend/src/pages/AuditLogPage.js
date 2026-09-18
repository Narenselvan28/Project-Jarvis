import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit-logs")
      .then((res) => setLogs(res.data.audit_logs || []))
      .catch((err) => console.error("Error loading audit logs:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Operational Audit & Governance Trail
        </h1>
        <p style={{ fontSize: "0.8rem", color: "#94a3b8", fontFamily: "monospace", marginTop: "0.2rem" }}>
          Immutable log of disruptions, machine state transitions, maintenance interventions, and optimization runs
        </p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">System Event Stream</span>
          <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#94a3b8" }}>
            Last {logs.length} Recorded Events
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading audit records...</div>
        ) : (
          <table className="tech-table">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Operator</th>
                <th>Action Identifier</th>
                <th>Entity Target</th>
                <th>Event Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                    No audit records registered yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: "0.75rem" }}>
                      {log.created_at ? log.created_at.replace("T", " ").split(".")[0] : "-"}
                    </td>
                    <td style={{ fontWeight: 700, color: "#38bdf8" }}>{log.username}</td>
                    <td>
                      <span className="status-pill status-available" style={{ fontSize: "0.68rem" }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace" }}>{log.entity_type}:{log.entity_id}</td>
                    <td style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
