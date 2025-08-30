/*
  Warnings:

  - You are about to drop the column `proffIndustryCodes` on the `ScraperHandler` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ScraperHandler" DROP COLUMN "proffIndustryCodes";

-- CreateTable
CREATE TABLE "public"."ProffIndustryCode" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "proffIndustryCodeId" TEXT,

    CONSTRAINT "ProffIndustryCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProffIndustryCode_code_key" ON "public"."ProffIndustryCode"("code");

-- AddForeignKey
ALTER TABLE "public"."ProffIndustryCode" ADD CONSTRAINT "ProffIndustryCode_proffIndustryCodeId_fkey" FOREIGN KEY ("proffIndustryCodeId") REFERENCES "public"."ScraperHandler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
