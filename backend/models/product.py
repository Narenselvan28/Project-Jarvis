class Product:
    def __init__(self, id, name, code="PRD-TSHIRT-01", required_precision="HIGH"):
        self.id = id
        self.name = name
        self.code = code
        self.required_precision = required_precision

    def to_dict(self):
        return {"id": self.id, "name": self.name, "code": self.code, "required_precision": self.required_precision}
