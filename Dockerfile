FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=3000

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p API data output assets/input assets/output assets/library workflows/custom

EXPOSE 3000

CMD ["sh", "-c", "mkdir -p /app/data && ([ -s /app/data/history.json ] || printf '[]' > /app/data/history.json) && ([ -s /app/data/global_config.json ] || printf '{}' > /app/data/global_config.json) && ln -sf /app/data/history.json /app/history.json && ln -sf /app/data/global_config.json /app/global_config.json && uvicorn main:app --host 0.0.0.0 --port ${PORT:-3000}"]
