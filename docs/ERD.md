# Database dan integritas

Schema PostgreSQL `app` dipakai khusus untuk data aplikasi, tidak diekspos melalui Data API publik. Schema/migration sebenarnya berada di apps/api/prisma.

```mermaid
erDiagram
    User ||--o{ Session : authenticates
    User ||--o{ Report : submits
    User ||--o{ Upload : owns
    User ||--o{ ReportStatusHistory : acts
    Upload ||--o{ Prediction : classifies
    Upload ||--o{ Report : illustrates
    Prediction o|--o{ Report : informs
    Report ||--|{ ReportStatusHistory : records
    User {
        uuid id PK
        string email UK
        string passwordHash
        enum role
        boolean isActive
    }
    Session {
        uuid id PK
        string tokenHash UK
        uuid userId FK
        timestamptz expiresAt
    }
    Report {
        uuid id PK
        int number UK
        string title
        string description
        string locationLabel
        boolean isDemo
        uuid reporterId FK
        uuid clientRequestId
        uuid uploadId FK
        uuid predictionId FK
        enum category
        enum status
        float latitude
        float longitude
        int version
        timestamptz deletedAt
    }
    Upload {
        uuid id PK
        uuid ownerId FK
        string objectKey UK
        string sha256
        int bytes
    }
    Prediction {
        uuid id PK
        uuid uploadId FK
        enum category
        float confidence
        json scores
        string modelVersion
    }
    AuthAttempt {
        uuid id PK
        string key
        timestamptz createdAt
    }
    ReportStatusHistory {
        uuid id PK
        uuid reportId FK
        uuid actorId FK
        enum fromStatus
        enum toStatus
        string note
        timestamptz createdAt
    }
```

- Unique reporterId+clientRequestId menjaga idempotency; nomor laporan memakai sequence PostgreSQL.
- Indeks reporterId+createdAt dan status+category+createdAt mendukung scope/filter/pagination.
- Constraint memvalidasi rentang koordinat, akurasi nonnegatif, versi, ukuran foto, confidence dan durasi.
- Transaksi update status memakai pemeriksaan versi dan menyimpan riwayat dalam transaksi yang sama.
- Advisory transaction lock menyerialkan perubahan admin terakhir dan konsumsi rate limit lintas instance.
- `AuthAttempt` menyimpan hash scope dan timestamp percobaan; tidak menyimpan password atau email plaintext.
- Seluruh timestamp UTC bertipe timestamptz. Soft delete mengeluarkan laporan dari seluruh query daftar/statistik.
