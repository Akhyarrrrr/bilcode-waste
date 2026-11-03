"""Prepare the three-class RealWaste subset without separating similar images."""
import argparse
import csv
import hashlib
import json
import random
import shutil
import urllib.request
import zipfile
from collections import Counter, defaultdict
from pathlib import Path, PurePosixPath

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
URL = "https://archive.ics.uci.edu/static/public/908/realwaste.zip"
MAPPING = {"Food Organics": "ORGANIC", "Vegetation": "ORGANIC", "Plastic": "PLASTIC", "Paper": "PAPER"}


def safe_path(root, name):
    path = PurePosixPath(name.replace("\\", "/"))
    if path.is_absolute() or ".." in path.parts or any(":" in part for part in path.parts):
        raise ValueError(f"Unsafe archive path: {name}")
    target = (root / Path(*path.parts)).resolve()
    if not target.is_relative_to(root.resolve()):
        raise ValueError(f"Unsafe archive path: {name}")
    return target


def sha256(path):
    with open(path, "rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def assign_splits(rows, seed=42):
    parent = list(range(len(rows)))

    def find(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    hashes = [int(row["dhash"], 16) for row in rows]
    for i, h in enumerate(hashes):
        for j in range(i):
            if (h ^ hashes[j]).bit_count() <= 4:
                parent[find(i)] = find(j)
    groups = defaultdict(list)
    for i, row in enumerate(rows):
        groups[find(i)].append(row)
    total = Counter(row["category"] for row in rows)
    counts = {split: Counter() for split in ("train", "validation", "test")}
    ratios = {"train": 0.7, "validation": 0.15, "test": 0.15}
    ordered = list(groups.values())
    random.Random(seed).shuffle(ordered)
    ordered.sort(key=len, reverse=True)
    for group in ordered:
        addition = Counter(row["category"] for row in group)

        def cost(candidate):
            return sum(((counts[split][category] + (addition[category] if split == candidate else 0) - ratio * amount) / amount) ** 2 for split, ratio in ratios.items() for category, amount in total.items())

        selected = min(ratios, key=cost)
        counts[selected].update(addition)
        group_id = min(row["sha256"] for row in group)[:16]
        for row in group:
            row.update(split=selected, group=group_id)
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--archive", default="realwaste.zip")
    args = parser.parse_args()
    data = ROOT / "data"
    data.mkdir(exist_ok=True)
    archive = data / args.archive
    if args.download and not archive.exists():
        temporary = archive.with_suffix(".part")
        with urllib.request.urlopen(URL, timeout=120) as response, temporary.open("wb") as output:
            shutil.copyfileobj(response, output)
        temporary.replace(archive)
    digest = sha256(archive)
    source_path = ROOT / "source.json"
    if source_path.exists():
        recorded = json.loads(source_path.read_text())
        expected = recorded["archiveSha256"] if recorded.get("archiveFilename") == archive.name else None
        if archive.name == "realwaste.zip" and (ROOT / "uci-verification.json").exists():
            expected = json.loads((ROOT / "uci-verification.json").read_text())["archiveSha256"]
        if expected and expected != digest:
            raise ValueError("Archive SHA256 differs from recorded source.json")
    rows, rejected, duplicates, seen = [], [], [], {}
    with zipfile.ZipFile(archive) as package:
        for item in sorted(package.infolist(), key=lambda item: item.filename):
            target = safe_path(data, item.filename)
            label = next((part for part in PurePosixPath(item.filename).parts if part in MAPPING), None)
            if item.is_dir() or label is None or target.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with package.open(item) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output)
            try:
                with Image.open(target) as image:
                    image.verify()
                with Image.open(target) as image:
                    image = ImageOps.exif_transpose(image).convert("RGB")
                    width, height = image.size
                    pixels = np.asarray(image.convert("L").resize((9, 8), Image.Resampling.LANCZOS))
                    h = sum(int(bit) << index for index, bit in enumerate((pixels[:, 1:] > pixels[:, :-1]).flatten()))
                file_digest = sha256(target)
                if file_digest in seen:
                    duplicates.append({"path": str(target.relative_to(data)).replace("\\", "/"), "duplicateOf": seen[file_digest]})
                    continue
                relative = str(target.relative_to(data)).replace("\\", "/")
                seen[file_digest] = relative
                rows.append(dict(path=relative, original_label=label, category=MAPPING[label], width=width, height=height, sha256=file_digest, dhash=f"{h:016x}"))
            except (OSError, ValueError, Image.DecompressionBombError) as exc:
                rejected.append({"path": item.filename, "reason": str(exc)})
    assign_splits(rows, args.seed)
    with (ROOT / "manifest.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    summary = {"seed": args.seed, "archiveSha256": digest, "archiveBytes": archive.stat().st_size, "downloadUrl": URL, "datasetUrl": "https://archive.ics.uci.edu/dataset/908/realwaste", "originalReleaseUrl": "https://github.com/sam-single/realwaste", "mapping": MAPPING, "licenseCaveat": "UCI lists CC BY 4.0; original release may use CC BY-NC-SA 4.0. Resolve before commercial redistribution.", "nearDuplicateMethod": "64-bit difference hash, Hamming distance <=4, transitive connected components, all labels grouped together", "counts": {split: dict(Counter(row["category"] for row in rows if row["split"] == split)) for split in ("train", "validation", "test")}, "originalCounts": dict(Counter(row["original_label"] for row in rows)), "groups": len(set(row["group"] for row in rows)), "corrupt": rejected, "exactDuplicatesRemoved": duplicates, "manifestSha256": sha256(ROOT / "manifest.csv")}
    summary["archiveFilename"] = archive.name
    summary["licenseCaveat"] = "UCI lists CC BY 4.0; original GitHub README explicitly lists CC BY-NC-SA 4.0. Resolve the conflicting terms before commercial redistribution."
    if archive.name == "realwaste-subset.zip":
        original = json.loads((ROOT / "original-release.json").read_text())
        summary["downloadUrl"] = None
        summary["imageDownloadUrlTemplate"] = f"https://raw.githubusercontent.com/sam-single/realwaste/{original['commit']}/{{path}}"
        summary["archiveOrigin"] = "Deterministic local archive of Git-blob-verified original-release images; run download_subset.py to reproduce"
        summary["originalReleaseCommit"] = original["commit"]
        summary["uciArchiveDownloadUrl"] = URL
    source_path.write_text(json.dumps(summary, indent=2) + "\n")
    assert len(rows) > 2000, "Unexpected subset size"
    assert all(len({row["split"] for row in rows if row["group"] == group}) == 1 for group in {row["group"] for row in rows})
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == "__main__":
    main()
