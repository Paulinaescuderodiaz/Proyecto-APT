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

  mascotaSeleccionada: Mascota | null = null;

verDetalle(mascota: Mascota): void {
  this.mascotaSeleccionada = mascota;
}

volverAlListado(): void {
  this.mascotaSeleccionada = null;
}

  private siguienteId = 1;

abrirFormulario(): void {
  this.editandoId = null;
  this.nombre = '';
  this.especie = '';
  this.raza = '';
  this.mascotaSeleccionada = null;
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

  const datos = {
    nombre: this.nombre.trim(),
    especie: this.especie,
    raza: this.raza.trim(),
  };

  if (this.editandoId !== null) {
    const actualizada: Mascota = {
      id: this.editandoId,
      ...datos,
    };

    this.mascotas = this.mascotas.map(mascota =>
      mascota.id === this.editandoId ? actualizada : mascota
    );

    this.mascotaSeleccionada = actualizada;
  } else {
    this.mascotas = [
      ...this.mascotas,
      {
        id: this.siguienteId++,
        ...datos,
      },
    ];
  }

  this.editandoId = null;
  this.mostrarFormulario = false;
}
  editandoId: number | null = null;

editarMascota(mascota: Mascota): void {
  this.editandoId = mascota.id;
  this.nombre = mascota.nombre;
  this.especie = mascota.especie;
  this.raza = mascota.raza;

  this.mascotaSeleccionada = null;
  this.mostrarFormulario = true;
}

cancelarFormulario(): void {
  if (this.editandoId !== null) {
    this.mascotaSeleccionada =
      this.mascotas.find(m => m.id === this.editandoId) ?? null;
  }

  this.editandoId = null;
  this.mostrarFormulario = false;
}
}