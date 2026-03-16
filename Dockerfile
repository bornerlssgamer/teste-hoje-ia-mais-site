# ─── Stage 1: Build do React ───────────────────────────────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend

# Copia tudo de uma vez e instala + builda
COPY frontend/ .
RUN npm install && npm run build

# ─── Stage 2: Backend Python + frontend buildado ───────────────────────────────
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY start.py .

COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p temp

ENV HOST=0.0.0.0
ENV PORT=8000
ENV WHISPER_MODEL_SIZE=base

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

CMD ["python3", "start.py", "--prod"]
