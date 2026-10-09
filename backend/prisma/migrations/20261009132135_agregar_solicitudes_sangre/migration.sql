-- CreateTable
CREATE TABLE "SolicitudSangre" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "especie" TEXT NOT NULL,
    "grupoSanguineo" TEXT NOT NULL,
    "urgencia" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudSangre_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SolicitudSangre" ADD CONSTRAINT "SolicitudSangre_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
