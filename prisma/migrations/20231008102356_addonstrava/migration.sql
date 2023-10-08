/*
  Warnings:

  - You are about to drop the `Addonsstrava` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Addonsstrava";

-- CreateTable
CREATE TABLE "Addonstrava" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 2,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Addonstrava_pkey" PRIMARY KEY ("id")
);
