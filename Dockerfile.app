# ==========================================
# STAGE 1: Build React Frontend Static Bundle
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Python 3.11 Production App Runtime
# ==========================================
FROM python:3.11-slim

# Install system dependencies (Nginx, Supervisor, Curl, Build Tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY src/ ./src/
COPY app_data/ ./app_data/

# Copy React static build assets into Nginx web root
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy Nginx & Supervisor configuration blueprints
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create persistent storage directories
RUN mkdir -p /app/app_data /app/uploads /app/embedding_cache

# Expose HTTP port 9090 (Nginx) & 9000 (FastAPI API Direct)
EXPOSE 9090 9000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:9090/api/health || exit 1

# Launch Supervisor Process Orchestrator
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
