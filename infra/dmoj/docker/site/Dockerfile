# =============================================================================
# DMOJ Site Image — site / celery / bridged
# Build context: ./infra/dmoj/
# Шаардлага: infra/dmoj/repo/ → bash scripts/setup-dmoj.sh
# =============================================================================
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        default-libmysqlclient-dev \
        pkg-config \
        libffi-dev \
        git \
        curl \
        gettext \
        libxml2-dev \
        libxslt1-dev \
        sassc \
    && rm -rf /var/lib/apt/lists/*

# Node.js (postcss + autoprefixer for CSS build)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g sass postcss-cli autoprefixer

WORKDIR /site

# Python dependencies — layer cache ашиглахын тулд эхэлж copy
COPY repo/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir \
        mysqlclient \
        django-redis \
        channels_redis \
        gunicorn \
        "celery[redis]" \
        websocket-client

# DMOJ source code
COPY repo/ .

# websocket/ нь Node.js файлууд — Python-ийн websocket-client package-тай нэр давхцдаг тул rename
RUN mv websocket websocket_nodejs

# CSS build (sass + postcss)
RUN bash make_style.sh 2>/dev/null || true

# Django translations compile
RUN python manage.py compilemessages 2>/dev/null || true

EXPOSE 8000

CMD ["gunicorn", "dmoj.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--timeout", "120"]
