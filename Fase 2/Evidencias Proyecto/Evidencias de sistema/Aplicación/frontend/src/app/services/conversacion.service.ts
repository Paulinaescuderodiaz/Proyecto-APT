import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface Conversacion {
  id: number;
  con: { id: number; nombre: string };
  ultimoMensaje?: string | null;
  aviso?: string;
}
export interface Mensaje {
  id: number;
  texto: string;
  createdAt: string;
  esMio: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConversacionService {
  private readonly url = 'http://localhost:3000/api/conversaciones';
  constructor(private http: HttpClient) {}
  private opciones() {
    const token = localStorage.getItem('pethub_token');
    return { headers: new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {}) };
  }
  contactar(donanteId: number) {
    return this.http.post<{ id: number; aviso: string }>(this.url, { donanteId }, this.opciones());
  }
  listar() { return this.http.get<Conversacion[]>(this.url, this.opciones()); }
  ver(id: number) { return this.http.get<Conversacion>(`${this.url}/${id}`, this.opciones()); }
  mensajes(id: number) { return this.http.get<Mensaje[]>(`${this.url}/${id}/mensajes`, this.opciones()); }
  enviar(id: number, texto: string) {
    return this.http.post<Mensaje>(`${this.url}/${id}/mensajes`, { texto: texto.trim() }, this.opciones());
  }
}
