from datetime import datetime

class MLPrediction:
    def __init__(self, machine_id, order_id=None, operation_sequence=None,
                 predicted_cycle_time=None, failure_probability=None, **kwargs):
        self.machine_id = machine_id
        self.order_id = order_id
        self.operation_sequence = operation_sequence
        self.predicted_cycle_time = predicted_cycle_time
        self.failure_probability = failure_probability
        self.created_at = datetime.utcnow()

    def to_dict(self):
        return {
            "machine_id": self.machine_id,
            "order_id": self.order_id,
            "operation_sequence": self.operation_sequence,
            "predicted_cycle_time": self.predicted_cycle_time,
            "failure_probability": self.failure_probability,
            "created_at": self.created_at.isoformat()
        }
