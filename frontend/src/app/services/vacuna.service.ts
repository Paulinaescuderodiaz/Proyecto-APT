import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface Vacuna {
  id: number;
  mascotaId: number;
  nombre: string;
  fechaAplicacion: string;
  fechaProximoRefuerzo: string | null;
  aplicada: boolean;
}

export interface DatosVacuna {
  nombre: string;
  fechaAplicacion: string;
  fechaProximoRefuerzo: string | null;
}

@Injectable({ providedIn: 'root' })
export class VacunaService {
  private readonly url = 'http://localhost:3000/api/vacunas';

  constructor(private http: HttpClient) {}

  // Incluye el token del usuario en cada solicitud.
  private opciones() {
    const token = localStorage.getItem('pethub_token') || '';

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  // Obtiene las vacunas de la mascota seleccionada.
  listar(mascotaId: number) {
    return this.http.get<Vacuna[]>(
      `${this.url}/mascota/${mascotaId}`,
      this.opciones()
    );
  }

  // Registra una nueva vacuna.
  crear(mascotaId: number, datos: DatosVacuna) {
    return this.http.post<Vacuna>(
      this.url,
      { ...datos, mascotaId },
      this.opciones()
    );
  }

  // Modifica una vacuna existente por su identificador.
  actualizar(
    id: number,
    datos: DatosVacuna & { aplicada: boolean }
  ) {
    return this.http.put<Vacuna>(
      `${this.url}/${id}`,
      datos,
      this.opciones()
    );
  }
}