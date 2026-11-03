# Aset dan atribusi

| Aset                     | Sumber dan pemakaian                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logo Bilcode             | SVG resmi https://bilcode.id/Bilcode.svg. Path asli dirender dengan `currentColor` agar terbaca di tema terang dan gelap. Logo dipakai sebagai identitas proyek penilaian, bukan klaim layanan resmi Bilcode. |
| Ikon aplikasi dan splash | Dibuat dari path logo yang sama oleh `scripts/mobile-icons.mjs`: glyph putih di atas `#047857`.                                                                                                               |
| Plus Jakarta Sans        | Tokotype, SIL Open Font License. Web: `@fontsource-variable/plus-jakarta-sans`. Mobile: `@expo-google-fonts/plus-jakarta-sans`.                                                                               |
| Ikon antarmuka           | [Lucide](https://lucide.dev), lisensi ISC (`lucide-react`, `lucide-react-native`).                                                                                                                            |
| Peta                     | Tile Esri World Gray Canvas (base + label), © Esri, HERE, Garmin, © OpenStreetMap contributors. Atribusi tampil di setiap peta.                                                                               |
| Foto laporan demo        | 24 foto split train RealWaste, Single, Iranmanesh, dan Raad (2023), DOI 10.24432/C5SS4G. Path asli, checksum, dan prediksi model tercatat di `apps/api/prisma/demo-images/catalog.json`.                      |
| Foto contoh di landing   | Satu foto dari set demo yang sama (`plastic-07`), diperkecil ke WebP di `apps/web/public/images/samples`.                                                                                                     |

Judul, deskripsi, dan lokasi laporan demo di Banda Aceh adalah simulasi. Tidak ada testimoni, mitra, atau
angka operasional yang dikarang. Angka model di landing dibaca langsung dari
`ml/artifacts/evaluation/metrics.json`.
