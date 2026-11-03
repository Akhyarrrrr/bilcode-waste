"""Select on validation only; lock selection before the one-time test evaluation."""
import argparse
import csv
import hashlib
import importlib.util
import json
import platform
import random
import time
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import onnxruntime as ort
import torch
from PIL import Image, ImageOps
from sklearn.metrics import classification_report, confusion_matrix
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small

ROOT = Path(__file__).resolve().parents[1]
CLASSES = ["ORGANIC", "PLASTIC", "PAPER"]
spec = importlib.util.spec_from_file_location("runtime", ROOT / "inference/app.py")
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)


class WasteDataset(Dataset):
    def __init__(self, rows, augmentation=False):
        self.rows = rows
        self.images = []
        for row in rows:
            with Image.open(ROOT / "data" / row["path"]) as image:
                self.images.append(ImageOps.exif_transpose(image).convert("RGB").copy())
        self.transform = transforms.Compose([
            transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]) if augmentation else MobileNet_V3_Small_Weights.IMAGENET1K_V1.transforms()

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index):
        return self.transform(self.images[index]), CLASSES.index(self.rows[index]["category"])


def sha256(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--head-epochs", type=int, default=5)
    parser.add_argument("--fine-epochs", type=int, default=30)
    parser.add_argument("--patience", type=int, default=7)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--output-dir", default="runs/reproduction")
    args = parser.parse_args()
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.cuda.manual_seed_all(args.seed)
    torch.set_num_threads(4)
    torch.backends.cudnn.benchmark = False
    torch.backends.cudnn.deterministic = True
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    artifact = ROOT / args.output_dir
    artifact.mkdir(exist_ok=True, parents=True)
    evaluation = artifact / "evaluation"
    evaluation.mkdir(exist_ok=True)
    if (artifact / "selection.json").exists():
        raise RuntimeError("Selection is already locked. Preserve the held-out evaluation; archive the run explicitly before retraining.")
    rows = list(csv.DictReader((ROOT / "manifest.csv").open(encoding="utf-8")))
    splits = {split: [row for row in rows if row["split"] == split] for split in ("train", "validation", "test")}
    assert all(set(row["group"] for row in splits[a]).isdisjoint(row["group"] for row in splits[b]) for a, b in (("train", "validation"), ("train", "test"), ("validation", "test")))
    datasets = {split: WasteDataset(splits[split], split == "train") for split in ("train", "validation")}
    generator = torch.Generator().manual_seed(args.seed)
    loaders = {split: DataLoader(dataset, batch_size=args.batch_size, shuffle=split == "train", num_workers=0, pin_memory=device.type == "cuda", generator=generator) for split, dataset in datasets.items()}
    counts = np.bincount([CLASSES.index(row["category"]) for row in splits["train"]], minlength=3)
    class_weights = len(splits["train"]) / (3 * counts)
    criterion = nn.CrossEntropyLoss(weight=torch.tensor(class_weights, dtype=torch.float32, device=device))
    model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.IMAGENET1K_V1)
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, 3)
    model.to(device)
    scaler = torch.amp.GradScaler("cuda", enabled=device.type == "cuda")
    config = vars(args) | {"architecture": "mobilenet_v3_small", "weights": "IMAGENET1K_V1", "classes": CLASSES, "classWeights": class_weights.tolist(), "device": str(device), "gpu": torch.cuda.get_device_name(0) if device.type == "cuda" else None, "torch": torch.__version__, "python": platform.python_version(), "manifestSha256": sha256(ROOT / "manifest.csv"), "selectionCriterion": "maximum validation macro F1; ties use lower validation loss", "testPolicy": "test is evaluated only after selection.json is written; no test-driven model changes"}
    (artifact / "config.json").write_text(json.dumps(config, indent=2))
    print(json.dumps(config, indent=2), flush=True)
    history, best_score, best_loss, stale = [], -1, float("inf"), 0
    started = time.perf_counter()
    for stage, epochs in (("head", args.head_epochs), ("fine", args.fine_epochs)):
        for parameter in model.features.parameters():
            parameter.requires_grad = stage == "fine"
        optimizer = torch.optim.AdamW(model.classifier.parameters(), lr=0.001, weight_decay=0.0001) if stage == "head" else torch.optim.AdamW([{"params": model.features.parameters(), "lr": 0.0002}, {"params": model.classifier.parameters(), "lr": 0.0005}], weight_decay=0.0001)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
        stale = 0
        for epoch in range(epochs):
            entry = {"stage": stage, "epoch": epoch + 1}
            for split, loader in loaders.items():
                training = split == "train"
                model.train(training)
                if stage == "head":
                    model.features.eval()
                losses, correct, seen, true, predicted = 0, 0, 0, [], []
                for inputs, targets in loader:
                    inputs, targets = inputs.to(device, non_blocking=True), targets.to(device, non_blocking=True)
                    optimizer.zero_grad(set_to_none=True)
                    with torch.set_grad_enabled(training):
                        with torch.autocast(device_type=device.type, dtype=torch.float16, enabled=device.type == "cuda"):
                            logits = model(inputs)
                            loss = criterion(logits, targets)
                        if training:
                            scaler.scale(loss).backward()
                            scaler.step(optimizer)
                            scaler.update()
                    guesses = logits.argmax(1)
                    losses += float(loss.detach()) * len(inputs)
                    correct += int((guesses == targets).sum())
                    seen += len(inputs)
                    true.extend(targets.cpu().tolist())
                    predicted.extend(guesses.cpu().tolist())
                report = classification_report(true, predicted, labels=[0, 1, 2], output_dict=True, zero_division=0)
                entry[split + "Loss"] = losses / seen
                entry[split + "Accuracy"] = correct / seen
                entry[split + "MacroF1"] = report["macro avg"]["f1-score"]
            score, val_loss = entry["validationMacroF1"], entry["validationLoss"]
            if score > best_score or (score == best_score and val_loss < best_loss):
                best_score, best_loss, stale = score, val_loss, 0
                torch.save({"state_dict": model.state_dict(), "classes": CLASSES, "architecture": "mobilenet_v3_small"}, artifact / "model.pt")
                best = dict(entry)
            else:
                stale += 1
            history.append(entry)
            (artifact / "history.json").write_text(json.dumps(history, indent=2))
            print(json.dumps(entry), flush=True)
            scheduler.step()
            if stage == "fine" and stale >= args.patience:
                break
        model.load_state_dict(torch.load(artifact / "model.pt", map_location=device, weights_only=True)["state_dict"])
    selection = {"selected": best, "trainingSeconds": time.perf_counter() - started, "modelPtSha256": sha256(artifact / "model.pt"), "testPreviouslyInspected": False}
    (artifact / "selection.json").write_text(json.dumps(selection, indent=2))
    model.cpu().float().eval()
    torch.onnx.export(model, torch.zeros(1, 3, 224, 224), artifact / "model.onnx", input_names=["images"], output_names=["logits"], dynamic_axes={"images": {0: "batch"}, "logits": {0: "batch"}}, opset_version=17, dynamo=False)
    digest = sha256(artifact / "model.onnx")
    metadata = {"modelVersion": "realwaste-mobilenetv3-" + digest[:12], "sha256": digest, "classes": CLASSES, "architecture": "mobilenet_v3_small", "preprocessing": {"resizeShortSide": 256, "cropSize": 224, "interpolation": "bilinear", "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]}, "output": "logits", "opset": 17}
    (artifact / "metadata.json").write_text(json.dumps(metadata, indent=2))
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    session = ort.InferenceSession(str(artifact / "model.onnx"), sess_options=options, providers=["CPUExecutionProvider"])
    test = WasteDataset(splits["test"])
    true, predictions, torch_predictions, records, max_error, max_preprocess_error = [], [], [], [], 0.0, 0.0
    errors = []
    with torch.no_grad():
        for index, row in enumerate(splits["test"]):
            tensor = runtime.preprocess((ROOT / "data" / row["path"]).read_bytes())
            reference = test[index][0].numpy()[None]
            max_preprocess_error = max(max_preprocess_error, float(np.max(np.abs(reference - tensor))))
            torch_probabilities = model(torch.from_numpy(tensor)).softmax(1).numpy()[0]
            logits = session.run(None, {"images": tensor})[0][0]
            probabilities = np.exp(logits - logits.max())
            probabilities /= probabilities.sum()
            max_error = max(max_error, float(np.max(np.abs(probabilities - torch_probabilities))))
            actual = CLASSES.index(row["category"])
            guess = int(probabilities.argmax())
            true.append(actual)
            predictions.append(guess)
            torch_predictions.append(int(torch_probabilities.argmax()))
            record = {"path": row["path"], "actual": row["category"], "predicted": CLASSES[guess], "confidence": float(probabilities[guess]), **dict(zip(CLASSES, map(float, probabilities)))}
            records.append(record)
            if actual != guess:
                errors.append((index, record))
    assert max_preprocess_error < 1e-6, f"Preprocessing mismatch: {max_preprocess_error}"
    assert max_error < 1e-4, f"ONNX probability parity failed: {max_error}"
    assert predictions == torch_predictions, "ONNX top-label parity failed"
    report = classification_report(true, predictions, labels=[0, 1, 2], target_names=CLASSES, output_dict=True, zero_division=0)
    matrix = confusion_matrix(true, predictions, labels=[0, 1, 2])
    normalized = matrix / matrix.sum(1, keepdims=True)
    metrics = {"accuracy": float(np.mean(np.array(true) == predictions)), "macroF1": report["macro avg"]["f1-score"], "testCount": len(true), "classificationReport": report, "confusionMatrix": matrix.tolist(), "normalizedConfusionMatrix": normalized.tolist(), "classes": CLASSES, "onnxMaxProbabilityError": max_error, "onnxTopLabelAgreement": float(np.mean(np.array(predictions) == torch_predictions)), "preprocessMaxAbsError": max_preprocess_error, "acceptanceAccuracy": 0.8, "acceptancePassed": report["accuracy"] >= 0.8, "modelVersion": metadata["modelVersion"]}
    (evaluation / "metrics.json").write_text(json.dumps(metrics, indent=2))
    with (evaluation / "predictions.csv").open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(records[0]))
        writer.writeheader()
        writer.writerows(records)
    (evaluation / "errors.json").write_text(json.dumps([record for _, record in errors], indent=2))
    figure, axes = plt.subplots(1, 2, figsize=(10, 4))
    for split in ("train", "validation"):
        axes[0].plot([entry[split + "Loss"] for entry in history], label=split)
        axes[1].plot([entry[split + "Accuracy"] for entry in history], label=split)
    for axis, ylabel in zip(axes, ("Weighted loss", "Accuracy")):
        axis.set(xlabel="Epoch", ylabel=ylabel)
        axis.legend()
    figure.tight_layout()
    figure.savefig(evaluation / "curves.png", dpi=160)
    plt.close(figure)
    figure, axes = plt.subplots(1, 2, figsize=(10, 4))
    for axis, values, title in zip(axes, (matrix, normalized), ("Counts", "Row normalized")):
        axis.imshow(values, cmap="Blues")
        axis.set(xticks=range(3), yticks=range(3), xticklabels=CLASSES, yticklabels=CLASSES, xlabel="Predicted", ylabel="Actual", title=title)
        for i in range(3):
            for j in range(3):
                axis.text(j, i, str(values[i, j]) if title == "Counts" else f"{values[i,j]:.2f}", ha="center", va="center", color="white" if values[i, j] > values.max() / 2 else "black")
    figure.tight_layout()
    figure.savefig(evaluation / "confusion-matrix.png", dpi=160)
    plt.close(figure)
    if errors:
        figure, axes = plt.subplots(2, 4, figsize=(12, 6))
        for axis, (index, record) in zip(axes.flatten(), errors[:8]):
            axis.imshow(test.images[index])
            axis.set_title(f"{record['actual']} -> {record['predicted']}\n{record['confidence']:.1%}")
        for axis in axes.flatten():
            axis.axis("off")
        figure.tight_layout()
        figure.savefig(evaluation / "error-examples.png", dpi=120)
        plt.close(figure)
    print(json.dumps(metrics, indent=2), flush=True)


if __name__ == "__main__":
    main()
