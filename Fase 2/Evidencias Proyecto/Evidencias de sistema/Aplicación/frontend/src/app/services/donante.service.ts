import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface Donante {
  id: number;
  mascotaId: number;
  grupoSanguineo: string | null;
  estado: 'activo' | 'pendiente';
  createdAt: string;
  aviso?: string;
}

export interface CrearDonante {
  mascotaId: number;
  grupoSanguineo: string | null;
  cumpleRequisitos: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DonanteService {
  private readonly url = 'http://localhost:3000/api/donantes';

  constructor(private http: HttpClient) {}

  registrar(datos: CrearDonante) {
    // Recupera el token actual en cada inscripción.
    const token = localStorage.getItem('pethub_token');

    const headers = new HttpHeaders(
      token ? { Authorization: `Bearer ${token}` } : {}
    );

    // El backend verifica que la mascota pertenezca al usuario.
    return this.http.post<Donante>(this.url, datos, { headers });
  }
}