class Lane:
    def __init__(self, id, name, sequence=1):
        self.id = id
        self.name = name
        self.sequence = sequence

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sequence": self.sequence
        }
