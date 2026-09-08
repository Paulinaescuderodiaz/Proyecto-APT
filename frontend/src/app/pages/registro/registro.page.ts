import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-registro',
  standalone: true,
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  imports: [IonContent, FormsModule, RouterLink]
})
export class RegistroPage {
  nombre = '';
  correo = '';
  clave = '';
  confirmacion = '';
  mostrarClave = false;
  mensaje = '';

  registrar(formulario: NgForm): void {
    this.mensaje = '';

    if (
      formulario.invalid ||
      !this.nombre.trim() ||
      this.clave !== this.confirmacion
    ) {
      formulario.control.markAllAsTouched();
      return;
    }

    this.mensaje =
      'El registro aún no está disponible. No se ha creado una cuenta.';
  }

  ionViewWillLeave(): void {
    this.clave = '';
    this.confirmacion = '';
    this.mostrarClave = false;
    this.mensaje = '';
  }
}