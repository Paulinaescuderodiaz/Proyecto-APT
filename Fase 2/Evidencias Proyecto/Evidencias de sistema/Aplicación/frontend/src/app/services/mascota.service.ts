import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";

// Campos de la respuesta de la API usados por el frontend; raza y foto pueden venir como null.
export interface MascotaBackend {
  id: number;
  nombre: string;
  especie: string;
  raza: string | null;
  foto: string | null;
  usuarioId: number;
  createdAt: string;
}

// Datos editables del formulario. El backend determina el propietario a partir de la sesión.
interface MascotaData {
  nombre: string;
  especie: string;
  raza?: string;
  foto?: string;
}

@Injectable({ providedIn: "root" })
export class MascotaService {
  // Endpoint local compartido por las operaciones de listado, creación y actualización.
  private apiUrl = "http://localhost:3000/api/mascotas";

  constructor(private http: HttpClient) {}

  // Lee el token en cada solicitud. El backend comprueba la sesión y el acceso a las mascotas.
  private headers(): HttpHeaders {
    const token = localStorage.getItem("pethub_token");
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // GET: solicita las mascotas del usuario autenticado.
  listar(): Observable<MascotaBackend[]> {
    return this.http.get<MascotaBackend[]>(this.apiUrl, { headers: this.headers() });
  }

  // POST: guarda una mascota nueva y devuelve su id y datos persistidos.
  crear(data: MascotaData): Observable<MascotaBackend> {
    return this.http.post<MascotaBackend>(this.apiUrl, data, { headers: this.headers() });
  }

  // PUT: modifica la mascota identificada por id, sin crear otra entrada.
  actualizar(id: number, data: MascotaData): Observable<MascotaBackend> {
    return this.http.put<MascotaBackend>(`${this.apiUrl}/${id}`, data, { headers: this.headers() });
  }
}
