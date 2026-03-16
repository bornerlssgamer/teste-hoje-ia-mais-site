# ─── Stage 1: Build do React ───────────────────────────────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

# ─── Stage 2: Backend Python + frontend buildado ───────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código do backend
COPY backend/ ./backend/
COPY start.py .

# Arquivos buildados do React (vêm do stage 1)
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Diretório temporário
RUN mkdir -p temp

# Variáveis de ambiente
ENV HOST=0.0.0.0
ENV PORT=8000
ENV WHISPER_MODEL_SIZE=base

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

CMD ["python3", "start.py", "--prod"]
