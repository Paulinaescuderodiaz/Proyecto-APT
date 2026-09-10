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
  paso = 1;
  nombre = '';
  correo = '';
  clave = '';
  confirmacion = '';
  comuna = '';
  mostrarClave = false;
  mensaje = '';

  // Comunas incluidas en el prototipo.
  comunas = [
    'Valparaíso',
    'Viña del Mar',
    'Quilpué',
    'Villa Alemana',
    'Concón',
    'Casablanca'
  ];

  continuar(formulario: NgForm): void {
    if (formulario.invalid || !this.nombre.trim()) {
      formulario.control.markAllAsTouched();
      return;
    }

    this.mensaje = '';
    this.paso = 2;
  }

  volver(): void {
    this.paso = 1;
    this.mensaje = '';
  }

  registrar(formulario: NgForm): void {
    this.mensaje = '';

    if (
      formulario.invalid ||
      this.clave !== this.confirmacion ||
      !this.comunas.includes(this.comuna)
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
    this.paso = 1;
  }
}