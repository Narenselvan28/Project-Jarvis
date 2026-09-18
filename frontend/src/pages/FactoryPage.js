import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { socketService } from "../services/socket";
import DemoToolbar from "../components/DemoToolbar";
import FactoryMap from "../components/FactoryMap";
import MachineDetailModal from "../components/MachineDetailModal";
import OrderFlowModal from "../components/OrderFlowModal";
import DisruptionModal from "../components/DisruptionModal";

export default function FactoryPage({ user }) {
  const [factoryData, setFactoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [inspectOrderId, setInspectOrderId] = useState(null);
  const [showDisruptionModal, setShowDisruptionModal] = useState(false);
  const [disruptionTargetMachine, setDisruptionTargetMachine] = useState("M04");
  const [recentEvents, setRecentEvents] = useState([
    { id: 1, time: "10:42", text: "Production line initialized with 3 parallel lanes.", type: "info" }
  ]);

  const loadFactoryData = useCallback(async () => {
    try {
      const res = await api.get("/factory");
      setFactoryData(res.data);
    } catch (err) {
      console.error("Error loading factory overview:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFactoryData();

    // Connect Socket.IO
    socketService.connect();

    const addEvent = (text, type = "info") => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      setRecentEvents((prev) => [{ id: Date.now(), time: timeStr, text, type }, ...prev.slice(0, 9)]);
    };

    socketService.on("machine_status_changed", (data) => {
      addEvent(`Machine ${data.id} status changed to ${data.status}`, data.status === "FAILED" ? "danger" : "info");
      loadFactoryData();
    });

    socketService.on("machine_failed", (data) => {
      addEvent(`ALERT: Machine ${data.machine_id} FAILED (${data.failure_type}) - ${data.affected_orders_count} orders impacted`, "danger");
      loadFactoryData();
    });

    socketService.on("machine_repaired", (data) => {
      addEvent(`RECOVERY: Machine ${data.id} restored to AVAILABLE`, "success");
      loadFactoryData();
    });

    socketService.on("schedule_updated", () => {
      addEvent("Schedule re-optimized by Google OR-Tools CP-SAT engine", "success");
      loadFactoryData();
    });

    socketService.on("maintenance_created", (data) => {
      addEvent(`Work Order ${data.work_order_number} generated for ${data.machine_id}`, "warning");
    });

    // Fallback polling every 5 seconds
    const interval = setInterval(loadFactoryData, 5000);

    return () => {
      clearInterval(interval);
      socketService.off("machine_status_changed");
      socketService.off("machine_failed");
      socketService.off("machine_repaired");
      socketService.off("schedule_updated");
      socketService.off("maintenance_created");
    };
  }, [loadFactoryData]);

  const handleSimulateDisruptionClick = (machine) => {
    setDisruptionTargetMachine(machine ? machine.id : "CUT-02");
    setShowDisruptionModal(true);
  };

  const handleSelectMachine = (m) => {
    setSelectedMachine(m);
  };

  const handleDemoAction = (actionType) => {
    loadFactoryData();
  };

  if (loading && !factoryData) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", fontFamily: "monospace" }}>
        INITIALIZING 2D FACTORY CONTROL SYSTEM...
      </div>
    );
  }

  const machines = factoryData?.machines || [];
  const lanes = factoryData?.lanes || [];
  const activeOrders = factoryData?.active_orders || [];
  const activeDisruptions = factoryData?.active_disruptions || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
      {/* Demo Mode Action Toolbar (Manager Only) */}
      <DemoToolbar
        isManager={user?.role === "MANAGER"}
        onActionCompleted={handleDemoAction}
      />

      {/* Main 2D Factory Interactive View */}
      <div className="factory-layout-container">
        {/* SVG Canvas */}
        <FactoryMap
          lanes={lanes}
          machines={machines}
          activeOrders={activeOrders}
          selectedMachine={selectedMachine}
          onSelectMachine={handleSelectMachine}
          onSelectOrder={(ordId) => setInspectOrderId(ordId)}
        />

        {/* Slide-out Machine Detail Drawer (when machine is clicked) */}
        {selectedMachine && (
          <MachineDetailModal
            machine={selectedMachine}
            onClose={() => setSelectedMachine(null)}
            onSimulateFailure={(m) => handleSimulateDisruptionClick(m)}
            onViewOrder={(ordId) => setInspectOrderId(ordId)}
          />
        )}

        {/* Bottom Operational Event Ticker */}
        <div className="factory-bottom-tray">
          <div className="bottom-tray-header">
            <span>LIVE OPERATIONAL TIMELINE & DISRUPTION AUDIT</span>
            <span>
              Machines: <strong>{machines.length}</strong> • 
              Running: <strong style={{ color: "#22d3ee" }}>{factoryData?.running_count || 0}</strong> • 
              Failed: <strong style={{ color: "#f87171" }}>{factoryData?.failed_count || 0}</strong> • 
              Active Disruptions: <strong style={{ color: activeDisruptions.length > 0 ? "#ef4444" : "#10b981" }}>{activeDisruptions.length}</strong>
            </span>
          </div>

          <div className="bottom-tray-content">
            {recentEvents.map((evt) => (
              <div key={evt.id} className="event-ticker-item">
                <span style={{ color: "#64748b", fontFamily: "monospace", fontSize: "0.7rem" }}>[{evt.time}]</span>
                <span
                  style={{
                    color: evt.type === "danger" ? "#f87171" : (evt.type === "success" ? "#34d399" : (evt.type === "warning" ? "#fbbf24" : "#cbd5e1"))
                  }}
                >
                  {evt.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disruption Simulator Modal */}
      {showDisruptionModal && (
        <DisruptionModal
          machines={machines}
          lanes={lanes}
          defaultMachineId={disruptionTargetMachine}
          onClose={() => setShowDisruptionModal(false)}
          onSuccess={() => {
            loadFactoryData();
          }}
        />
      )}

      {/* Order Journey Flow Modal */}
      {inspectOrderId && (
        <OrderFlowModal
          orderId={inspectOrderId}
          onClose={() => setInspectOrderId(null)}
        />
      )}
    </div>
  );
}
