-- CreateTable
CREATE TABLE "Vacuna" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaAplicacion" TIMESTAMP(3) NOT NULL,
    "fechaProximoRefuerzo" TIMESTAMP(3),
    "aplicada" BOOLEAN NOT NULL DEFAULT false,
    "mascotaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vacuna_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Vacuna" ADD CONSTRAINT "Vacuna_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
