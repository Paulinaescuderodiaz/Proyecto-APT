import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Datos ficticios en PostgreSQL efímero; no utiliza cuentas ni archivos personales.
const api = 'http://localhost:3000/api';
const out = process.env.DEMO_OUTPUT || '/tmp/pethub-documentos';
await fs.mkdir(out, { recursive: true });
const user = { nombre: 'Ana Demo', email: 'documentos.demo@example.com', password: 'DemoPethub2026!' };
async function post(ruta, data, token) {
  const res = await fetch(api + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(data) });
  assert(res.ok, `${ruta}: ${res.status}`); return res.json();
}
await post('/auth/registro', user);
const { token } = await post('/auth/login', user);
const mascota = await post('/mascotas', { nombre: 'Luna', especie: 'Gato' }, token);
await post('/registros-medicos', { mascotaId: mascota.id, diagnostico: 'Control de demostración', tratamiento: 'Datos ficticios para comprobar adjuntos.', fecha: '2026-11-08' }, token);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-CL', acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(25000);
const errores = [];
page.on('pageerror', e => errores.push(e.message));
page.on('response', r => { if (r.url().startsWith(api) && r.status() >= 400) errores.push(`${r.status()} ${r.url()}`); });
// PDF pequeño, válido y reproducible.
const stream = 'BT /F1 18 Tf 40 740 Td (PETHUB - EXAMEN DE PRUEBA) Tj 0 -30 Td /F1 12 Tf (Luna. Datos ficticios. Sin validez clinica.) Tj ET';
const objetos = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
let pdf = '%PDF-1.4\n'; const offsets = [0];
for (let i = 0; i < objetos.length; i++) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${objetos[i]}\nendobj\n`; }
const xref = Buffer.byteLength(pdf);
pdf += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('') + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
const pdfBytes = Buffer.from(pdf);
const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOioAAAAASUVORK5CYII=', 'base64');
try {
  await page.goto('http://localhost:4200/login');
  await page.locator('#correo').fill(user.email); await page.locator('#clave').fill(user.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await page.waitForURL('**/home');
  await page.goto(`http://localhost:4200/mascotas?mascotaId=${mascota.id}`);
  const adjuntos = page.locator('app-adjuntar-documento');
  await adjuntos.locator('input[type=file]').waitFor();
  for (const [name, mimeType, buffer] of [['Examen_Luna.pdf', 'application/pdf', pdfBytes], ['Imagen_Luna.png', 'image/png', pngBytes]]) {
    await adjuntos.locator('input[type=file]').setInputFiles({ name, mimeType, buffer });
    await adjuntos.getByRole('button', { name: 'Subir archivo', exact: true }).click();
    await adjuntos.getByRole('button', { name: `Ver ${name}`, exact: true }).waitFor();
  }
  await page.reload();
  await adjuntos.getByRole('button', { name: 'Ver Examen_Luna.pdf', exact: true }).waitFor();
  assert.equal(await adjuntos.locator('ul.documentos li').count(), 2);
  await adjuntos.locator('ul.documentos').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/listado.png` });
  await adjuntos.getByRole('button', { name: 'Ver Imagen_Luna.png', exact: true }).click();
  const visor = page.getByRole('dialog', { name: 'Vista del documento' });
  await visor.waitFor();
  await page.waitForFunction(() => document.querySelector('dialog img')?.naturalWidth > 0);
  await page.keyboard.press('Escape'); await visor.waitFor({ state: 'hidden' });
  await adjuntos.getByRole('button', { name: 'Ver Examen_Luna.pdf', exact: true }).click(); await visor.waitFor();
  assert.match(await visor.locator('iframe').getAttribute('src'), /^blob:/);
  await page.screenshot({ path: `${out}/vista-pdf.png` });
  await visor.getByRole('button', { name: 'Cerrar vista', exact: true }).click();
  await visor.waitFor({ state: 'hidden' });
  const eventoDescarga = page.waitForEvent('download');
  await adjuntos.getByRole('button', { name: 'Descargar Examen_Luna.pdf', exact: true }).click();
  const descarga = await eventoDescarga;
  assert.equal(descarga.suggestedFilename(), 'Examen_Luna.pdf');
  assert.deepEqual(await fs.readFile(await descarga.path()), pdfBytes);
  assert.deepEqual(errores, []);
  await fs.writeFile(`${out}/resultado.json`, JSON.stringify({ success: true, checks: ['Subida PDF y PNG', 'Listado persistente tras recargar', 'Vista de imagen decodificada', 'Vista PDF', 'Cerrar con Escape y botón', 'Descarga con nombre y bytes originales'], errors: errores }, null, 2));
} catch (e) { await page.screenshot({ path: `${out}/error.png`, fullPage: true }); throw e; }
finally { await context.close(); await browser.close(); }
