import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const api = 'http://localhost:3000/api';
const out = process.env.DEMO_OUTPUT || '/tmp/pethub-sprint5';
await fs.mkdir(out, {recursive:true});
const user = {nombre:'Paulina Prueba',email:'sprint5@example.com',password:'DemoPethub2026!',comuna:'Viña del Mar'};
async function request(path, method='GET', body, token) {
  const r = await fetch(api+path, {method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  assert(r.ok, `${method} ${path}: ${r.status} ${await (r.ok?Promise.resolve(''):r.text())}`); return r.json();
}
const browser = await chromium.launch({channel:'chrome',headless:true});
const context = await browser.newContext({viewport:{width:1280,height:900},locale:'es-CL'});
const page = await context.newPage(); page.setDefaultTimeout(25000);
const errores=[]; page.on('pageerror',e=>errores.push(e.message));
page.on('response',r=>{if(r.url().startsWith(api)&&r.status()>=400)errores.push(`${r.status()} ${r.url()}`);});
try {
  // Registro real, incluyendo los datos nuevos del tutor.
  await page.goto('http://localhost:4200/registro');
  await page.locator('#nombre').fill(user.nombre); await page.locator('#correo').fill(user.email);
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.locator('#clave').fill(user.password); await page.locator('#confirmacion').fill(user.password);
  await page.locator('#telefono').fill('912345678');
  await page.locator('#comuna').selectOption(user.comuna);
  await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();
  await page.waitForURL('**/login');
  // Ionic conserva el registro oculto: acota los campos al login visible.
  await page.locator('app-login #correo').fill(user.email); await page.locator('app-login #clave').fill(user.password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click(); await page.waitForURL('**/home');
  const token=await page.evaluate(()=>localStorage.getItem('pethub_token'));
  await page.goto('http://localhost:4200/perfil');
  await page.getByRole('button',{name:'Editar perfil',exact:true}).click();
  await page.locator('#perfil-nombre').fill('Paulina Editada');
  await page.locator('#perfil-telefono').fill('987654321'); await page.locator('#perfil-comuna').fill('Quilpué');
  await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();
  await page.getByText('Perfil actualizado correctamente.',{exact:true}).waitFor();
  await page.reload(); await page.getByText('Paulina Editada',{exact:true}).waitFor();
  const perfil=await request('/auth/perfil','GET',null,token);
  assert.equal(perfil.comuna,'Quilpué'); assert.equal(perfil.telefono,'987654321');
  await page.screenshot({path:`${out}/perfil-s5.png`});

  await page.goto('http://localhost:4200/mascotas');
  await page.getByRole('button',{name:'Agregar mascota',exact:true}).click();
  await page.locator('#nombre').fill('Luna S5'); await page.locator('#especie').selectOption('Gato');
  await page.locator('#fecha-nacimiento').fill('2023-03-10'); await page.locator('#sexo').selectOption('hembra');
  await page.getByRole('button',{name:'Agregar a la lista',exact:true}).click();
  await page.getByRole('button',{name:'Ver ficha de Luna S5',exact:true}).click();
  await page.getByRole('heading',{name:'Luna S5',exact:true}).waitFor();
  const mascotas=await request('/mascotas','GET',null,token); const mascota=mascotas.find(m=>m.nombre==='Luna S5');
  assert.equal(mascota.sexo,'hembra'); assert.match(mascota.fechaNacimiento,/^2023-03-10/);
  await page.getByRole('button',{name:'Editar datos',exact:true}).click();
  assert.equal(await page.locator('#fecha-nacimiento').inputValue(),'2023-03-10');
  await page.locator('#fecha-nacimiento').fill('2023-03-11');
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await page.getByRole('button',{name:'Ver ficha de Luna S5',exact:true}).click();

  const vacunas=page.locator('app-vacunas');
  await vacunas.locator('input[formcontrolname=nombre]').fill('Triple felina S5');
  await vacunas.locator('input[formcontrolname=fechaAplicacion]').fill('2026-11-01');
  // Refuerzo en tres días respecto del reloj del entorno: evita depender de una fecha fija.
  const proxima=new Date(); proxima.setDate(proxima.getDate()+3);
  const refuerzo=proxima.toISOString().slice(0,10);
  await vacunas.locator('input[formcontrolname=fechaProximoRefuerzo]').fill(refuerzo);
  await vacunas.locator('#notas-vacuna').fill('Control anual de demostración');
  await vacunas.getByRole('button',{name:'Registrar vacuna',exact:true}).click();
  await vacunas.getByRole('heading',{name:'Triple felina S5',exact:true}).waitFor();
  let lista=await request(`/vacunas/mascota/${mascota.id}`,'GET',null,token);
  assert.equal(lista[0].notas,'Control anual de demostración');
  await request('/recordatorios/ejecutar','POST',{},token);
  await page.goto('http://localhost:4200/home');
  await page.getByText('Triple felina S5',{exact:false}).waitFor();
  await page.screenshot({path:`${out}/recordatorio-s5.png`});
  await page.goto(`http://localhost:4200/mascotas?mascotaId=${mascota.id}`);
  await vacunas.locator('.vacuna button').click();
  await vacunas.locator('input[formcontrolname=aplicada]').check();
  await vacunas.locator('#notas-vacuna').fill('Refuerzo confirmado');
  await vacunas.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await vacunas.getByText('Notas: Refuerzo confirmado',{exact:true}).waitFor();
  lista=await request(`/vacunas/mascota/${mascota.id}`,'GET',null,token); assert.equal(lista[0].aplicada,true);
  await page.goto('http://localhost:4200/home');
  await page.getByText('No tienes recordatorios nuevos.',{exact:true}).waitFor();

  await page.goto(`http://localhost:4200/mascotas?mascotaId=${mascota.id}`);
  const hist=page.locator('app-historial-medico');
  await hist.locator('#diagnostico').fill('Control preventivo S5'); await hist.locator('#fecha-registro').fill('2026-11-10');
  await hist.locator('#tratamiento').fill('Sin tratamiento'); await hist.locator('#veterinario').fill('Dra. Pérez');
  await hist.locator('#motivo').fill('Control anual'); await hist.locator('#recomendaciones').fill('Mantener controles anuales');
  await hist.getByRole('button',{name:'Guardar registro médico',exact:true}).click();
  await hist.getByRole('heading',{name:'Control preventivo S5',exact:true}).waitFor();
  await page.reload(); await hist.getByRole('button',{name:'Ver detalle de consulta',exact:true}).click();
  const detalle=page.getByRole('region',{name:'Detalle de consulta',exact:true});
  await detalle.getByText('Veterinario: Dra. Pérez',{exact:true}).waitFor();
  await detalle.getByText('Recomendaciones: Mantener controles anuales',{exact:true}).waitFor();
  await detalle.scrollIntoViewIfNeeded(); await page.screenshot({path:`${out}/consulta-s5.png`});
  await detalle.getByRole('button',{name:'Cerrar detalle',exact:true}).click();

  await page.goto('http://localhost:4200/notificaciones');
  await page.locator('#tipo-notificacion').selectOption('recordatorio_vacuna');
  await page.getByText('No tienes notificaciones todavía.',{exact:true}).waitFor();
  await page.locator('#tipo-notificacion').selectOption('solicitud_compatible');
  await page.getByText('No tienes notificaciones todavía.',{exact:true}).waitFor();
  await page.screenshot({path:`${out}/filtro-s5.png`});
  assert.deepEqual(errores,[]);
  await fs.writeFile(`${out}/resultado-s5.json`,JSON.stringify({success:true,checks:['Registro con teléfono','Edición y persistencia de perfil','Alta y edición de nacimiento/sexo','Notas de vacuna','Recordatorio próximo y retiro al aplicar refuerzo','Campos y detalle de consulta tras recarga','Filtro por tipo real de API'],errors:errores},null,2));
} catch(e) { await page.screenshot({path:`${out}/error-s5.png`,fullPage:true}); throw e; }
finally { await context.close(); await browser.close(); }
