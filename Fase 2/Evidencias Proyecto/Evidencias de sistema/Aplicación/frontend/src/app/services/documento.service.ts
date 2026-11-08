import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Documento {
  id: number;
  nombreArchivo: string;
  rutaArchivo?: string; // Compatibilidad con respuestas anteriores; no se usa para abrir archivos.
  tipoArchivo: string;
  tamano: number;
  registroMedicoId: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private apiUrl = 'http://localhost:3000/api/documentos';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private cabeceras(): HttpHeaders {
    const token = this.authService.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  listar(registroMedicoId: number): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.apiUrl}/registro/${registroMedicoId}`, { headers: this.cabeceras() });
  }

  obtenerArchivo(id: number, descargar = false): Observable<Blob> {
    const url = `${this.apiUrl}/${id}/archivo${descargar ? '?descargar=1' : ''}`;
    return this.http.get(url, { headers: this.cabeceras(), responseType: 'blob' });
  }

  subir(registroMedicoId: number, archivo: File): Observable<Documento> {
    // Los nombres deben coincidir con los que espera el backend.
    const formulario = new FormData();
    formulario.append('registroMedicoId', String(registroMedicoId));
    formulario.append('archivo', archivo, archivo.name);

    // El navegador define Content-Type y el separador de multipart.
    return this.http.post<Documento>(this.apiUrl, formulario, { headers: this.cabeceras() });
  }
}