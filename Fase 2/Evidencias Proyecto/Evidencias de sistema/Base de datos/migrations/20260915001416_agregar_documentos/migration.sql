-- CreateTable
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "rutaArchivo" TEXT NOT NULL,
    "tipoArchivo" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "registroMedicoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_registroMedicoId_fkey" FOREIGN KEY ("registroMedicoId") REFERENCES "RegistroMedico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
