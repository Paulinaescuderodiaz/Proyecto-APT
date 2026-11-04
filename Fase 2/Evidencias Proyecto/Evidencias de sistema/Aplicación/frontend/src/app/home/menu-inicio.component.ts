import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, pawOutline, waterOutline, peopleOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-menu-inicio',
  standalone: true,
  imports: [RouterLink, IonIcon],
  templateUrl: './menu-inicio.component.html',
  styleUrls: ['./menu-inicio.component.scss'],
})
export class MenuInicioComponent {
  constructor() { addIcons({ homeOutline, pawOutline, waterOutline, peopleOutline, personOutline }); }
}
