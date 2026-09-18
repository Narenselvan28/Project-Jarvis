from datetime import datetime
from backend.extensions import db

class Material(db.Model):
    __tablename__ = "materials"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True) # e.g., 'MAT-ALU-6061', 'MAT-STEEL-316'
    name = db.Column(db.String(100), nullable=False)
    unit = db.Column(db.String(20), default="KG")
    stock_quantity = db.Column(db.Float, default=500.0)
    reserved_quantity = db.Column(db.Float, default=0.0)
    reorder_level = db.Column(db.Float, default=100.0)
    cost_per_unit = db.Column(db.Float, default=250.0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def available_quantity(self):
        return max(0.0, self.stock_quantity - self.reserved_quantity)

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "unit": self.unit,
            "stock_quantity": self.stock_quantity,
            "reserved_quantity": self.reserved_quantity,
            "available_quantity": self.available_quantity,
            "reorder_level": self.reorder_level,
            "cost_per_unit": self.cost_per_unit,
            "is_sufficient": self.available_quantity >= self.reorder_level
        }
