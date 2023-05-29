/*
  Warnings:

  - You are about to drop the `Car` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Car";

-- CreateTable
CREATE TABLE "Packliste" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "transportaion" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "accomodation" TEXT NOT NULL,
    "bike" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Packliste_pkey" PRIMARY KEY ("id")
);
