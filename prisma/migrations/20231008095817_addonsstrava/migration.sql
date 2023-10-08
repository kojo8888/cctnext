-- CreateTable
CREATE TABLE "Addonsstrava" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "rating" BOOLEAN NOT NULL DEFAULT false,
    "category" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Addonsstrava_pkey" PRIMARY KEY ("id")
);
