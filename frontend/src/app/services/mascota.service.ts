import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";

export interface MascotaBackend {
  id: number;
  nombre: string;
  especie: string;
  raza: string | null;
  foto: string | null;
  usuarioId: number;
  createdAt: string;
}

interface MascotaData {
  nombre: string;
  especie: string;
  raza?: string;
  foto?: string;
}

@Injectable({ providedIn: "root" })
export class MascotaService {
  private apiUrl = "http://localhost:3000/api/mascotas";

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem("pethub_token");
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  listar(): Observable<MascotaBackend[]> {
    return this.http.get<MascotaBackend[]>(this.apiUrl, { headers: this.headers() });
  }

  crear(data: MascotaData): Observable<MascotaBackend> {
    return this.http.post<MascotaBackend>(this.apiUrl, data, { headers: this.headers() });
  }

  actualizar(id: number, data: MascotaData): Observable<MascotaBackend> {
    return this.http.put<MascotaBackend>(`${this.apiUrl}/${id}`, data, { headers: this.headers() });
  }
}
