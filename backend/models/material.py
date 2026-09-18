class Material:
    def __init__(self, id, name, material_type="FABRIC", hardness_factor=1.0):
        self.id = id
        self.name = name
        self.material_type = material_type
        self.hardness_factor = hardness_factor

    def to_dict(self):
        return {"id": self.id, "name": self.name, "material_type": self.material_type, "hardness_factor": self.hardness_factor}
