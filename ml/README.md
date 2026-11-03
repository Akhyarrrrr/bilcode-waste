# ml

Model klasifikasi sampah (Organik, Plastik, Kertas) dan layanan prediksinya.

| Path                | Isi                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------ |
| `training.ipynb`    | Pipeline lengkap yang sudah dijalankan: data, pelatihan, evaluasi, inferensi ONNX    |
| `scripts/`          | `download_subset.py`, `prepare.py` (split berkelompok), `train.py`, `verify_uci.py`  |
| `artifacts/`        | Model terpilih (`model.pt`, `model.onnx`), metrik, grafik, model card                |
| `inference/`        | Layanan FastAPI + ONNX Runtime yang dideploy                                         |
| `manifest.csv`      | Path, label, hash, kelompok, dan split setiap gambar                                 |
| `tests/`            | Tes persiapan data dan kesetaraan preprocessing                                      |

Hasil, cara reproduksi, dan batasan: [`../docs/ML.md`](../docs/ML.md).
