"""Private, self-hosted catalogue-image processor for Vista Express.

The service is intentionally not exposed to browsers or mobile apps. Laravel
authenticates to it with a private token, sends an already-validated Seller
product image, and receives a centred white-background WebP in return.
"""

from __future__ import annotations

import asyncio
import hmac
import logging
import os
import warnings
from contextlib import asynccontextmanager
from dataclasses import dataclass
from io import BytesIO

from fastapi import FastAPI, File, Header, HTTPException, Request, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from PIL import Image, ImageOps, UnidentifiedImageError
from rembg import new_session, remove

logger = logging.getLogger("vista.image_processor")


def _integer_setting(name: str, default: int, minimum: int) -> int:
    try:
        return max(minimum, int(os.getenv(name, str(default))))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    token: str
    model: str
    max_input_bytes: int
    max_input_pixels: int
    catalog_max_dimension: int
    webp_quality: int
    max_concurrent_jobs: int

    @classmethod
    def from_environment(cls) -> "Settings":
        return cls(
            token=os.getenv("IMAGE_PROCESSOR_TOKEN", ""),
            model=os.getenv("REMBG_MODEL", "birefnet-general"),
            max_input_bytes=_integer_setting("MAX_INPUT_BYTES", 5 * 1024 * 1024, 1),
            max_input_pixels=_integer_setting("MAX_INPUT_PIXELS", 25_000_000, 1),
            catalog_max_dimension=_integer_setting("CATALOG_MAX_DIMENSION", 1600, 64),
            webp_quality=min(100, _integer_setting("WEBP_QUALITY", 92, 1)),
            max_concurrent_jobs=_integer_setting("MAX_CONCURRENT_JOBS", 1, 1),
        )


SETTINGS = Settings.from_environment()
Image.MAX_IMAGE_PIXELS = SETTINGS.max_input_pixels
warnings.simplefilter("error", Image.DecompressionBombWarning)


class InvalidImage(ValueError):
    """Raised for unsafe or malformed input that should receive a 4xx response."""


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not SETTINGS.token:
        raise RuntimeError("IMAGE_PROCESSOR_TOKEN must be configured before the service can start.")

    logger.info("Loading rembg model '%s'.", SETTINGS.model)
    app.state.rembg_session = await run_in_threadpool(new_session, SETTINGS.model)
    app.state.processing_slots = asyncio.Semaphore(SETTINGS.max_concurrent_jobs)
    logger.info("Image processor is ready using model '%s'.", SETTINGS.model)

    yield


app = FastAPI(
    title="Vista Express Image Processor",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


def _verify_token(token: str | None) -> None:
    if token is None or not hmac.compare_digest(token, SETTINGS.token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized image processor request.")


def _open_input_image(payload: bytes) -> Image.Image:
    if not payload:
        raise InvalidImage("The image is empty.")

    try:
        with Image.open(BytesIO(payload)) as source:
            source.load()
            if source.width * source.height > SETTINGS.max_input_pixels:
                raise InvalidImage("The image dimensions are too large.")

            # Normalising orientation before segmentation avoids rotated output
            # from phone-camera images and strips unneeded metadata.
            return ImageOps.exif_transpose(source).convert("RGBA")
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise InvalidImage("The image dimensions are too large.") from error
    except UnidentifiedImageError as error:
        raise InvalidImage("The uploaded file is not a supported image.") from error
    except OSError as error:
        raise InvalidImage("The uploaded image could not be decoded.") from error


def _catalogue_webp(payload: bytes, session: object) -> bytes:
    source = _open_input_image(payload)

    try:
        normalised_source = BytesIO()
        source.save(normalised_source, format="PNG")
        cutout_bytes = remove(
            normalised_source.getvalue(),
            session=session,
            force_return_bytes=True,
            decontaminate=True,
        )

        with Image.open(BytesIO(cutout_bytes)) as cutout_source:
            cutout = cutout_source.convert("RGBA")

        alpha = cutout.getchannel("A")
        bounds = alpha.getbbox()
        if bounds is None:
            raise InvalidImage("No product could be detected in this image.")

        subject = cutout.crop(bounds)
        largest_side = max(subject.width, subject.height)
        padding = max(16, round(largest_side * 0.08))
        canvas_size = max(128, min(SETTINGS.catalog_max_dimension, largest_side + (padding * 2)))
        available_size = max(1, canvas_size - (padding * 2))

        if subject.width > available_size or subject.height > available_size:
            scale = min(available_size / subject.width, available_size / subject.height)
            subject = subject.resize(
                (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
                Image.Resampling.LANCZOS,
            )

        canvas = Image.new("RGB", (canvas_size, canvas_size), "white")
        position = ((canvas_size - subject.width) // 2, (canvas_size - subject.height) // 2)
        canvas.paste(subject, position, subject)

        output = BytesIO()
        canvas.save(output, format="WEBP", quality=SETTINGS.webp_quality, method=6)
        return output.getvalue()
    finally:
        source.close()


@app.get("/health")
async def health(request: Request) -> dict[str, str]:
    # Reaching this endpoint means lifespan completed and the model is loaded.
    _ = request.app.state.rembg_session
    return {"status": "ok", "model": SETTINGS.model}


@app.post("/v1/catalogue-image")
async def create_catalogue_image(
    request: Request,
    image: UploadFile = File(...),
    x_image_processor_token: str | None = Header(default=None),
) -> Response:
    _verify_token(x_image_processor_token)

    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="An image file is required.")

    try:
        payload = await image.read(SETTINGS.max_input_bytes + 1)
    finally:
        await image.close()

    if len(payload) > SETTINGS.max_input_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="The image exceeds the maximum allowed file size.",
        )

    try:
        async with request.app.state.processing_slots:
            processed_image = await run_in_threadpool(
                _catalogue_webp,
                payload,
                request.app.state.rembg_session,
            )
    except InvalidImage as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    except Exception:
        logger.exception("Catalogue image processing failed.")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Image processing failed.") from None

    return Response(
        content=processed_image,
        media_type="image/webp",
        headers={
            "Cache-Control": "no-store",
            "X-Image-Processed": "true",
        },
    )
