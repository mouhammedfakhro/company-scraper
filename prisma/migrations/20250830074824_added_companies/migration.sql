-- CreateTable
CREATE TABLE "public"."ScrapedCompanies" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapedCompanies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Company" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "State" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "registeredDate" TEXT,
    "description" TEXT,
    "scraperId" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_organizationNumber_key" ON "public"."Company"("organizationNumber");

-- AddForeignKey
ALTER TABLE "public"."Company" ADD CONSTRAINT "Company_scraperId_fkey" FOREIGN KEY ("scraperId") REFERENCES "public"."ScrapedCompanies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
