"""Cross-check original-release training bytes against the official UCI archive."""
import csv
import hashlib
import json
import zipfile

from prepare import ROOT, URL, safe_path, sha256


def main():
    archive = ROOT / "data/realwaste.zip"
    rows = list(csv.DictReader((ROOT / "manifest.csv").open()))
    expected = {row["path"]: row["sha256"] for row in rows}
    matched = 0
    digest = sha256(archive)
    with zipfile.ZipFile(archive) as package:
        for name in package.namelist():
            safe_path(ROOT / "data", name)
        assert package.testzip() is None, "UCI ZIP CRC failure"
        for name, expected_digest in expected.items():
            assert hashlib.sha256(package.read(name)).hexdigest() == expected_digest, f"UCI/original-release mismatch: {name}"
            matched += 1
    report = {"downloadUrl": URL, "archiveSha256": digest, "archiveBytes": archive.stat().st_size, "zipCrcVerified": True, "allArchivePathsSafe": True, "manifestImagesCompared": matched, "allImageSha256Match": matched == len(expected), "manifestSha256": sha256(ROOT / "manifest.csv")}
    (ROOT / "uci-verification.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
