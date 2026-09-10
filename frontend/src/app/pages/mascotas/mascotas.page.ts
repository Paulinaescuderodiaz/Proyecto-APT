import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { IonContent } from '@ionic/angular';

interface Mascota {
  id: number;
  nombre: string;
  especie: string;
  raza: string;
}

@Component({
  selector: 'app-mascotas',
  standalone: true,
  templateUrl: './mascotas.page.html',
  styleUrls: ['./mascotas.page.scss'],
  imports: [IonContent, FormsModule],
})
export class MascotasPage {
  mascotas: Mascota[] = [];
  mostrarFormulario = false;

  nombre = '';
  especie = '';
  raza = '';

  private siguienteId = 1;

  abrirFormulario(): void {
    this.nombre = '';
    this.especie = '';
    this.raza = '';
    this.mostrarFormulario = true;
  }

  agregar(formulario: NgForm): void {
    if (
      formulario.invalid ||
      !this.nombre.trim() ||
      !['Perro', 'Gato'].includes(this.especie)
    ) {
      formulario.control.markAllAsTouched();
      return;
    }

    this.mascotas = [
      ...this.mascotas,
      {
        id: this.siguienteId++,
        nombre: this.nombre.trim(),
        especie: this.especie,
        raza: this.raza.trim(),
      },
    ];

    this.mostrarFormulario = false;
  }
}