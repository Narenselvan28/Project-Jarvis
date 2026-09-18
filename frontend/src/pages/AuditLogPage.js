import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("ALL");
  const [filterEntity, setFilterEntity] = useState("ALL");
  const [error, setError] = useState(null);

  const fetchLogs = () => {
    setLoading(true);
    setError(null);
    const params = { limit: 100 };
    if (filterAction !== "ALL") params.action = filterAction;
    if (filterEntity !== "ALL") params.entity = filterEntity;

    api.get("/audit", { params })
      .then((res) => setLogs(res.data.audit_logs || []))
      .catch((err) => {
        console.error("Error loading audit logs:", err);
        setError("Failed to load audit records from backend.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction, filterEntity]);

  const getActionBadgeClass = (action) => {
    if (action.includes("FAIL") || action.includes("REJECT") || action.includes("DISRUPT")) {
      return "status-pill status-delayed";
    }
    if (action.includes("APPROV") || action.includes("REPAIR") || action.includes("VERIF")) {
      return "status-pill status-running";
    }
    if (action.includes("REASSIGN") || action.includes("OPTIM")) {
      return "status-pill status-reassigned";
    }
    return "status-pill status-idle";
  };

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-navy)" }}>ReFlow</span>
            <span style={{ fontSize: "0.82rem", color: "var(--color-slate-400)", fontWeight: 600 }}>• Meerpaarvai Trail</span>
          </div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-slate-900)", marginTop: "0.2rem" }}>
            Operational Audit & Governance Trail
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--color-slate-500)", marginTop: "0.15rem" }}>
            Immutable enterprise audit log of disruptions, recovery authorizations, machine lifecycle transitions, and optimization decisions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="btn btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}
        >
          <span>↻ Refresh Stream</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--color-slate-200)",
        borderRadius: "var(--radius-md)",
        padding: "0.85rem 1.25rem",
        marginBottom: "1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-slate-600)" }}>Filter Action:</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{
              padding: "0.35rem 0.65rem",
              fontSize: "0.78rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-slate-300)",
              background: "#ffffff",
              color: "var(--color-slate-800)"
            }}
          >
            <option value="ALL">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="SIGNUP">SIGNUP</option>
            <option value="ORDER_CREATED">ORDER_CREATED</option>
            <option value="MACHINE_STATUS_CHANGED">MACHINE_STATUS_CHANGED</option>
            <option value="DISRUPTION_CREATED">DISRUPTION_CREATED</option>
            <option value="OPTIMIZATION_COMPLETED">OPTIMIZATION_COMPLETED</option>
            <option value="RECOVERY_APPROVED">RECOVERY_APPROVED</option>
            <option value="RECOVERY_REJECTED">RECOVERY_REJECTED</option>
            <option value="MACHINE_REPAIRED">MACHINE_REPAIRED</option>
            <option value="MACHINE_VERIFIED">MACHINE_VERIFIED</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-slate-600)" }}>Entity Target:</label>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            style={{
              padding: "0.35rem 0.65rem",
              fontSize: "0.78rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-slate-300)",
              background: "#ffffff",
              color: "var(--color-slate-800)"
            }}
          >
            <option value="ALL">All Entities</option>
            <option value="USER">USER</option>
            <option value="MACHINE">MACHINE</option>
            <option value="ORDER">ORDER</option>
            <option value="DISRUPTION">DISRUPTION</option>
            <option value="SCHEDULE">SCHEDULE</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
          </select>
        </div>

        <div style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--color-slate-500)", fontWeight: 500 }}>
          Displaying {logs.length} events
        </div>
      </div>

      {/* Main Table */}
      <div className="panel" style={{ background: "#ffffff", border: "1px solid var(--color-slate-200)", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
        <div style={{
          padding: "0.85rem 1.25rem",
          borderBottom: "1px solid var(--color-slate-200)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--color-slate-50)"
        }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-slate-800)" }}>System Event Stream</span>
          <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--color-slate-500)" }}>
            Source: MongoDB audit_logs
          </span>
        </div>

        {error && (
          <div style={{ padding: "1rem", background: "#fef2f2", color: "#991b1b", fontSize: "0.85rem", borderBottom: "1px solid #fecaca" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-slate-500)" }}>
            Loading audit records...
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tech-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ background: "var(--color-slate-100)", borderBottom: "1px solid var(--color-slate-200)", textAlign: "left" }}>
                  <th style={{ padding: "0.65rem 1rem", color: "var(--color-slate-600)", fontWeight: 600 }}>Timestamp (UTC)</th>
                  <th style={{ padding: "0.65rem 1rem", color: "var(--color-slate-600)", fontWeight: 600 }}>Actor & Role</th>
                  <th style={{ padding: "0.65rem 1rem", color: "var(--color-slate-600)", fontWeight: 600 }}>Action</th>
                  <th style={{ padding: "0.65rem 1rem", color: "var(--color-slate-600)", fontWeight: 600 }}>Entity Target</th>
                  <th style={{ padding: "0.65rem 1rem", color: "var(--color-slate-600)", fontWeight: 600 }}>Event Payload / Metadata</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--color-slate-400)", padding: "2.5rem" }}>
                      No audit records found matching selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--color-slate-100)" }}>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "var(--color-slate-500)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        {log.timestamp ? log.timestamp.replace("T", " ").split(".")[0] : "-"}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600, color: "var(--color-slate-800)" }}>{log.actor || log.username}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--color-slate-500)", textTransform: "uppercase" }}>{log.role}</div>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
                        <span className={getActionBadgeClass(log.action)} style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "var(--color-navy)", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {log.entity_type}:{log.entity_id}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", fontSize: "0.75rem", color: "var(--color-slate-600)", fontFamily: "monospace", maxWidth: "450px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.details && Object.keys(log.details).length > 0
                          ? JSON.stringify(log.details)
                          : log.after
                          ? `after: ${JSON.stringify(log.after)}`
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
