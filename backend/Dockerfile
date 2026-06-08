FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/99retries \
    && echo 'Acquire::http::Timeout "60";' >> /etc/apt/apt.conf.d/99retries \
    && echo 'Acquire::https::Timeout "60";' >> /etc/apt/apt.conf.d/99retries \
    && apt-get update --fix-missing \
    && apt-get install -y --no-install-recommends \
        libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

# ---- dev stage (mounts source as volume) ----
FROM base AS dev
COPY . .

# ---- prod stage (copies source into image) ----
FROM base AS prod
COPY . .
RUN python manage.py collectstatic --noinput
