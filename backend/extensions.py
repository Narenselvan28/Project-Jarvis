from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_cors import CORS

jwt = JWTManager()
socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")
cors = CORS()

