import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";

// Contrato del registro enviado por la pantalla: incluye la comuna seleccionada.
interface RegistroData {
  nombre: string;
  email: string;
  password: string;
  comuna: string;
}

interface LoginData {
  email: string;
  password: string;
}

// Respuesta esperada del login: token de sesión y datos públicos del usuario.
interface LoginResponse {
  token: string;
  usuario: { id: number; nombre: string; email: string };
}

@Injectable({ providedIn: "root" })
export class AuthService {
  // Dirección local del backend; actualmente se define aquí, no en los archivos environment.
  private apiUrl = "http://localhost:3000/api/auth";

  constructor(private http: HttpClient) {}

  // Crea una cuenta; el componente que se suscribe decide qué mensaje o navegación mostrar.
  registro(data: RegistroData): Observable<any> {
    return this.http.post(`${this.apiUrl}/registro`, data);
  }

  // Guarda la sesión solo al recibir una respuesta exitosa. Los errores llegan al componente.
  login(data: LoginData): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((respuesta) => {
        // El token se conserva entre recargas y MascotaService lo adjunta a las solicitudes protegidas.
        localStorage.setItem("pethub_token", respuesta.token);
        localStorage.setItem("pethub_usuario", JSON.stringify(respuesta.usuario));
      })
    );
  }

  // Cierra la sesión en este navegador eliminando el token y los datos guardados.
  logout(): void {
    localStorage.removeItem("pethub_token");
    localStorage.removeItem("pethub_usuario");
  }

  // Devuelve null si este navegador aún no tiene un token guardado.
  obtenerToken(): string | null {
    return localStorage.getItem("pethub_token");
  }

  // Solo comprueba la presencia del token; su validez y vencimiento los verifica el backend.
  estaAutenticado(): boolean {
    return !!this.obtenerToken();
  }

  // Recupera los datos de presentación guardados al ingresar; no consulta la API.
  obtenerUsuario(): any {
    const usuario = localStorage.getItem("pethub_usuario");
    return usuario ? JSON.parse(usuario) : null;
  }
}


