import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface RecordatorioPendiente {
  id: number;
  estado: string;
  visto: boolean;
  vacunaId: number;
  vacuna: {
    id: number;
    nombre: string;
    mascotaId: number;
    aplicada: boolean;
    fechaProximoRefuerzo: string | null;
  };
}

@Injectable({ providedIn: 'root' })
export class RecordatorioService {
  private apiUrl = 'http://localhost:3000/api/recordatorios';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  listarPendientes(): Observable<RecordatorioPendiente[]> {
    const token = this.authService.obtenerToken();

    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    // Actualmente el backend también marca estos avisos como vistos.
    return this.http.get<RecordatorioPendiente[]>(
      `${this.apiUrl}/pendientes`,
      { headers }
    );
  }
}