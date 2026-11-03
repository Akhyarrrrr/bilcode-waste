# Checklist penilaian

Pemetaan setiap poin dari email Bilcode ke implementasi dan buktinya. "Lokal" berarti diverifikasi dengan
API, PostgreSQL, dan model yang berjalan di mesin pengembang; "Cloud" berarti diverifikasi di URL produksi.

## Deliverable

| Diminta                         | Lokasi                                                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| GitHub repository               | https://github.com/Akhyarrrrr/bilcode-waste                                                                    |
| Link demo website               | https://bilcode-waste-web.vercel.app                                                                           |
| APK                             | [GitHub Releases](https://github.com/Akhyarrrrr/bilcode-waste/releases/latest)                                 |
| Dokumentasi API                 | [Swagger](https://bilcode-waste-api.vercel.app/docs), [docs/API.md](API.md), [OpenAPI](openapi.json)           |
| Database schema / ERD           | [docs/ERD.md](ERD.md), [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma), migration          |
| Source code dan model ML        | [`ml/scripts`](../ml/scripts), [`ml/artifacts`](../ml/artifacts) (`model.pt`, `model.onnx`)                    |
| Dataset dan sumbernya           | RealWaste, DOI 10.24432/C5SS4G; [`ml/manifest.csv`](../ml/manifest.csv), [`ml/source.json`](../ml/source.json) |
| Hasil evaluasi model            | [`ml/artifacts/evaluation`](../ml/artifacts/evaluation), [notebook](../ml/training.ipynb), [docs/ML.md](ML.md) |
| README instalasi dan penggunaan | [README.md](../README.md)                                                                                      |
| Video demo ≤ 10 menit           | Tautan dikirim bersama email pengumpulan                                                                       |

## A. Website

| Kebutuhan                  | Implementasi                                                   | Bukti                                                                |
| -------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| Login dan autentikasi role | `apps/api/src/auth.ts`, guard di `apps/web/src/app/guards.tsx` | Tes API (role escalation, sesi, CSRF); E2E login admin/pelapor       |
| Dashboard statistik        | `GET /dashboard`, `features/dashboard`                         | Tes API statistik; screenshot                                        |
| CRUD laporan               | `reports.ts`, `features/reports`                               | Tes API (idempotensi, versi, kepemilikan); E2E buat laporan          |
| Filter dan pencarian       | `q`, `status`, `category`, `from`, `to` di URL                 | Tes API filter; tes unit query; E2E pencarian                        |
| Manajemen pengguna         | `users.ts`, `features/users`                                   | Tes API admin terakhir dan deaktivasi; E2E tambah dan nonaktifkan    |
| Update status 4 tahap      | `PATCH /reports/:id/status`, `status-dialog.tsx`               | Tes API transisi; tes unit dialog; E2E Menunggu → Diproses → Selesai |
| Responsive                 | Tailwind breakpoint, tabel jadi daftar < 768 px                | E2E 360/768/1440 tanpa scroll horizontal                             |

## B. Mobile

| Kebutuhan                           | Implementasi                                            | Bukti                                         |
| ----------------------------------- | ------------------------------------------------------- | --------------------------------------------- |
| Register dan login                  | `app/auth.tsx`, `src/session.tsx`                       | Tes sesi; emulator (login akun demo)          |
| Dashboard pengguna                  | `app/(tabs)/index.tsx`                                  | Emulator, terang dan gelap                    |
| Laporan dengan foto, GPS, deskripsi | `app/create.tsx`, `src/features/create`                 | Tes alur; emulator: galeri → AI → GPS → kirim |
| Riwayat dan status                  | `app/(tabs)/reports.tsx`, `activity.tsx`, `report/[id]` | Emulator: filter, aktivitas, detail, timeline |
| Integrasi API                       | `src/lib/api.ts`, `src/lib/reports.ts`                  | Emulator ke API lokal                         |
| AI image detection                  | `POST /uploads` + `POST /predictions`, `ConfidenceBars` | Emulator: saran "Kertas" dari model asli      |

## C. Machine learning

| Kebutuhan                                         | Bukti                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| ≥ 3 kategori                                      | Organik, Plastik, Kertas                                                   |
| Dataset ≥ 150 gambar                              | 2.268 gambar (train 1.588, validation 340, test 340)                       |
| Python + PyTorch                                  | `ml/scripts/train.py`, PyTorch 2.11                                        |
| Training dan testing                              | Notebook dijalankan ulang 3 Nov 2026, hasilnya identik dengan model deploy |
| Accuracy, confusion matrix, classification report | `ml/artifacts/evaluation/metrics.json` dan PNG; ada di README              |
| Accuracy ≥ 80%                                    | 98,53% (335/340)                                                           |
| REST API prediksi (FastAPI)                       | `ml/inference/app.py`; pytest layanan model                                |

## Pemeriksaan otomatis (lokal)

| Perintah                          | Hasil terakhir                             |
| --------------------------------- | ------------------------------------------ |
| `npm run typecheck`               | Lulus (api, web, mobile, contracts)        |
| `npm run lint`                    | Lulus                                      |
| `npm test`                        | API 18, mobile 32, web 8, kontrak 3: lulus |
| `npm run build`                   | Lulus                                      |
| `npm run test:e2e`                | 7 dari 7 alur lulus                        |
| `npx expo-doctor`                 | 20/20                                      |
| `pytest ml/inference/test_app.py` | 7 lulus                                    |

## Verifikasi produksi (3 November 2026)

| Pemeriksaan                                  | Hasil                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| API `/health`, `/health/ready`, ML `/health` | Versi 1.0.0; database dan model `up`; model `realwaste-mobilenetv3-099ff8e5e058`            |
| E2E Playwright terhadap website produksi     | 7 dari 7 alur lulus                                                                         |
| Akun demo                                    | `isLocked: true`; ganti kata sandi ditolak 403                                              |
| APK 1.0.0 di emulator Android 36             | Login akun demo, foto dari galeri → saran AI "Plastik" dari model produksi → GPS → terkirim |
| Integrasi dua arah                           | Admin mengubah laporan dari APK menjadi Diproses; APK menampilkan status dan catatan admin  |

Data demo di-reset setelah semua pengujian, sehingga yang terlihat penilai hanya 24 laporan demo.

## Belum diverifikasi

- Perangkat Android fisik dan iOS (pengujian mobile memakai emulator Android API 36).
- Uji beban dan cold start pada paket hosting gratis.
