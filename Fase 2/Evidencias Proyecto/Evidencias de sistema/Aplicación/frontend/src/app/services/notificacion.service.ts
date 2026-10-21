import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface Notificacion {
  id: number;
  usuarioId: number;
  tipo: string;
  mensaje: string;
  solicitudId: number | null;
  leida: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly url = 'http://localhost:3000/api/notificaciones';

  constructor(private http: HttpClient) {}

  // Consulta el token en cada petición; el backend limita el acceso a la cuenta.
  private get headers(): HttpHeaders {
    const token = localStorage.getItem('pethub_token');
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  listar() {
    return this.http.get<Notificacion[]>(this.url, { headers: this.headers });
  }

  marcarLeida(id: number) {
    return this.http.put<Notificacion>(`${this.url}/${id}/leida`, {}, {
      headers: this.headers,
    });
  }
}
