from datetime import datetime
from backend.extensions import db

class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True) # e.g. 'PRD-TURBINE-BLADE', 'PRD-HYDRAULIC-VALVE'
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    required_precision = db.Column(db.String(20), default="HIGH") # 'HIGH' or 'MEDIUM'
    material_code = db.Column(db.String(50), nullable=True)
    material_qty_per_unit = db.Column(db.Float, default=2.5)
    standard_batch_size = db.Column(db.Integer, default=50)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    orders = db.relationship("Order", back_populates="product")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "description": self.description,
            "required_precision": self.required_precision,
            "material_code": self.material_code,
            "material_qty_per_unit": self.material_qty_per_unit,
            "standard_batch_size": self.standard_batch_size
        }
