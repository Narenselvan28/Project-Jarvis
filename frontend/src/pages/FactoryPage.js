import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../services/api";
import { socketService } from "../services/socket";
import FactoryMap from "../components/FactoryMap";
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
    { id: 1, time: "10:42", text: "Production floor active across 3 parallel continuous flow lanes.", type: "info" }
  ]);

  const loadFactoryData = useCallback(async () => {
    try {
      const res = await api.get("/factory");
      const payload = res.data?.data || res.data;
      setFactoryData(payload);
    } catch (err) {
      console.error("Error loading factory floor overview:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFactoryData();

    // Real-time shopfloor updates via Socket.IO
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
      addEvent(`ALERT: Machine ${data.machine_id} FAILED (${data.failure_type}) - ${data.affected_orders_count || 1} orders impacted`, "danger");
      loadFactoryData();
    });

    socketService.on("machine_repaired", (data) => {
      addEvent(`RECOVERY: Machine ${data.id} restored to AVAILABLE`, "success");
      loadFactoryData();
    });

    socketService.on("schedule_updated", () => {
      addEvent("Production plan re-assigned by OR-Tools CP-SAT scheduler", "success");
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
    if (m) setSelectedMachine(m);
  };

  const machines = factoryData?.machines || [];
  const rawLanes = factoryData?.lanes || [];
  const activeOrders = factoryData?.active_orders || [];
  const activeDisruptions = factoryData?.active_disruptions || [];

  // Group machines into each lane for circular map sequential connectors
  const lanesWithMachines = useMemo(() => {
    return rawLanes.map((lane) => {
      const laneMachs = machines.filter((m) => m.lane_id === lane.id);
      laneMachs.sort((a, b) => (a.grid_column || a.sequence_index || 1) - (b.grid_column || b.sequence_index || 1));
      return {
        ...lane,
        machines: laneMachs
      };
    });
  }, [rawLanes, machines]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-bgMain antialiased">
      {/* FACTORY HEADER & VIEW SWITCHER (Sections 5 & 6) */}
      <div className="h-14 bg-white border-b border-borderCol px-6 flex items-center justify-between shrink-0">
        {/* VIEW SWITCHER: [ LANES ] [ ORDERS ] */}
        <div className="view-toggle-container">
          <button
            onClick={() => setActiveView("LANES")}
            className={`view-toggle-btn ${activeView === "LANES" ? "active" : ""}`}
          >
            <i className="fa-solid fa-network-wired text-xs"></i>
            <span>Lanes (Iyandhirangal)</span>
          </button>

          <button
            onClick={() => setActiveView("ORDERS")}
            className={`view-toggle-btn ${activeView === "ORDERS" ? "active" : ""}`}
          >
            <i className="fa-solid fa-boxes-stacked text-xs"></i>
            <span>Orders (Aanaigal)</span>
          </button>
        </div>

        {/* MINIMAL FACTORY OPERATIONAL SUMMARY (Section 7) */}
        <div className="flex items-center gap-4">
          <div className="text-xs text-textSub font-mono hidden md:flex items-center gap-3">
            <span>
              Machines: <strong className="text-textMain">{machines.length}</strong>
            </span>
            <span>
              Running: <strong className="text-emerald-700">{factoryData?.running_count || 0}</strong>
            </span>
            <span>
              Faulted: <strong className={factoryData?.failed_count > 0 ? "text-critical font-bold" : "text-textSub"}>{factoryData?.failed_count || 0}</strong>
            </span>
            <span>
              Active Orders: <strong className="text-primary font-bold">{activeOrders.length}</strong>
            </span>
            <span>
              Disruptions: <strong className={activeDisruptions.length > 0 ? "text-critical font-bold" : "text-textSub"}>{activeDisruptions.length}</strong>
            </span>
          </div>

          <div className="h-4 w-px bg-borderCol hidden md:block"></div>

          {/* Quick Disruption Action */}
          <button
            onClick={() => handleSimulateDisruptionClick(null)}
            className="px-3 py-1.5 bg-criticalLight hover:bg-critical hover:text-white text-critical border border-rose-200 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <i className="fa-solid fa-triangle-exclamation text-xs"></i>
            <span>Simulate Disruption</span>
          </button>
        </div>
      </div>

      {/* PRIMARY FACTORY CONTENT */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {loading && !factoryData ? (
          <div className="py-16 text-center text-xs text-textSub font-mono">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i>
            Loading manufacturing shopfloor network...
          </div>
        ) : activeView === "LANES" ? (
          /* VIEW 1: CIRCULAR FACTORY MACHINE MAP (Section 4 & 5) */
          <FactoryMap
            lanes={lanesWithMachines}
            machines={machines}
            activeOrders={activeOrders}
            orderRoutes={factoryData?.order_routes || {}}
            activeSchedule={factoryData?.active_schedule}
            selectedMachine={selectedMachine}
            onSelectMachine={(m) => setSelectedMachine(m)}
            onSelectOrder={(ordId) => setInspectOrderId(ordId)}
          />
        ) : (
          /* VIEW 2: ORDER VIEW (Section 5 & 8) */
          <OrderView
            orders={activeOrders}
            onSelectOrder={(ordId) => setInspectOrderId(ordId)}
          />
        )}
      </div>

      {/* BOTTOM OPERATIONAL TELEMETRY BAR */}
      <div className="factory-bottom-tray">
        <div className="bottom-tray-header">
          <span>Real-Time Disruption & Telemetry Audit Feed</span>
          <span className="font-mono text-[10px] text-textSub">
            Fleet: {machines.length} Units • Active Orders: {activeOrders.length}
          </span>
        </div>

        <div className="bottom-tray-content">
          {recentEvents.map((evt) => (
            <div key={evt.id} className="event-ticker-item">
              <span className="font-mono text-[10px] text-textSub">[{evt.time}]</span>
              <span className={`font-semibold ${
                evt.type === "danger"
                  ? "text-critical"
                  : evt.type === "success"
                  ? "text-emerald-700"
                  : evt.type === "warning"
                  ? "text-amber-700"
                  : "text-textMain"
              }`}>
                {evt.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MACHINE DETAIL MODAL (Section 14: ONLY Machine modal, no permanent side panel) */}
      {selectedMachine && (
        <MachineDetailModal
          machine={selectedMachine}
          onClose={() => setSelectedMachine(null)}
          onSimulateFailure={(m) => handleSimulateDisruptionClick(m)}
          onViewOrder={(ordId) => setInspectOrderId(ordId)}
        />
      )}

      {/* ORDER DETAILS MODAL (Sections 9 & 10) */}
      {inspectOrderId && (
        <OrderDetailsModal
          orderId={inspectOrderId}
          onClose={() => setInspectOrderId(null)}
          onInspectMachine={handleInspectMachineById}
        />
      )}

      {/* DISRUPTION & RECOVERY MODAL (Sections 32, 33, 34) */}
      {showDisruptionModal && (
        <DisruptionModal
          machines={machines}
          lanes={rawLanes}
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
