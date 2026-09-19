from backend.extensions import socketio

class WebSocketService:
    @staticmethod
    def emit_event(event_name, data):
        try:
            socketio.emit(event_name, data)
        except Exception as e:
            print(f"[WebSocket] Emit error ({event_name}): {e}")

    @classmethod
    def emit(cls, event_name, data):
        cls.emit_event(event_name, data)

    @classmethod
    def broadcast(cls, event_name, data):
        cls.emit_event(event_name, data)

    @staticmethod
    def notify_machine_status_changed(machine_dict):
        WebSocketService.emit_event("machine_status_changed", machine_dict)

    @staticmethod
    def notify_machine_failed(disruption_data):
        WebSocketService.emit_event("machine_failed", disruption_data)

    @staticmethod
    def notify_machine_repaired(machine_dict):
        WebSocketService.emit_event("machine_repaired", machine_dict)

    @staticmethod
    def notify_schedule_updated(schedule_data=None):
        WebSocketService.emit_event("schedule_updated", schedule_data or {})

    @staticmethod
    def notify_order_status_changed(order_dict):
        WebSocketService.emit_event("order_status_changed", order_dict)

    @staticmethod
    def notify_maintenance_created(work_order_dict):
        WebSocketService.emit_event("maintenance_created", work_order_dict)

    @staticmethod
    def notify_maintenance_updated(work_order_dict):
        WebSocketService.emit_event("maintenance_updated", work_order_dict)

    @staticmethod
    def notify_optimization_started(info):
        WebSocketService.emit_event("optimization_started", info)

    @staticmethod
    def notify_optimization_completed(result):
        WebSocketService.emit_event("optimization_completed", result)

websocket_service = WebSocketService()
