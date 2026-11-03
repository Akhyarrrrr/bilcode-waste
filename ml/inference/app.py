import hashlib
import hmac
import io
import json
import logging
import os
import time
import warnings
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from PIL import Image, ImageOps, UnidentifiedImageError

SERVICE_VERSION = "1.0.0"
REPO_URL = "https://github.com/Akhyarrrrr/bilcode-waste"
LABELS = {"ORGANIC": "Organik", "PLASTIC": "Plastik", "PAPER": "Kertas"}
MAX_BYTES = 3 * 1024 * 1024
MAX_PIXELS = 20_000_000
CLASSES = ["ORGANIC", "PLASTIC", "PAPER"]
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)[:, None, None]
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)[:, None, None]
LOGGER = logging.getLogger(__name__)


def preprocess(content):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as image:
                if image.format not in ("JPEG", "PNG", "WEBP"):
                    raise ValueError("Only JPEG, PNG and WebP images are supported")
                if image.width * image.height > MAX_PIXELS:
                    raise ValueError("Image exceeds decoded pixel limit")
                image = ImageOps.exif_transpose(image).convert("RGB")
                width, height = image.size
                if width <= height:
                    size = (256, int(256 * height / width))
                else:
                    size = (int(256 * width / height), 256)
                if size[0] * size[1] > MAX_PIXELS:
                    raise ValueError("Image exceeds resized pixel limit")
                image = image.resize(size, Image.Resampling.BILINEAR)
                left = round((size[0] - 224) / 2)
                top = round((size[1] - 224) / 2)
                image = image.crop((left, top, left + 224, top + 224))
                array = np.asarray(image, dtype=np.float32).transpose(2, 0, 1) / np.float32(255)
                return np.ascontiguousarray(((array - MEAN) / STD)[None])
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ValueError("Invalid or unsafe image") from exc


