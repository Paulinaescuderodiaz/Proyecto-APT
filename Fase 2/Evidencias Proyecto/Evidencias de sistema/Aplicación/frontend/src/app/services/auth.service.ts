import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, tap } from "rxjs";

// Contrato del registro enviado por la pantalla: incluye la comuna seleccionada.
interface RegistroData {
  nombre: string;
  email: string;
  password: string;
  comuna: string;
  telefono?: string;
}

interface LoginData {
  email: string;
  password: string;
}

export interface PerfilUsuario {
  id: number; nombre: string; email: string; telefono?: string | null; comuna?: string | null;
}

// Respuesta esperada del login: token de sesión y datos públicos del usuario.
interface LoginResponse {
  token: string;
  usuario: PerfilUsuario;
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

  private perfilPeticion(datos?: { nombre: string; telefono: string; comuna: string }): Observable<PerfilUsuario> {
    const token = this.obtenerToken();
    const options = { headers: new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {}) };
    const peticion = datos
      ? this.http.put<PerfilUsuario>(`${this.apiUrl}/perfil`, datos, options)
      : this.http.get<PerfilUsuario>(`${this.apiUrl}/perfil`, options);
    return peticion.pipe(tap(usuario => {
      // Una respuesta de una sesión anterior nunca debe reemplazar la sesión actual.
      if (token && this.obtenerToken() === token) localStorage.setItem('pethub_usuario', JSON.stringify(usuario));
    }));
  }

  verPerfil(): Observable<PerfilUsuario> { return this.perfilPeticion(); }
  actualizarPerfil(datos: { nombre: string; telefono: string; comuna: string }): Observable<PerfilUsuario> {
    return this.perfilPeticion(datos);
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


