import importlib.util
import io
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

spec = importlib.util.spec_from_file_location("inference_app", Path(__file__).with_name("app.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def image_bytes(fmt="PNG", size=(320, 240)):
    stream = io.BytesIO()
    Image.new("RGB", size, (120, 80, 45)).save(stream, format=fmt)
    return stream.getvalue()


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("ML_API_KEY", "test-secret")
    with TestClient(module.app) as client:
        yield client


def test_auth_before_file_parsing(client):
    assert client.post("/predict").status_code == 401
    assert client.post("/predict", headers={"X-API-Key": "wrong"}).status_code == 401


def test_large_request_without_content_length(client):
    response = client.post("/predict", headers={"X-API-Key": "test-secret", "content-type": "multipart/form-data; boundary=example"}, content=iter([b"x" * (module.MAX_BYTES + 65537)]))
    assert response.status_code == 413


def test_bad_images(client):
    for body, mime, expected in [(b"not an image", "image/png", 422), (image_bytes(), "text/plain", 415), (b"x" * (module.MAX_BYTES + 1), "image/png", 413)]:
        response = client.post("/predict", headers={"X-API-Key": "test-secret"}, files={"file": ("image.png", body, mime)})
        assert response.status_code == expected, response.text


def test_preprocessing_formats_orientation_and_limits(monkeypatch):
    for fmt in ("PNG", "JPEG", "WEBP"):
        tensor = module.preprocess(image_bytes(fmt))
        assert tensor.shape == (1, 3, 224, 224)
        assert tensor.dtype == np.float32
        assert np.isfinite(tensor).all()
    with Image.open(io.BytesIO(image_bytes("JPEG", (120, 80)))) as source:
        exif = Image.Exif()
        exif[274] = 6
        encoded = io.BytesIO()
        source.save(encoded, format="JPEG", exif=exif)
    with Image.open(io.BytesIO(encoded.getvalue())) as source:
        expected = source.transpose(Image.Transpose.ROTATE_270)
        expected_bytes = io.BytesIO()
        expected.save(expected_bytes, format="PNG")
    np.testing.assert_array_equal(module.preprocess(encoded.getvalue()), module.preprocess(expected_bytes.getvalue()))
    monkeypatch.setattr(module, "MAX_PIXELS", 100)
    with pytest.raises(ValueError, match="pixel"):
        module.preprocess(image_bytes())


def test_missing_model_is_unavailable(monkeypatch):
    monkeypatch.setenv("MODEL_PATH", str(Path(__file__).with_name("does-not-exist.onnx")))
    with TestClient(module.app) as client:
        response = client.get("/health")
        assert response.status_code == 503
        assert response.json()["status"] == "unavailable"
        page = client.get("/")
        assert page.status_code == 200 and "Model tidak tersedia" in page.text


def test_metadata_checksum_is_enforced(tmp_path, monkeypatch):
    import json
    (tmp_path / "model.onnx").write_bytes(b"invalid-model")
    (tmp_path / "metadata.json").write_text(json.dumps({"sha256": "incorrect", "classes": module.CLASSES}))
    monkeypatch.setenv("MODEL_PATH", str(tmp_path / "model.onnx"))
    with pytest.raises(ValueError, match="hash"):
        module.Model().load()


def test_real_artifact_response(client):
    health = client.get("/health")
    assert health.status_code == 200, health.text
    assert health.json()["classes"] == ["ORGANIC", "PLASTIC", "PAPER"]
    assert "Model siap" in client.get("/").text
    for fmt, mime in (("PNG", "image/png"), ("JPEG", "image/jpeg"), ("WEBP", "image/webp")):
        response = client.post("/predict", headers={"X-API-Key": "test-secret"}, files={"file": ("image", image_bytes(fmt), mime)})
        assert response.status_code == 200, response.text
        result = response.json()
        assert set(result) == {"category", "confidence", "scores", "modelVersion", "durationMs"}
        assert set(result["scores"]) == {"ORGANIC", "PLASTIC", "PAPER"}
        assert sum(result["scores"].values()) == pytest.approx(1, abs=1e-6)
        assert result["confidence"] == max(result["scores"].values())
        assert result["category"] == max(result["scores"], key=result["scores"].get)
        assert result["modelVersion"] == health.json()["modelVersion"]
