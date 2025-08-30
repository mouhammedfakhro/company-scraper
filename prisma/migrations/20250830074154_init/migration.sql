-- CreateTable
CREATE TABLE "public"."EmailHandler" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emails" TEXT[],

    CONSTRAINT "EmailHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScraperHandler" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proffIndustryCodes" TEXT[],

    CONSTRAINT "ScraperHandler_pkey" PRIMARY KEY ("id")
);
