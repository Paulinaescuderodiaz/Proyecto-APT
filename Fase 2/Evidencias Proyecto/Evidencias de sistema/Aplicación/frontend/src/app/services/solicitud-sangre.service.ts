import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface SolicitudSangre {
  id: number;
  usuarioId: number;
  especie: string;
  grupoSanguineo: string;
  urgencia: 'alta' | 'media' | 'baja';
  estado: 'activa' | 'resuelta';
  createdAt: string;
}

export interface CrearSolicitudSangre {
  especie: 'Perro' | 'Gato';
  grupoSanguineo: string;
  urgencia: 'alta' | 'media' | 'baja';
}

@Injectable({
  providedIn: 'root',
})
export class SolicitudSangreService {
  private readonly url = 'http://localhost:3000/api/solicitudes';

  constructor(private http: HttpClient) {}

  // Recupera el token actual para cada petición.
  private obtenerHeaders(): HttpHeaders {
    const token = localStorage.getItem('pethub_token');

    return new HttpHeaders(
      token ? { Authorization: `Bearer ${token}` } : {}
    );
  }

  publicar(datos: CrearSolicitudSangre) {
    return this.http.post<SolicitudSangre>(this.url, datos, {
      headers: this.obtenerHeaders(),
    });
  }

  // El backend devuelve únicamente las solicitudes del usuario.
  listarMisSolicitudes() {
    return this.http.get<SolicitudSangre[]>(this.url, {
      headers: this.obtenerHeaders(),
    });
  }

  resolver(id: number) {
    return this.http.put<SolicitudSangre>(
      `${this.url}/${id}/resolver`,
      {},
      { headers: this.obtenerHeaders() }
    );
  }
}