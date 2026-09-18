-- CreateTable
CREATE TABLE "RegistroMedico" (
    "id" SERIAL NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tratamiento" TEXT,
    "mascotaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroMedico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RegistroMedico" ADD CONSTRAINT "RegistroMedico_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
