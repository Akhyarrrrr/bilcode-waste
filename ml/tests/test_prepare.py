import importlib.util
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location("prepare", Path(__file__).parents[1] / "scripts/prepare.py")
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


def test_archive_traversal_is_rejected():
    for name in ("../evil.jpg", "/evil.jpg", "C:/evil.jpg", "ok/../../evil.jpg", "..\\evil.jpg"):
        with pytest.raises(ValueError):
            prepare.safe_path(Path("data"), name)


def test_grouped_split_is_deterministic_and_disjoint():
    rows = [{"sha256": str(i), "category": ["ORGANIC", "PAPER", "PLASTIC"][i % 3], "dhash": f"{i * 1234567891234567:016x}"} for i in range(90)]
    first = prepare.assign_splits([dict(row) for row in rows], seed=42)
    second = prepare.assign_splits([dict(row) for row in rows], seed=42)
    assert first == second
    assert {row["split"] for row in first} == {"train", "validation", "test"}
    groups = {}
    for row in first:
        groups.setdefault(row["group"], set()).add(row["split"])
    assert all(len(splits) == 1 for splits in groups.values())


def test_similar_hashes_share_group():
    rows = [{"sha256": str(i), "category": "PAPER", "dhash": h} for i, h in enumerate(["0000000000000000", "0000000000000001", "ffffffffffffffff"])]
    result = prepare.assign_splits(rows, seed=42)
    assert result[0]["group"] == result[1]["group"]
