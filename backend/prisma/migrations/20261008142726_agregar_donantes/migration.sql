-- CreateTable
CREATE TABLE "Donante" (
    "id" SERIAL NOT NULL,
    "mascotaId" INTEGER NOT NULL,
    "grupoSanguineo" TEXT,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Donante_mascotaId_key" ON "Donante"("mascotaId");

-- AddForeignKey
ALTER TABLE "Donante" ADD CONSTRAINT "Donante_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
