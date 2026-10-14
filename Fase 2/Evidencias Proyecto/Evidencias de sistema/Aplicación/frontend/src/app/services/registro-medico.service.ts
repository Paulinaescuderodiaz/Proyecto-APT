import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

// Registro persistido que devuelve el backend.
export interface RegistroMedico {
  id: number;
  mascotaId: number;
  diagnostico: string;
  fecha: string;
  tratamiento: string | null;
}

// Datos enviados al guardar un diagnóstico.
export interface RegistroMedicoData {
  mascotaId: number;
  diagnostico: string;
  fecha: string;
  tratamiento: string;
}

@Injectable({ providedIn: 'root' })
export class RegistroMedicoService {
  private apiUrl = 'http://localhost:3000/api/registros-medicos';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // El backend verifica el token y que la mascota pertenezca al usuario.
  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.obtenerToken()}`,
    });
  }

  listar(mascotaId: number): Observable<RegistroMedico[]> {
    return this.http.get<RegistroMedico[]>(
      `${this.apiUrl}/mascota/${mascotaId}`,
      { headers: this.headers() }
    );
  }

  crear(datos: RegistroMedicoData): Observable<RegistroMedico> {
    return this.http.post<RegistroMedico>(
      this.apiUrl,
      datos,
      { headers: this.headers() }
    );
  }
}