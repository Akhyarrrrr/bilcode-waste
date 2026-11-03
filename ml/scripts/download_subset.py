"""Fetch the pinned original release while the slower UCI archive downloads."""
import concurrent.futures
import hashlib
import json
import time
import urllib.parse
import urllib.request
import zipfile

from prepare import MAPPING, ROOT, safe_path


def main():
    data = ROOT / "data"
    data.mkdir(exist_ok=True)
    index = data / "github-source.json"
    if index.exists():
        metadata = json.loads(index.read_text())
    else:
        recorded = ROOT / "original-release.json"
        commit = json.loads(recorded.read_text())["commit"] if recorded.exists() else json.load(urllib.request.urlopen("https://api.github.com/repos/sam-single/realwaste/commits/main", timeout=60))["sha"]
        tree = json.load(urllib.request.urlopen(f"https://api.github.com/repos/sam-single/realwaste/git/trees/{commit}?recursive=1", timeout=60))
        entries = [entry for entry in tree["tree"] if entry["type"] == "blob" and len(entry["path"].split("/")) > 2 and entry["path"].split("/")[1] in MAPPING and entry["path"].lower().endswith(".jpg")]
        metadata = {"commit": commit, "treeSha": tree["sha"], "entries": entries}
        index.write_text(json.dumps(metadata, indent=2))
    assert len(metadata["entries"]) == 2268

    def fetch(entry):
        target = safe_path(data / "github", entry["path"])
        if target.exists():
            content = target.read_bytes()
            if hashlib.sha1(f"blob {len(content)}\0".encode() + content).hexdigest() == entry["sha"]:
                return
        url = f"https://raw.githubusercontent.com/sam-single/realwaste/{metadata['commit']}/" + urllib.parse.quote(entry["path"])
        for attempt in range(4):
            try:
                content = urllib.request.urlopen(url, timeout=90).read()
                if hashlib.sha1(f"blob {len(content)}\0".encode() + content).hexdigest() != entry["sha"]:
                    raise ValueError(f"Git blob SHA mismatch: {entry['path']}")
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(content)
                return
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(1 + attempt)

    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        for count, _ in enumerate(pool.map(fetch, metadata["entries"]), 1):
            if count % 100 == 0:
                print(f"Verified {count}/2268 original-release images", flush=True)
    archive = data / "realwaste-subset.zip"
    temporary = archive.with_suffix(".part")
    with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_STORED) as package:
        for entry in metadata["entries"]:
            info = zipfile.ZipInfo("realwaste-main/" + entry["path"], date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 0
            package.writestr(info, (data / "github" / entry["path"]).read_bytes())
    temporary.replace(archive)
    (ROOT / "original-release.json").write_text(json.dumps({"repository": "https://github.com/sam-single/realwaste", "commit": metadata["commit"], "treeSha": metadata["treeSha"], "images": len(metadata["entries"]), "integrity": "Each image verified against Git blob SHA1 from the pinned tree; manifest adds SHA256", "archive": "Locally assembled unmodified original-release subset; not the UCI archive"}, indent=2))
    print(f"Original-release subset ready: {archive}", flush=True)


if __name__ == "__main__":
    main()
