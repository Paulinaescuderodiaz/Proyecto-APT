import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-bienvenida',
  standalone: true,
  templateUrl: './bienvenida.page.html',
  styleUrls: ['./bienvenida.page.scss'],
  imports: [IonContent, RouterLink]
})
export class BienvenidaPage {}