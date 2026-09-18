class Process:
    def __init__(self, id, name, sequence_index=1, standard_cycle_time_min=60.0):
        self.id = id
        self.name = name
        self.sequence_index = sequence_index
        self.standard_cycle_time_min = standard_cycle_time_min

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sequence_index": self.sequence_index,
            "standard_cycle_time_min": self.standard_cycle_time_min
        }
