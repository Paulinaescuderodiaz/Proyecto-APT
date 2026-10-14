import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Documento {
  id: number;
  nombreArchivo: string;
  rutaArchivo: string;
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

  subir(registroMedicoId: number, archivo: File): Observable<Documento> {
    // Los nombres deben coincidir con los que espera el backend.
    const formulario = new FormData();
    formulario.append('registroMedicoId', String(registroMedicoId));
    formulario.append('archivo', archivo, archivo.name);

    const token = this.authService.obtenerToken();

    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    // El navegador define Content-Type y el separador de multipart.
    return this.http.post<Documento>(this.apiUrl, formulario, { headers });
  }
}