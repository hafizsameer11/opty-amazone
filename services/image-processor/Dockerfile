FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    REMBG_HOME=/models

WORKDIR /srv/image-processor

# libgomp is required by the CPU ONNX runtime used by rembg.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install --requirement requirements.txt

RUN useradd --create-home --uid 10001 processor \
    && mkdir --parents /models \
    && chown --recursive processor:processor /models /srv/image-processor

COPY --chown=processor:processor app ./app

USER processor

EXPOSE 8030

# One worker deliberately keeps one in-memory model session. Scale horizontally
# only after measuring CPU/GPU capacity and queueing behaviour.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8030", "--workers", "1", "--no-access-log"]
