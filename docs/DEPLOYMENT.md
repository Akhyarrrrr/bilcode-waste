# Deployment

Satu repository GitHub (`Akhyarrrrr/bilcode-waste`) dideploy oleh tiga proyek Vercel yang
membangun langsung dari branch `main`.

| Proyek            | Root           | Runtime                            | URL                                  |
| ----------------- | -------------- | ---------------------------------- | ------------------------------------ |
| bilcode-waste-web | `apps/web`     | Vite, Node 24, output `dist`       | https://bilcode-waste-web.vercel.app |
| bilcode-waste-api | `apps/api`     | Node 24, handler `api/index.ts`    | https://bilcode-waste-api.vercel.app |
| bilcode-waste-ml  | `ml/inference` | FastAPI, Python 3.12, ONNX Runtime | https://bilcode-waste-ml.vercel.app  |

Web meneruskan `/api/*` ke API (`apps/web/vercel.json`), sehingga cookie sesi berada di origin web dan
browser tidak butuh CORS. Install berjalan dari root workspace; `postinstall` membangun kontrak bersama
dan Prisma Client.

## Database dan penyimpanan

- **Neon PostgreSQL** (Free, region Singapore), schema `app`. `DATABASE_URL` untuk runtime (pooled),
  `DIRECT_URL` untuk migration.
- **Vercel Blob privat** untuk foto yang sudah dinormalisasi. Foto hanya dibaca lewat URL bertanda tangan
  yang diterbitkan API.

## Environment variable API

| Variabel                     | Isi                                                           |
| ---------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`, `DIRECT_URL` | Koneksi PostgreSQL                                            |
| `NODE_ENV=production`        | Cookie `Secure` dan pengecekan konfigurasi produksi           |
| `SESSION_SECRET`             | Secret acak ≥ 32 karakter untuk tanda tangan URL foto         |
| `API_URL`, `WEB_ORIGIN`      | Origin API dan web; dipakai untuk CORS dan cek `Origin`       |
| `STORAGE_DRIVER=vercel-blob` | Adapter penyimpanan                                           |
| `BLOB_READ_WRITE_TOKEN`      | Token Blob, hanya di server                                   |
| `ML_URL`, `ML_API_KEY`       | URL layanan model dan kunci internal yang sama dengan FastAPI |
| `DEMO_LOCKED_EMAILS`         | `admin@bilcode-waste.test,user@bilcode-waste.test`            |

Di Vercel, API memercayai `X-Forwarded-For` (rate limit per IP) karena edge Vercel menimpa header itu.
Di luar Vercel, header tersebut diabaikan. Layanan model hanya butuh `ML_API_KEY`; model dan metadata
ikut dibundel dan checksum-nya dicek saat startup.

Mobile membundel URL API publik lewat `apps/mobile/eas.json`. Tidak ada secret server yang ikut ke APK.

## Rilis

1. Merge ke `main`; ketiga proyek Vercel membangun ulang otomatis.
2. Jika ada migration baru: `npm run db:migrate` dengan `DIRECT_URL` produksi.
3. Reset data demo bila perlu: `npm run db:seed -- --reset` dengan environment produksi. Perintah ini hanya
   menghapus laporan dan unggahan milik akun `@bilcode-waste.test`, menghapus akun uji di domain itu, lalu
   mengisi 24 laporan demo. Kata sandi akun demo tidak diubah.
4. Build APK lewat EAS, lalu unggah APK dan SHA-256-nya ke GitHub Releases.

## Cek setelah deploy

1. Halaman status API (`/`) dan ML (`/`) menunjukkan database dan model siap; `/health/ready` berstatus
   `ready`, dan ML `/health` memuat versi `realwaste-mobilenetv3-099ff8e5e058`.
2. Landing terbuka tanpa login; login akun demo; dashboard memuat statistik dan peta.
3. Buat laporan dengan foto: saran AI muncul, laporan terkirim, admin memproses statusnya, dan pelapor
   melihat timeline-nya.
4. Akun demo tidak bisa ganti kata sandi (403 `DEMO_ACCOUNT_LOCKED`); export CSV terunduh.
5. `npm run test:e2e` dengan `E2E_URL=https://bilcode-waste-web.vercel.app`.

Semua hosting memakai paket gratis, jadi ada cold start dan kuota.
