import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

// Pantalla de presentación. RouterLink permite ir al registro o al login desde el HTML.
@Component({
  selector: 'app-bienvenida',
  standalone: true,
  templateUrl: './bienvenida.page.html',
  styleUrls: ['./bienvenida.page.scss'],
  imports: [IonContent, RouterLink]
})
export class BienvenidaPage {}