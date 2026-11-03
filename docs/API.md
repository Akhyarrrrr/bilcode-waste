# API

Base URL produksi: `https://bilcode-waste-api.vercel.app/api/v1`. Kontrak lengkap dan bisa dicoba
langsung ada di [Swagger UI](https://bilcode-waste-api.vercel.app/docs) dan
[OpenAPI JSON](https://bilcode-waste-api.vercel.app/openapi.json). Snapshot di repo
([`docs/openapi.json`](openapi.json)) dibuat ulang dari schema route dengan `npm run docs:openapi`.

## Autentikasi

- **Web** memakai cookie `bw_session` (HttpOnly, SameSite=Lax) lewat proxy same-origin `/api`. Setiap
  request yang mengubah data dengan cookie harus membawa header `Origin` yang diizinkan.
- **Mobile dan klien API** mengirim `"client": "mobile"` saat login/daftar untuk mendapat token, lalu
  memakai `Authorization: Bearer <token>`.
- Token adalah string acak (bukan JWT), berlaku 7 hari. Server hanya menyimpan hash-nya, jadi logout dan
  perubahan akun langsung mencabut sesi.

## Endpoint

| Method   | Path                  | Akses                     | Fungsi                                                             |
| -------- | --------------------- | ------------------------- | ------------------------------------------------------------------ |
| `POST`   | `/auth/register`      | Publik                    | Daftar sebagai Pelapor (peran tidak bisa dipilih klien)            |
| `POST`   | `/auth/login`         | Publik                    | Masuk; rate limit per email dan per IP                             |
| `POST`   | `/auth/logout`        | Login                     | Cabut sesi saat ini                                                |
| `GET`    | `/auth/me`            | Login                     | Profil pengguna, termasuk `isLocked` untuk akun demo               |
| `PATCH`  | `/auth/me`            | Login                     | Ubah nama atau kata sandi (wajib kata sandi saat ini)              |
| `GET`    | `/reports`            | Login                     | Daftar laporan; pelapor hanya melihat miliknya                     |
| `POST`   | `/reports`            | Login                     | Buat laporan; `clientRequestId` membuat pengiriman ulang idempoten |
| `GET`    | `/reports/:id`        | Login                     | Detail, foto, prediksi, dan riwayat status                         |
| `PUT`    | `/reports/:id`        | Pemilik (Menunggu), Admin | Ubah laporan dengan `version`                                      |
| `DELETE` | `/reports/:id`        | Pemilik (Menunggu), Admin | Hapus lunak dengan `version`; riwayat tetap tersimpan              |
| `PATCH`  | `/reports/:id/status` | Admin                     | Ubah status sesuai alur, `note` wajib untuk `REJECTED`             |
| `GET`    | `/reports/export`     | Admin                     | CSV sesuai filter (maks. 5.000 baris)                              |
| `GET`    | `/dashboard`          | Login                     | Statistik dengan cakupan dan filter yang sama seperti daftar       |
| `GET`    | `/users`              | Admin                     | Daftar pengguna (`q`, `role`, `active`, paginasi)                  |
| `POST`   | `/users`              | Admin                     | Tambah pengguna                                                    |
| `PATCH`  | `/users/:id`          | Admin                     | Ubah nama, email, kata sandi, peran, atau status aktif             |
| `POST`   | `/uploads`            | Login                     | Unggah foto (multipart `file`, JPEG/PNG/WebP, maks. 3 MiB)         |
| `GET`    | `/uploads/:id/image`  | URL bertanda tangan       | Ambil foto privat lewat URL yang diterbitkan API                   |
| `POST`   | `/predictions`        | Login (pemilik foto)      | Klasifikasi foto lewat layanan model                               |

Di luar `/api/v1`:

| Path            | Isi                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`             | Halaman status: database, model klasifikasi, versi, dan tautan dokumentasi                                                                  |
| `/health`       | Liveness: `{ status: "ok", service, version, uptimeSeconds }`                                                                               |
| `/health/ready` | Readiness: `ready`, `degraded` (model mati; laporan tetap bisa dibuat dengan kategori manual), atau `unavailable` (database mati, HTTP 503) |
| `/docs`         | Swagger UI                                                                                                                                  |
| `/openapi.json` | Spesifikasi OpenAPI 3                                                                                                                       |

Filter `GET /reports`, `/dashboard`, dan `/reports/export`: `q` (judul, deskripsi, atau nomor),
`status`, `category`, `from` dan `to` (tanggal WIB, `YYYY-MM-DD`). Daftar menambah `page` dan
`pageSize` (maks. 100).

Alur status: `PENDING → IN_PROGRESS → COMPLETED`, dan `PENDING` atau `IN_PROGRESS → REJECTED`. Status
akhir tidak bisa dibuka kembali.

## Format error

Semua error memakai bentuk yang sama, dengan pesan berbahasa Indonesia yang aman ditampilkan:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Data telah berubah. Muat ulang lalu coba kembali.",
    "requestId": "req-3f"
  }
}
```

| Status | Contoh `code`                                                               |
| ------ | --------------------------------------------------------------------------- |
| 400    | `INVALID_INPUT`, `INVALID_IMAGE`, `INVALID_PASSWORD`, `REASON_REQUIRED`     |
| 401    | `UNAUTHENTICATED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS`                 |
| 403    | `FORBIDDEN`, `INVALID_ORIGIN`, `REPORT_LOCKED`, `DEMO_ACCOUNT_LOCKED`       |
| 404    | `NOT_FOUND`                                                                 |
| 409    | `CONFLICT` (versi usang atau transisi tidak sah), `DUPLICATE`, `LAST_ADMIN` |
| 413    | `IMAGE_TOO_LARGE`                                                           |
| 429    | `RATE_LIMITED`                                                              |
| 503    | `AI_UNAVAILABLE`                                                            |

## Contoh dengan curl

Di Windows PowerShell gunakan `curl.exe`, atau jalankan dari Git Bash/WSL.

```bash
API=https://bilcode-waste-api.vercel.app/api/v1

# Masuk sebagai pelapor demo dan simpan token
TOKEN=$(curl -s "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"user@bilcode-waste.test","password":"BilcodeUser2026!","client":"mobile"}' \
  | python -c "import sys, json; print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"

# Laporan milik sendiri yang masih menunggu
curl -s "$API/reports?status=PENDING&pageSize=5" -H "$AUTH"

# Unggah foto, lalu minta prediksi kategori
UPLOAD=$(curl -s "$API/uploads" -H "$AUTH" -F "file=@apps/api/prisma/demo-images/plastic-01.jpg" \
  | python -c "import sys, json; print(json.load(sys.stdin)['id'])")
curl -s "$API/predictions" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"uploadId\":\"$UPLOAD\"}"

# Kirim laporan (ganti predictionId dengan id dari langkah sebelumnya, atau null)
curl -s "$API/reports" -H "$AUTH" -H "Content-Type: application/json" -d "{
  \"title\": \"Botol plastik di trotoar\",
  \"description\": \"Beberapa botol plastik berserakan dekat halte.\",
  \"category\": \"PLASTIC\",
  \"latitude\": 5.553, \"longitude\": 95.3243, \"locationAccuracy\": 12,
  \"locationLabel\": \"Simpang Lima, Banda Aceh\",
  \"uploadId\": \"$UPLOAD\", \"predictionId\": null,
  \"clientRequestId\": \"$(python -c 'import uuid; print(uuid.uuid4())')\"
}"
```

Sebagai admin, ubah status dan unduh CSV:

```bash
ADMIN=$(curl -s "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@bilcode-waste.test","password":"BilcodeAdmin2026!","client":"mobile"}' \
  | python -c "import sys, json; print(json.load(sys.stdin)['token'])")

curl -s -X PATCH "$API/reports/<id>/status" -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS","version":1,"note":"Petugas dijadwalkan besok pagi."}'

curl -s "$API/reports/export?status=COMPLETED" -H "Authorization: Bearer $ADMIN" -o laporan.csv
```

## Layanan model

Layanan FastAPI (`ml/inference/app.py`) bersifat internal: hanya API Node yang memanggilnya, dengan header
`X-API-Key`. Kunci ini tidak pernah dikirim ke klien.

| Method | Path       | Fungsi                                                                                           |
| ------ | ---------- | ------------------------------------------------------------------------------------------------ |
| `GET`  | `/`        | Halaman status model                                                                             |
| `GET`  | `/health`  | Status model, versi layanan, versi model, dan daftar kelas                                       |
| `POST` | `/predict` | Multipart `file`; mengembalikan `category`, `confidence`, `scores`, `modelVersion`, `durationMs` |
