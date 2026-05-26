# =============================================================================
# DMOJ Judge — C/C++/Python/Java/Ruby дэмждэг judge worker
# pip-ээр dmoj суулгаж, privileged mode-д sandbox-тайгаар ажиллана
# =============================================================================
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive

# Judge-д шаардлагатай хэлүүд болон хэрэгслүүд
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc g++ \
        libseccomp-dev \
        openjdk-17-jdk \
        ruby \
        python3 python3-pip \
        fpc \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# DMOJ judge-server pip-ээр суулгах
RUN pip install --no-cache-dir dmoj

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Non-root user үүсгэх (DMOJ judge root-д ажиллахыг татгалздаг)
RUN useradd -m -s /bin/bash dmoj && \
    mkdir -p /problems /home/dmoj/.config && \
    chown -R dmoj:dmoj /problems /home/dmoj

VOLUME ["/problems"]

USER dmoj

ENTRYPOINT ["/entrypoint.sh"]
