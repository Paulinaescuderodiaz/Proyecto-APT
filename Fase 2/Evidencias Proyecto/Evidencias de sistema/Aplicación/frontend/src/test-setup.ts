import { beforeEach } from 'vitest';

// Simula las consultas de pantalla que utilizan los componentes Ionic.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// Almacenamiento en memoria exclusivo de las pruebas.
// No utiliza ni modifica la sesión del navegador real.
const datos = new Map<string, string>();

const almacenamiento: Storage = {
  get length(): number {
    return datos.size;
  },

  clear(): void {
    datos.clear();
  },

  getItem(clave: string): string | null {
    return datos.get(String(clave)) ?? null;
  },

  setItem(clave: string, valor: string): void {
    datos.set(String(clave), String(valor));
  },

  removeItem(clave: string): void {
    datos.delete(String(clave));
  },

  key(indice: number): string | null {
    return Array.from(datos.keys())[indice] ?? null;
  },
};

// Tanto localStorage como window.localStorage usan la misma simulación.
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: almacenamiento,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: almacenamiento,
  });
}

// Evita que una prueba herede la sesión de otra.
beforeEach(() => {
  almacenamiento.clear();
});