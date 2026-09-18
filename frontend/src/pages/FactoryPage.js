import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { socketService } from "../services/socket";
import LanesView from "../components/LanesView";
import OrderView from "../components/OrderView";
import MachineDetailModal from "../components/MachineDetailModal";
import OrderDetailsModal from "../components/OrderDetailsModal";
import DisruptionModal from "../components/DisruptionModal";

export default function FactoryPage({ user }) {
  const [activeView, setActiveView] = useState("LANES"); // 'LANES' | 'ORDERS'
  const [factoryData, setFactoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [inspectOrderId, setInspectOrderId] = useState(null);
  const [showDisruptionModal, setShowDisruptionModal] = useState(false);
  const [disruptionTargetMachine, setDisruptionTargetMachine] = useState("CUT-02");
  const [recentEvents, setRecentEvents] = useState([
    { id: 1, time: "10:42", text: "Production line active across 3 parallel lanes.", type: "info" }
  ]);

  const loadFactoryData = useCallback(async () => {
    try {
      const res = await api.get("/factory");
      const payload = res.data?.data || res.data;
      setFactoryData(payload);
    } catch (err) {
      console.error("Error loading factory overview:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFactoryData();

    // Connect Socket.IO for live shopfloor updates (Section 35)
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
      addEvent("Schedule re-assigned by Google OR-Tools CP-SAT engine", "success");
      loadFactoryData();
    });

    socketService.on("maintenance_created", (data) => {
      addEvent(`Work Order ${data.work_order_number || data.id} created for ${data.machine_id}`, "warning");
      loadFactoryData();
    });

    return () => {
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

  const handleInspectMachineById = (machId) => {
    const m = (factoryData?.machines || []).find((item) => item.id === machId);
    if (m) {
      setSelectedMachine(m);
    }
  };

  const machines = factoryData?.machines || [];
  const lanes = factoryData?.lanes || [];
  const processes = factoryData?.processes || [];
  const activeOrders = factoryData?.active_orders || [];
  const activeDisruptions = factoryData?.active_disruptions || [];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#F8FAFC]">
      {/* FACTORY HEADER & VIEW TOGGLE (Section 11) */}
      <div className="h-14 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0">
        {/* VIEW 1 / VIEW 2 TAB SWITCHER */}
        <div className="view-toggle-container">
          <button
            onClick={() => setActiveView("LANES")}
            className={`view-toggle-btn ${activeView === "LANES" ? "active" : ""}`}
          >
            <i className="fa-solid fa-network-wired text-xs"></i>
            <span>LANES VIEW (Iyandhiram / Flow)</span>
          </button>

          <button
            onClick={() => setActiveView("ORDERS")}
            className={`view-toggle-btn ${activeView === "ORDERS" ? "active" : ""}`}
          >
            <i className="fa-solid fa-boxes-stacked text-xs"></i>
            <span>ORDER VIEW (Aanaigal / Operations)</span>
          </button>
        </div>

        {/* Quick Disruption Action Button (Available to Manager) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSimulateDisruptionClick(null)}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <i className="fa-solid fa-triangle-exclamation text-xs"></i>
            <span>Simulate Disruption</span>
          </button>

          <div className="h-4 w-px bg-slate-200"></div>

          <div className="text-xs text-slate-500 font-mono hidden md:flex items-center gap-3">
            <span>
              Running: <strong className="text-emerald-700">{factoryData?.running_count || 0}</strong>
            </span>
            <span>
              Failed: <strong className={factoryData?.failed_count > 0 ? "text-red-700 font-bold" : "text-slate-700"}>{factoryData?.failed_count || 0}</strong>
            </span>
            <span>
              Disruptions: <strong className={activeDisruptions.length > 0 ? "text-red-700 font-bold" : "text-slate-700"}>{activeDisruptions.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* MAIN VIEW CONTENT */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {loading && !factoryData ? (
          <div className="py-16 text-center text-xs text-[#64748B] font-mono">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i>
            Initializing 2D Factory Operations Engine...
          </div>
        ) : activeView === "LANES" ? (
          /* VIEW 1: LANES VIEW (Deterministic Grid) */
          <LanesView
            lanes={lanes}
            processes={processes}
            machines={machines}
            onSelectMachine={(m) => setSelectedMachine(m)}
          />
        ) : (
          /* VIEW 2: ORDER VIEW (Order-Centric Operations) */
          <OrderView
            orders={activeOrders}
            onSelectOrder={(ordId) => setInspectOrderId(ordId)}
          />
        )}
      </div>

      {/* BOTTOM OPERATIONAL TIMELINE TRAY */}
      <div className="factory-bottom-tray">
        <div className="bottom-tray-header">
          <span>LIVE TELEMETRY & DISRUPTION AUDIT TIMELINE</span>
          <span className="font-mono text-[11px] text-slate-500">
            Total Machines: {machines.length} • Active Jobs: {activeOrders.length}
          </span>
        </div>

        <div className="bottom-tray-content">
          {recentEvents.map((evt) => (
            <div key={evt.id} className="event-ticker-item">
              <span className="font-mono text-[10px] text-slate-400">[{evt.time}]</span>
              <span className={`font-semibold ${
                evt.type === "danger"
                  ? "text-red-700"
                  : evt.type === "success"
                  ? "text-emerald-700"
                  : evt.type === "warning"
                  ? "text-amber-700"
                  : "text-slate-700"
              }`}>
                {evt.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MACHINE DETAIL FLOATING MODAL (Section 16: ONLY machine modal, no side drawer) */}
      {selectedMachine && (
        <MachineDetailModal
          machine={selectedMachine}
          onClose={() => setSelectedMachine(null)}
          onSimulateFailure={(m) => handleSimulateDisruptionClick(m)}
          onViewOrder={(ordId) => setInspectOrderId(ordId)}
        />
      )}

      {/* ORDER DETAILS ROUTE MODAL (Section 18, 19, 20, 21) */}
      {inspectOrderId && (
        <OrderDetailsModal
          orderId={inspectOrderId}
          onClose={() => setInspectOrderId(null)}
          onInspectMachine={handleInspectMachineById}
        />
      )}

      {/* DISRUPTION & RECOVERY MODAL (Section 31 & 32: Option A vs Option B) */}
      {showDisruptionModal && (
        <DisruptionModal
          machines={machines}
          lanes={lanes}
          defaultMachineId={disruptionTargetMachine}
          onClose={() => setShowDisruptionModal(false)}
          onSuccess={() => {
            loadFactoryData();
          }}
          user={user}
        />
      )}
    </div>
  );
}
