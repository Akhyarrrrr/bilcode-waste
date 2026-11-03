-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateEnum
CREATE TYPE "app"."Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "app"."Category" AS ENUM ('ORGANIC', 'PLASTIC', 'PAPER');

-- CreateEnum
CREATE TYPE "app"."Status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "app"."User" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "app"."Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Session" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."AuthAttempt" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Upload" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "objectKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Prediction" (
    "id" UUID NOT NULL,
    "uploadId" UUID NOT NULL,
    "category" "app"."Category" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "scores" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "durationMs" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Report" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "clientRequestId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "category" "app"."Category" NOT NULL,
    "status" "app"."Status" NOT NULL DEFAULT 'PENDING',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "locationLabel" VARCHAR(200) NOT NULL,
    "locationAccuracy" DOUBLE PRECISION,
    "uploadId" UUID NOT NULL,
    "predictionId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."ReportStatusHistory" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "fromStatus" "app"."Status",
    "toStatus" "app"."Status" NOT NULL,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "app"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "app"."Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "app"."Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "app"."Session"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthAttempt_key_createdAt_idx" ON "app"."AuthAttempt"("key", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_objectKey_key" ON "app"."Upload"("objectKey");

-- CreateIndex
CREATE INDEX "Upload_ownerId_createdAt_idx" ON "app"."Upload"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Prediction_uploadId_idx" ON "app"."Prediction"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_number_key" ON "app"."Report"("number");

-- CreateIndex
CREATE INDEX "Report_reporterId_createdAt_idx" ON "app"."Report"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_status_category_createdAt_idx" ON "app"."Report"("status", "category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_clientRequestId_key" ON "app"."Report"("reporterId", "clientRequestId");

-- CreateIndex
CREATE INDEX "ReportStatusHistory_reportId_createdAt_idx" ON "app"."ReportStatusHistory"("reportId", "createdAt");

-- AddForeignKey
ALTER TABLE "app"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Upload" ADD CONSTRAINT "Upload_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "app"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Prediction" ADD CONSTRAINT "Prediction_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "app"."Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "app"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Report" ADD CONSTRAINT "Report_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "app"."Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Report" ADD CONSTRAINT "Report_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "app"."Prediction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ReportStatusHistory" ADD CONSTRAINT "ReportStatusHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "app"."Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ReportStatusHistory" ADD CONSTRAINT "ReportStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "app"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
