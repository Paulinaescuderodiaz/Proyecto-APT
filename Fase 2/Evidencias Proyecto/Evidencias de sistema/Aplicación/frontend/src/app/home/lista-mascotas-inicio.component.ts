import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, pawOutline } from 'ionicons/icons';
import { MascotaBackend } from '../services/mascota.service';

// La lista solo presenta mascotas; Inicio conserva las consultas y sus estados.
@Component({
  selector: 'app-lista-mascotas-inicio',
  standalone: true,
  imports: [RouterLink, IonIcon],
  templateUrl: './lista-mascotas-inicio.component.html',
  styleUrls: ['./lista-mascotas-inicio.component.scss'],
})
export class ListaMascotasInicioComponent {
  @Input() mascotas: MascotaBackend[] = [];
  @Output() fotoFallida = new EventEmitter<MascotaBackend>();

  constructor() { addIcons({ addOutline, pawOutline }); }
}
