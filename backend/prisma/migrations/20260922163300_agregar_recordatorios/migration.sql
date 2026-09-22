-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "pushToken" TEXT;

-- CreateTable
CREATE TABLE "Recordatorio" (
    "id" SERIAL NOT NULL,
    "vacunaId" INTEGER NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Recordatorio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Recordatorio" ADD CONSTRAINT "Recordatorio_vacunaId_fkey" FOREIGN KEY ("vacunaId") REFERENCES "Vacuna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
