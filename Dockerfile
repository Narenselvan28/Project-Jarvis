# Multi-stage Dockerfile for Adaptive Production Scheduling Platform

FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY scripts/ scripts/
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 5000

# Train models and start backend
CMD python scripts/train_models.py && python scripts/demo_reset.py && python backend/app.py
