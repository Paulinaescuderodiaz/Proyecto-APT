import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";

interface RegistroData {
  nombre: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  usuario: { id: number; nombre: string; email: string };
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private apiUrl = "http://localhost:3000/api/auth";

  constructor(private http: HttpClient) {}

  registro(data: RegistroData): Observable<any> {
    return this.http.post(`${this.apiUrl}/registro`, data);
  }

  login(data: LoginData): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((respuesta) => {
        localStorage.setItem("pethub_token", respuesta.token);
        localStorage.setItem("pethub_usuario", JSON.stringify(respuesta.usuario));
      })
    );
  }

  logout(): void {
    localStorage.removeItem("pethub_token");
    localStorage.removeItem("pethub_usuario");
  }

  obtenerToken(): string | null {
    return localStorage.getItem("pethub_token");
  }

  estaAutenticado(): boolean {
    return !!this.obtenerToken();
  }

  obtenerUsuario(): any {
    const usuario = localStorage.getItem("pethub_usuario");
    return usuario ? JSON.parse(usuario) : null;
  }
}
