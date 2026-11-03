/**
 * Demo data for the assessment: two shared login accounts, four extra reporters
 * and 24 reports around Banda Aceh. Photos are RealWaste train-split images and
 * predictions are the model's real output for them (see demo-images/catalog.json).
 *
 *   npm run db:seed              adds missing demo reports, never touches existing data
 *   npm run db:seed -- --reset   first removes every report/upload owned by demo accounts
 */
import { readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import sharp from "sharp";
import type { Category, Status } from "@bilcode/contracts";
import { db } from "../src/db.js";
import { storeImage, removeImage } from "../src/storage.js";

interface CatalogEntry {
  file: string;
  prediction: {
    category: Category;
    confidence: number;
    scores: Record<Category, number>;
    modelVersion: string;
    durationMs: number;
  };
}
interface DemoReport {
  image: string;
  title: string;
  description: string;
  place: string;
  at: [number, number];
  status: Status;
  daysAgo: number;
  reporter: number;
  /** Reporter picked the category manually (AI result not used). */
  manual?: boolean;
  note?: string;
}

const DOMAIN = "bilcode-waste.test";
const HOUR = 3600000;
const reset = process.argv.includes("--reset");
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const userPassword = process.env.SEED_USER_PASSWORD;
if (
  !adminPassword ||
  !userPassword ||
  adminPassword.length < 12 ||
  userPassword.length < 12
)
  throw new Error(
    "Set SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD (minimum 12 characters).",
  );

const accounts = [
  {
    name: "Admin Demo",
    email: process.env.SEED_ADMIN_EMAIL ?? `admin@${DOMAIN}`,
    role: "ADMIN" as const,
    password: adminPassword,
  },
  {
    name: "Pelapor Demo",
    email: process.env.SEED_USER_EMAIL ?? `user@${DOMAIN}`,
    role: "USER" as const,
    password: userPassword,
  },
  // Extra reporters exist only to own reports; their passwords are random and never shared.
  ...[
    ["Cut Rahmi", "rahmi"],
    ["Teuku Fadhil", "fadhil"],
    ["Nurul Aini", "aini"],
    ["Rizky Maulana", "rizky"],
  ].map(([name, handle]) => ({
    name: name!,
    email: `${handle}@${DOMAIN}`,
    role: "USER" as const,
    password: randomBytes(24).toString("base64url"),
  })),
];
const users = [];
for (const account of accounts)
  users.push(
    await db.user.upsert({
      where: { email: account.email },
      update: {},
      create: {
        name: account.name,
        email: account.email,
        role: account.role,
        passwordHash: await argon2.hash(account.password),
      },
    }),
  );
const [admin, ...reporters] = users as [
  (typeof users)[number],
  ...typeof users,
];
if (reset) {
  // Every account on the reserved .test domain belongs to this project (seed, E2E, APK checks).
  const ownerIds = (
    await db.user.findMany({
      where: { email: { endsWith: `@${DOMAIN}` } },
      select: { id: true },
    })
  ).map((u) => u.id);
  const reports = await db.report.findMany({
    where: { reporterId: { in: ownerIds } },
    select: { id: true },
  });
  const uploads = await db.upload.findMany({
    where: { ownerId: { in: ownerIds } },
    select: { id: true, objectKey: true },
  });
  await db.$transaction([
    db.reportStatusHistory.deleteMany({
      where: { reportId: { in: reports.map((r) => r.id) } },
    }),
    db.report.deleteMany({ where: { id: { in: reports.map((r) => r.id) } } }),
    db.prediction.deleteMany({
      where: { uploadId: { in: uploads.map((u) => u.id) } },
    }),
    db.upload.deleteMany({ where: { id: { in: uploads.map((u) => u.id) } } }),
  ]);
  for (const { objectKey } of uploads)
    await removeImage(objectKey).catch(() => undefined);
  const leftovers = await db.user.deleteMany({
    where: {
      id: { in: ownerIds },
      email: { notIn: accounts.map((a) => a.email) },
      events: { none: {} },
    },
  });
  if ((await db.report.count()) === 0)
    await db.$executeRaw`ALTER SEQUENCE app."Report_number_seq" RESTART WITH 1`;
  console.log(
    `Reset: removed ${reports.length} reports, ${uploads.length} uploads and ${leftovers.count} test accounts.`,
  );
}

const catalog = JSON.parse(
  await readFile(
    new URL("./demo-images/catalog.json", import.meta.url),
    "utf8",
  ),
) as CatalogEntry[];
const byFile = new Map(catalog.map((entry) => [entry.file, entry]));

const notes = {
  IN_PROGRESS: [
    "Laporan diteruskan ke petugas kebersihan kecamatan.",
    "Lokasi sudah diverifikasi. Pengangkutan dijadwalkan besok pagi.",
    "Petugas sedang menuju lokasi.",
  ],
  COMPLETED: [
    "Sampah sudah diangkut dan area telah dibersihkan.",
    "Sudah dibersihkan petugas. Terima kasih atas laporannya.",
    "Pengangkutan selesai bersama jadwal rutin pagi.",
  ],
};

const data: DemoReport[] = [
  {
    image: "organic-03.jpg",
    title: "Sisa sayur menumpuk di pinggir Pasar Peunayong",
    description:
      "Sisa sayur dan kulit buah dibuang di sisi jalan dekat los pedagang sejak pagi. Mulai berbau dan dikerumuni lalat.",
    place: "Pasar Peunayong, Kuta Alam",
    at: [5.5571, 95.3237],
    status: "COMPLETED",
    daysAgo: 27,
    reporter: 1,
  },
  {
    image: "plastic-07.jpg",
    title: "Botol plastik terdampar di Pantai Ulee Lheue",
    description:
      "Beberapa botol minuman plastik terdampar di garis pantai dekat dermaga. Perlu dipungut sebelum terbawa lagi ke laut.",
    place: "Pantai Ulee Lheue, Meuraxa",
    at: [5.5617, 95.2896],
    status: "COMPLETED",
    daysAgo: 26,
    reporter: 0,
  },
  {
    image: "paper-03.jpg",
    title: "Brosur berserakan di Simpang Lima",
    description:
      "Brosur promosi berserakan di trotoar setelah dibagikan, sebagian sudah masuk ke saluran air.",
    place: "Simpang Lima, Baiturrahman",
    at: [5.553, 95.3243],
    status: "COMPLETED",
    daysAgo: 25,
    reporter: 2,
  },
  {
    image: "organic-05.jpg",
    title: "Rumput hasil pangkas belum diangkut",
    description:
      "Potongan rumput dan ranting dari pemangkasan taman dibiarkan menumpuk di tepi jalan selama beberapa hari.",
    place: "Taman Sari, Baiturrahman",
    at: [5.5528, 95.3175],
    status: "COMPLETED",
    daysAgo: 24,
    reporter: 0,
  },
  {
    image: "plastic-05.jpg",
    title: "Kemasan makanan ringan di Lapangan Blang Padang",
    description:
      "Kemasan makanan ringan tertinggal setelah kegiatan olahraga pagi, tersebar di sekitar bangku penonton.",
    place: "Lapangan Blang Padang, Baiturrahman",
    at: [5.5489, 95.3147],
    status: "REJECTED",
    daysAgo: 23,
    reporter: 3,
    note: "Area sudah dibersihkan panitia kegiatan sebelum laporan ditinjau.",
  },
  {
    image: "paper-06.jpg",
    title: "Tumpukan koran bekas di depan ruko",
    description:
      "Koran dan kertas bekas diikat lalu ditinggal di depan ruko kosong. Kertasnya sudah basah terkena hujan.",
    place: "Jl. Teuku Umar, Setui",
    at: [5.539, 95.322],
    status: "COMPLETED",
    daysAgo: 22,
    reporter: 1,
  },
  {
    image: "plastic-06.jpg",
    title: "Styrofoam tersangkut di Krueng Aceh",
    description:
      "Potongan styrofoam tersangkut di pinggir sungai dekat jembatan dan menahan sampah lain yang hanyut.",
    place: "Krueng Aceh, Jembatan Pante Pirak",
    at: [5.556, 95.322],
    status: "COMPLETED",
    daysAgo: 20,
    reporter: 0,
  },
  {
    image: "organic-01.jpg",
    title: "Sisa makanan di area kuliner malam",
    description:
      "Sisa makanan dari lapak kuliner malam ditinggal di dalam kantong yang sobek dan mulai dibongkar hewan.",
    place: "Kawasan kuliner Lampriet, Kuta Alam",
    at: [5.566, 95.3345],
    status: "COMPLETED",
    daysAgo: 19,
    reporter: 4,
  },
  {
    image: "paper-05.jpg",
    title: "Kertas katalog menumpuk di halte Lampineung",
    description:
      "Lembaran katalog dan kertas iklan menumpuk di halte, sebagian terbang ke badan jalan.",
    place: "Halte Jl. T. Nyak Arief, Lampineung",
    at: [5.5703, 95.3397],
    status: "COMPLETED",
    daysAgo: 18,
    reporter: 2,
  },
  {
    image: "organic-06.jpg",
    title: "Tanah dan sisa kompos di trotoar",
    description:
      "Tumpukan tanah bercampur sisa kompos menutup sebagian trotoar di depan rumah warga.",
    place: "Gampong Neusu, Baiturrahman",
    at: [5.542, 95.317],
    status: "REJECTED",
    daysAgo: 16,
    reporter: 0,
    note: "Material berupa tanah urug proyek rumah warga, bukan sampah rumah tangga. Mohon dikoordinasikan dengan pemilik.",
  },
  {
    image: "plastic-01.jpg",
    title: "Wadah plastik hitam di parkiran Pasar Aceh",
    description:
      "Wadah makanan plastik hitam bekas dibuang di area parkir sepeda motor.",
    place: "Pasar Aceh, Baiturrahman",
    at: [5.5545, 95.3195],
    status: "COMPLETED",
    daysAgo: 15,
    reporter: 3,
  },
  {
    image: "paper-08.jpg",
    title: "Kertas bekas fotokopi di sekitar kampus",
    description:
      "Kertas bekas fotokopi dibuang di dekat pagar dan beterbangan setiap kali angin kencang.",
    place: "Kopelma Darussalam, Syiah Kuala",
    at: [5.5682, 95.3693],
    status: "COMPLETED",
    daysAgo: 13,
    reporter: 4,
  },
  {
    image: "organic-07.jpg",
    title: "Daun kering menutup saluran drainase",
    description:
      "Daun dan ranting kering menutupi saluran drainase sehingga air menggenang setiap kali hujan.",
    place: "Jl. Tgk. Chik Ditiro, Peuniti",
    at: [5.549, 95.326],
    status: "COMPLETED",
    daysAgo: 11,
    reporter: 0,
  },
  {
    image: "plastic-08.jpg",
    title: "Botol kecil di area Pelabuhan Lampulo",
    description:
      "Botol kecil dan kemasan plastik tertinggal di dekat tempat pelelangan ikan.",
    place: "Pelabuhan Perikanan Lampulo, Kuta Alam",
    at: [5.586, 95.324],
    status: "IN_PROGRESS",
    daysAgo: 9,
    reporter: 1,
  },
  {
    image: "organic-08.jpg",
    title: "Potongan tanaman di median jalan",
    description:
      "Potongan tanaman hias dari perapian median jalan belum diangkut dan mulai mengering.",
    place: "Jl. Sultan Iskandar Muda, Punge",
    at: [5.5478, 95.3149],
    status: "IN_PROGRESS",
    daysAgo: 8,
    reporter: 2,
  },
  {
    image: "paper-07.jpg",
    title: "Brosur basah di depan gerbang sekolah",
    description:
      "Brosur promosi berserakan di depan gerbang sekolah dan menempel di jalan setelah hujan.",
    place: "Gampong Keudah, Kuta Raja",
    at: [5.56, 95.314],
    status: "IN_PROGRESS",
    daysAgo: 7,
    reporter: 0,
  },
  {
    image: "plastic-02.jpg",
    title: "Kemasan plastik di tepi Pantai Alue Naga",
    description:
      "Kemasan plastik bekas perlengkapan mandi tertinggal di tepi pantai setelah akhir pekan.",
    place: "Pantai Alue Naga, Syiah Kuala",
    at: [5.6004, 95.3592],
    status: "IN_PROGRESS",
    daysAgo: 6,
    reporter: 3,
  },
  {
    image: "paper-01.jpg",
    title: "Tisu bekas di area parkir",
    description:
      "Tisu dan kertas bekas berserakan di area parkir setelah acara.",
    place: "Kawasan Masjid Raya Baiturrahman",
    at: [5.5536, 95.3171],
    status: "REJECTED",
    daysAgo: 5,
    reporter: 4,
    note: "Foto belum menunjukkan titik lokasi dengan jelas. Silakan kirim ulang dengan foto yang memperlihatkan lokasinya.",
  },
  {
    image: "organic-02.jpg",
    title: "Sisa roti berjamur di bak sampah terbuka",
    description:
      "Sisa roti dan makanan berjamur menumpuk di bak sampah terbuka dan dibongkar kucing liar.",
    place: "Gampong Lamteumen, Jaya Baru",
    at: [5.54, 95.3],
    status: "IN_PROGRESS",
    daysAgo: 4,
    reporter: 0,
  },
  {
    image: "plastic-04.jpg",
    title: "Tutup botol berserakan di taman bermain",
    description:
      "Puluhan tutup botol plastik berserakan di area taman bermain anak dan berbahaya bila tertelan.",
    place: "Taman Putroe Phang, Baiturrahman",
    at: [5.5506, 95.3196],
    status: "PENDING",
    daysAgo: 3,
    reporter: 1,
  },
  {
    image: "paper-02.jpg",
    title: "Kertas bungkus nasi di bahu jalan",
    description:
      "Kertas pembungkus nasi dibuang di bahu jalan dekat deretan warung makan.",
    place: "Gampong Jeulingke, Syiah Kuala",
    at: [5.579, 95.348],
    status: "PENDING",
    daysAgo: 2,
    reporter: 0,
  },
  {
    image: "organic-04.jpg",
    title: "Buah busuk di depan kios Terminal Batoh",
    description:
      "Buah busuk dibuang di depan kios buah dan mulai mengundang lalat.",
    place: "Terminal Batoh, Lueng Bata",
    at: [5.531, 95.333],
    status: "PENDING",
    daysAgo: 1,
    reporter: 2,
    manual: true,
  },
  {
    image: "paper-04.jpg",
    title: "Bungkus kertas makanan di Lambaro Skep",
    description:
      "Bungkus kertas makanan tersebar di depan deretan warung dan terbawa angin ke selokan.",
    place: "Gampong Lambaro Skep, Kuta Alam",
    at: [5.5745, 95.3415],
    status: "PENDING",
    daysAgo: 1,
    reporter: 0,
    manual: true,
  },
  {
    image: "plastic-03.jpg",
    title: "Botol sabun cair menyumbat saluran air",
    description:
      "Beberapa botol plastik bekas sabun masuk ke saluran air dan menyumbat sebagian aliran.",
    place: "Gampong Beurawe, Kuta Alam",
    at: [5.5585, 95.3405],
    status: "PENDING",
    daysAgo: 0,
    reporter: 3,
  },
];

const now = Date.now();
const wibMidnight = (daysAgo: number) => {
  const day = new Date(now - daysAgo * 24 * HOUR).toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  });
  return new Date(`${day}T00:00:00+07:00`).getTime();
};
const notLater = (time: number) => new Date(Math.min(time, now - 5 * 60000));

