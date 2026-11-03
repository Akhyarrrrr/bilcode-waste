"""Copy only the checksum-verified deployment model beside the inference app."""
import hashlib
import json
import shutil
from pathlib import Path

directory = Path(__file__).resolve().parent
source = directory.parent / "artifacts"
if not source.exists():
    source = directory
metadata = json.loads((source / "metadata.json").read_text())
digest = hashlib.sha256((source / "model.onnx").read_bytes()).hexdigest()
assert digest == metadata["sha256"], "Model checksum mismatch"
if source != directory:
    for name in ("model.onnx", "metadata.json"):
        shutil.copy2(source / name, directory / name)
assert hashlib.sha256((directory / "model.onnx").read_bytes()).hexdigest() == digest
print(f"Bundled {metadata['modelVersion']} ({(directory / 'model.onnx').stat().st_size} bytes)")
