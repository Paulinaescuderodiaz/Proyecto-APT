import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

// Componente raíz: aloja el contenedor Ionic y la página correspondiente a la ruta actual.
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {}
}
