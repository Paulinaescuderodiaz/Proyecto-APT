import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [IonContent, FormsModule, RouterLink]
})
export class LoginPage {
  correo = '';
  clave = '';
  mostrarClave = false;
  mensaje = '';

  ingresar(formulario: NgForm): void {
    this.mensaje = '';

    if (formulario.invalid) {
      formulario.control.markAllAsTouched();
      return;
    }

    this.mensaje =
      'El acceso aún no está disponible. Pronto podrás iniciar sesión.';
  }

  ionViewWillLeave(): void {
    this.clave = '';
    this.mostrarClave = false;
    this.mensaje = '';
  }
}
