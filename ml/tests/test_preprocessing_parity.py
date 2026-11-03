import importlib.util
import io
from pathlib import Path

import numpy as np
import pytest
from PIL import Image
from torchvision.models import MobileNet_V3_Small_Weights

spec = importlib.util.spec_from_file_location("runtime_parity", Path(__file__).parents[1] / "inference/app.py")
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)


@pytest.mark.parametrize("size", [(524, 524), (333, 201), (201, 333), (319, 240)])
def test_pillow_runtime_matches_pretrained_weights(size):
    pixels = np.random.default_rng(42).integers(0, 256, (size[1], size[0], 3), dtype=np.uint8)
    image = Image.fromarray(pixels)
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    actual = runtime.preprocess(stream.getvalue())
    expected = MobileNet_V3_Small_Weights.IMAGENET1K_V1.transforms()(image).numpy()[None]
    np.testing.assert_array_equal(actual, expected)