class Model:
    def __init__(self):
        self.session = None
        self.version = None
        self.metadata = {}
        self.error = None

    def load(self):
        directory = Path(__file__).resolve().parent
        bundled = directory / "model.onnx"
        path = Path(os.environ.get("MODEL_PATH", str(bundled if bundled.exists() else directory.parent / "artifacts/model.onnx")))
        metadata = json.loads(path.with_name("metadata.json").read_text())
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if metadata["sha256"] != digest or metadata["classes"] != CLASSES:
            raise ValueError("Model hash or class order mismatch")
        expected = {"resizeShortSide": 256, "cropSize": 224, "interpolation": "bilinear", "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]}
        if metadata["preprocessing"] != expected:
            raise ValueError("Unsupported model preprocessing")
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        session = ort.InferenceSession(str(path), sess_options=options, providers=["CPUExecutionProvider"])
        if session.get_inputs()[0].name != "images" or session.get_inputs()[0].shape[1:] != [3, 224, 224]:
            raise ValueError("Unexpected model input")
        output = session.run(None, {"images": np.zeros((1, 3, 224, 224), dtype=np.float32)})[0]
        if output.shape != (1, 3) or not np.isfinite(output).all():
            raise ValueError("Invalid model output")
        self.session, self.version, self.metadata = session, metadata["modelVersion"], metadata

    def predict(self, tensor):
        logits = self.session.run(None, {"images": tensor})[0][0]
        probabilities = np.exp(logits - np.max(logits))
        probabilities /= probabilities.sum()
        if not np.isfinite(probabilities).all():
            raise RuntimeError("Non-finite model output")
        return probabilities


@asynccontextmanager
async def lifespan(app):
    app.state.model = Model()
    try:
        app.state.model.load()
    except Exception as exc:
        app.state.model.error = type(exc).__name__
        LOGGER.exception("Classification model unavailable")
    yield


app = FastAPI(
    title="Bilcode Waste: layanan klasifikasi sampah",
    version=SERVICE_VERSION,
    description=(
        "Model MobileNetV3-Small (ONNX Runtime) yang mengklasifikasi foto sampah menjadi Organik, Plastik, atau Kertas. "
        "Layanan internal: `POST /predict` hanya dipanggil API Bilcode Waste dengan header `X-API-Key`."
    ),
    lifespan=lifespan,
)


class RequestGuard:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["path"] != "/predict":
            return await self.app(scope, receive, send)
        headers = dict(scope["headers"])
        secret = os.environ.get("ML_API_KEY", "")
        if not secret:
            return await JSONResponse({"detail": "Inference authentication is not configured"}, status_code=503)(scope, receive, send)
        if not hmac.compare_digest(headers.get(b"x-api-key", b""), secret.encode()):
            return await JSONResponse({"detail": "Invalid API key"}, status_code=401)(scope, receive, send)
        length = headers.get(b"content-length")
        if length:
            try:
                if int(length) < 0:
                    raise ValueError("Negative length")
                if int(length) > MAX_BYTES + 65536:
                    return await JSONResponse({"detail": "Upload exceeds 3 MiB"}, status_code=413)(scope, receive, send)
            except ValueError:
                return await JSONResponse({"detail": "Invalid content length"}, status_code=400)(scope, receive, send)
        chunks, total = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            content = message.get("body", b"")
            total += len(content)
            if total > MAX_BYTES + 65536:
                return await JSONResponse({"detail": "Upload exceeds 3 MiB"}, status_code=413)(scope, receive, send)
            chunks.append(content)
            if not message.get("more_body", False):
                break
        body = b"".join(chunks)
        delivered = False

        async def replay():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        await self.app(scope, replay, send)


app.add_middleware(RequestGuard)


@app.get("/health")
def health():
    model = app.state.model
    body = {
        "status": "ready" if model.session else "unavailable",
        "service": "bilcode-waste-ml",
        "version": SERVICE_VERSION,
        "modelVersion": model.version,
        "classes": CLASSES,
    }
    return JSONResponse(body, status_code=200 if model.session else 503)


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def status_page():
    model = app.state.model
    ready = model.session is not None
    rows = "".join(
        f"<li><span>{name}</span><span class='muted'>{value}</span></li>"
        for name, value in [
            ("Status model", "siap" if ready else "tidak tersedia"),
            ("Versi model", model.version or "-"),
            ("Arsitektur", model.metadata.get("architecture", "-")),
            ("Kelas", ", ".join(LABELS[c] for c in CLASSES)),
            ("Input", "224 × 224 RGB, normalisasi ImageNet"),
        ]
    )
    return f"""<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bilcode Waste ML</title>
<style>
:root{{--bg:#fafafa;--card:#fff;--fg:#18181b;--muted:#71717a;--line:#e4e4e7;--primary:#047857;--state:{"#047857" if ready else "#be123c"};color-scheme:light dark}}
@media (prefers-color-scheme:dark){{:root{{--bg:#09090b;--card:#18181b;--fg:#fafafa;--muted:#a1a1aa;--line:#27272a;--primary:#34d399;--state:{"#34d399" if ready else "#fb7185"}}}}}
*{{box-sizing:border-box}}body{{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}}
main{{width:100%;max-width:520px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:28px}}
h1{{margin:0;font-size:22px;letter-spacing:-.02em}}h1 span{{color:var(--primary)}}
.status{{margin:6px 0 20px;color:var(--muted)}}.status b{{color:var(--state)}}
ul{{list-style:none;margin:0 0 20px;padding:0;border-top:1px solid var(--line)}}
li{{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)}}
.muted{{color:var(--muted);text-align:right}}
nav{{display:flex;flex-wrap:wrap;gap:8px}}a{{color:var(--primary);text-decoration:none;border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-size:14px}}a:hover{{border-color:var(--primary)}}
footer{{margin-top:20px;color:var(--muted);font-size:12px}}
</style></head><body><main>
<h1>Bilcode <span>Waste</span> ML</h1>
<p class="status"><b>{"Model siap" if ready else "Model tidak tersedia"}</b>. Layanan versi {SERVICE_VERSION}.</p>
<ul>{rows}</ul>
<nav><a href="/docs">Dokumentasi (OpenAPI)</a><a href="/health">Health check</a><a href="{REPO_URL}/blob/main/docs/ML.md">Hasil evaluasi</a></nav>
<footer>Prediksi hanya melalui API Bilcode Waste (header X-API-Key). Akurasi data uji 98,53% pada dataset RealWaste.</footer>
</main></body></html>"""


@app.post("/predict")
def predict(file: UploadFile = File(...)):
    started = time.perf_counter()
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(415, "Only JPEG, PNG and WebP are supported")
    content = file.file.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise HTTPException(413, "Upload exceeds 3 MiB")
    try:
        tensor = preprocess(content)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    model = app.state.model
    if model.session is None:
        raise HTTPException(503, "Classification model unavailable")
    scores = model.predict(tensor)
    index = int(np.argmax(scores))
    return {"category": CLASSES[index], "confidence": float(scores[index]), "scores": dict(zip(CLASSES, map(float, scores))), "modelVersion": model.version, "durationMs": round((time.perf_counter() - started) * 1000, 3)}