let added = 0;
for (const [i, item] of data.entries()) {
  const reporter = reporters[item.reporter]!;
  const clientRequestId = `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
  const existing = await db.report.findUnique({
    where: {
      reporterId_clientRequestId: { reporterId: reporter.id, clientRequestId },
    },
  });
  if (existing) continue;
  const entry = byFile.get(item.image);
  if (!entry) throw new Error(`Missing catalog entry for ${item.image}`);
  const bytes = await sharp(
    await readFile(new URL(`./demo-images/${item.image}`, import.meta.url)),
  )
    .rotate()
    .webp({ quality: 82 })
    .toBuffer();
  const objectKey = await storeImage(bytes);
  // Spread submissions across the day (07:00–20:00 WIB) without RNG so reseeding is stable.
  const createdAt = notLater(
    wibMidnight(item.daysAgo) + (7 + ((i * 5) % 14)) * HOUR,
  );
  const step = (hours: number) => notLater(createdAt.getTime() + hours * HOUR);
  try {
    await db.$transaction(async (tx) => {
      const upload = await tx.upload.create({
        data: {
          ownerId: reporter.id,
          objectKey,
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          createdAt,
        },
      });
      const prediction = item.manual
        ? null
        : await tx.prediction.create({
            data: { uploadId: upload.id, ...entry.prediction, createdAt },
          });
      const report = await tx.report.create({
        data: {
          reporterId: reporter.id,
          clientRequestId,
          title: item.title,
          description: item.description,
          category: entry.prediction.category,
          status: item.status,
          uploadId: upload.id,
          predictionId: prediction?.id ?? null,
          latitude: item.at[0],
          longitude: item.at[1],
          locationAccuracy: 8 + (i % 5) * 4,
          locationLabel: item.place,
          isDemo: true,
          createdAt,
          updatedAt: createdAt,
          history: {
            create: { actorId: reporter.id, toStatus: "PENDING", createdAt },
          },
        },
      });
      const transitions: [Status, Status, string, number][] = [];
      if (item.status !== "PENDING" && item.status !== "REJECTED")
        transitions.push([
          "PENDING",
          "IN_PROGRESS",
          notes.IN_PROGRESS[i % 3]!,
          2 + (i % 4),
        ]);
      if (item.status === "COMPLETED")
        transitions.push([
          "IN_PROGRESS",
          "COMPLETED",
          notes.COMPLETED[i % 3]!,
          20 + (i % 5) * 6,
        ]);
      if (item.status === "REJECTED")
        transitions.push(["PENDING", "REJECTED", item.note!, 3]);
      let updatedAt = createdAt;
      for (const [fromStatus, toStatus, note, hours] of transitions) {
        updatedAt = step(hours);
        await tx.reportStatusHistory.create({
          data: {
            reportId: report.id,
            actorId: admin.id,
            fromStatus,
            toStatus,
            note,
            createdAt: updatedAt,
          },
        });
      }
      await tx.report.update({
        where: { id: report.id },
        data: { updatedAt, version: transitions.length + 1 },
      });
    });
    added++;
  } catch (error) {
    await removeImage(objectKey).catch(() => undefined);
    throw error;
  }
}
console.log(
  `Seed complete: ${added} demo reports added; existing users and passwords unchanged.`,
);
await db.$disconnect();
