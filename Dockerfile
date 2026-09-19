# Multi-stage Dockerfile for ReFlow Adaptive Production Scheduling Platform

FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
ARG REACT_APP_API_URL=https://jarvis-bknd.onrender.com
ARG REACT_APP_SOCKET_URL=https://jarvis-bknd.onrender.com
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DATABASE_MODE=atlas
ENV MONGODB_ATLAS_URI=mongodb+srv://narenselvan77_db_user:KaSVVs32FLiaLKqQ@cluster0.hpfub4u.mongodb.net/reflow?retryWrites=true&w=majority&appName=Cluster0
ENV MONGODB_DB_NAME=reflow

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY ml/ ml/
COPY scripts/ scripts/
COPY wsgi.py .
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 5000

# Train ML models and launch production WSGI server
CMD python scripts/train_models.py && gunicorn --worker-class gthread -w 1 --threads 8 -b 0.0.0.0:${PORT:-5000} wsgi:app
