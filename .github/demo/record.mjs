import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const out=process.env.DEMO_OUTPUT || '/tmp/pethub-demo-output';
await fs.mkdir(out,{recursive:true});
const api='http://localhost:3000/api';
const app='http://localhost:4200';
const password='DemoPethub2026!';
const ana={nombre:'Ana Demo',email:'ana.demo@example.com',password,comuna:'Viña del Mar'};
const mateo={nombre:'Mateo Demo',email:'mateo.demo@example.com',password,comuna:'Viña del Mar'};
for(const user of [ana,mateo]){
 const res=await fetch(`${api}/auth/registro`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(user)});
 assert.equal(res.status,201,`No se creó la cuenta de prueba (${res.status})`);
}
const browser=await chromium.launch({channel:'chrome',headless:true,slowMo:70});
const context=await browser.newContext({viewport:{width:1280,height:720},locale:'es-CL',colorScheme:'light',reducedMotion:'reduce'});
const page=await context.newPage();
page.setDefaultTimeout(20000);
// Captura los fotogramas reales de Chrome sin descargar otro navegador.
const framesDir='/tmp/pethub-demo-frames';
await fs.mkdir(framesDir,{recursive:true});
const cdp=await context.newCDPSession(page);
const frames=[];
const writes=[];
cdp.on('Page.screencastFrame',event=>{
 const name=`frame-${String(frames.length).padStart(8,'0')}.jpg`;
 frames.push({name,time:Date.now()/1000});
 writes.push(fs.writeFile(`${framesDir}/${name}`,Buffer.from(event.data,'base64')));
 cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
});
await cdp.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:1280,maxHeight:720,everyNthFrame:1});
const failures=[];
page.on('response',res=>{if(res.url().startsWith(api)&&res.status()>=400) failures.push(`${res.status()} ${res.url()}`);});
page.on('pageerror',error=>failures.push(error.message));
let index=0;
async function caption(title,text){
 await page.evaluate(({title,text,index})=>{
  document.getElementById('demo-caption')?.remove();
  const node=document.createElement('aside');node.id='demo-caption';
  Object.assign(node.style,{position:'fixed',right:'14px',top:'72px',width:'242px',padding:'20px',borderRadius:'18px',background:'#203c46',color:'#fff',fontFamily:'Arial,sans-serif',fontSize:'16px',lineHeight:'1.5',zIndex:'2147483647',boxSizing:'border-box',boxShadow:'0 8px 30px #0002',pointerEvents:'none'});
  const label=document.createElement('div');label.textContent=`PETHUB · DEMOSTRACIÓN ${String(index).padStart(2,'0')}`;Object.assign(label.style,{fontSize:'10px',letterSpacing:'1px',color:'#afe0d3',marginBottom:'12px'});
  const heading=document.createElement('strong');heading.textContent=title;Object.assign(heading.style,{display:'block',fontSize:'21px',lineHeight:'1.25',marginBottom:'12px'});
  const body=document.createElement('p');body.textContent=text;body.style.margin='0';
  node.append(label,heading,body);document.body.append(node);
 },{title,text,index:++index});
}
async function pause(ms=2500){await page.waitForTimeout(ms);}
async function focus(locator){await locator.scrollIntoViewIfNeeded();await locator.evaluate(el=>{el.style.outline='3px solid #e5aa3c';el.style.outlineOffset='4px';setTimeout(()=>{el.style.outline='';el.style.outlineOffset='';},1000);});await pause(400);}
async function click(locator){await focus(locator);await locator.click();}
async function type(locator,text){await focus(locator);await locator.fill('');await locator.pressSequentially(text,{delay:45});}
async function login(user){
 await page.goto(`${app}/login`);
 await page.locator('#correo').waitFor();
 await caption('Iniciar sesión',`Accedemos con la cuenta de prueba de ${user.nombre}.`);
 await type(page.locator('#correo'),user.email);
 await page.locator('#clave').fill(password);
 await click(page.getByRole('button',{name:'Iniciar sesión',exact:true}));
 await page.waitForURL('**/home');
 await page.getByRole('heading',{name:'Tus mascotas te esperan'}).waitFor();
}
async function cambiarCuenta(user){
 await page.goto(`${app}/perfil`);
 await page.getByRole('button',{name:'Cerrar sesión',exact:true}).waitFor();
 await caption('Dos tutores, dos cuentas','Cerramos la sesión para comprobar el contacto entre personas distintas.');await pause();
 await click(page.getByRole('button',{name:'Cerrar sesión',exact:true}));
 await login(user);
}
async function cover(title,text){
 await page.evaluate(({title,text})=>{
  document.getElementById('demo-cover')?.remove();
  const node=document.createElement('div');node.id='demo-cover';Object.assign(node.style,{position:'fixed',inset:'0',zIndex:'2147483647',background:'#faf8f5',display:'grid',placeContent:'center',textAlign:'center',padding:'80px',fontFamily:'Arial,sans-serif',color:'#203c46'});
  const logo=document.createElement('div');logo.textContent='Pethub';Object.assign(logo.style,{fontSize:'60px',fontWeight:'700',color:'#2d6b6b',marginBottom:'28px'});
  const h=document.createElement('h1');h.textContent=title;Object.assign(h.style,{fontSize:'34px',margin:'0 0 20px'});
  const p=document.createElement('p');p.textContent=text;Object.assign(p.style,{fontSize:'22px',lineHeight:'1.6',maxWidth:'800px',margin:'0'});
  node.append(logo,h,p);document.body.append(node);
 },{title,text});
}
let succeeded=false;
try{
 await page.goto(`${app}/login`);
 await page.locator('#correo').waitFor();
 await cover('Así funciona la aplicación','Carnet sanitario digital y red voluntaria de donantes. Recorrido de la versión web en revisión, con cuentas y datos de prueba.');await pause(4500);
 await page.evaluate(()=>document.getElementById('demo-cover').remove());
 await login(ana);
 await caption('Tu espacio de cuidado','Inicio reúne tus mascotas, los recordatorios de vacunas y los accesos a la red de donantes.');await pause(3500);
 await page.getByRole('link',{name:'Ver todas',exact:true}).click();
 await page.getByRole('heading',{name:'Mis mascotas',level:1,exact:true}).waitFor();
 await caption('Registrar una mascota','Creamos la ficha de Luna. Sus datos se guardan en la cuenta de su tutora.');await pause(1800);
 await click(page.getByRole('button',{name:'Agregar mascota',exact:true}));
 await type(page.locator('#nombre'),'Luna');await page.locator('#especie').selectOption('Gato');await type(page.locator('#raza'),'Mestiza');
 await click(page.getByRole('button',{name:'Agregar a la lista',exact:true}));
 await page.getByRole('button',{name:'Ver ficha de Luna',exact:true}).waitFor();await pause(2200);
 await click(page.getByRole('button',{name:'Ver ficha de Luna',exact:true}));
 await page.getByRole('heading',{name:'Luna',level:1,exact:true}).waitFor();
 await caption('Carnet sanitario','En la ficha consultamos los datos de la mascota y registramos vacunas y sus fechas de refuerzo.');await pause();
 const vacunas=page.locator('app-vacunas');
 await type(vacunas.locator('#nombre-vacuna'),'Triple felina');
 await vacunas.locator('#fecha-aplicacion').fill('2026-10-10');await vacunas.locator('#fecha-refuerzo').fill('2026-12-10');
 await click(vacunas.getByRole('button',{name:'Registrar vacuna',exact:true}));
 await vacunas.getByRole('heading',{name:'Triple felina',exact:true}).waitFor();
 await vacunas.getByRole('heading',{name:'Triple felina',exact:true}).scrollIntoViewIfNeeded();await pause(3000);
 const donante=page.locator('app-donante');
 await donante.getByRole('heading',{name:'Donante voluntario'}).scrollIntoViewIfNeeded();
 await caption('Inscripción voluntaria','Si conocemos su grupo sanguíneo, podemos inscribir a la mascota en la red.');await pause();
 await donante.locator('[name="conoceGrupo"]').check();await type(donante.locator('#grupo-donante'),'A');await donante.locator('[name="acepta"]').check();
 await click(donante.getByRole('button',{name:'Inscribir como donante',exact:true}));
 await donante.getByRole('heading',{name:'Inscripción registrada'}).waitFor();
 await donante.getByRole('heading',{name:'Inscripción registrada'}).scrollIntoViewIfNeeded();
 await caption('Evaluación veterinaria','El registro en Pethub no confirma aptitud médica. La evaluación presencial corresponde al equipo veterinario.');await pause(4500);
 await cambiarCuenta(mateo);
 await page.getByRole('link',{name:/Necesito un donante/}).click();
 await page.getByRole('heading',{name:'Solicitudes de sangre',exact:true}).waitFor();
 await caption('Solicitar un donante','Desde otra cuenta publicamos una solicitud para gato, grupo A, con urgencia alta.');await pause(2200);
 await page.locator('#especie-solicitud').selectOption('Gato');await type(page.locator('#grupo-solicitud'),'A');await page.locator('#urgencia-solicitud').selectOption('alta');
 await click(page.getByRole('button',{name:'Publicar solicitud',exact:true}));
 await page.getByRole('button',{name:'Marcar como resuelta',exact:true}).waitFor();await page.getByRole('heading',{name:'Mis solicitudes',exact:true}).scrollIntoViewIfNeeded();await pause(3000);
 await page.goto(`${app}/buscar-donantes`);
 await caption('Buscar donantes','La búsqueda usa especie y grupo sanguíneo. La comuna permite priorizar la zona.');
 await page.locator('#especie-busqueda').selectOption('Gato');await type(page.locator('#grupo-busqueda'),'A');await page.locator('#comuna-busqueda').selectOption('Viña del Mar');
 await click(page.getByRole('button',{name:'Buscar donantes',exact:true}));
 await page.getByRole('heading',{name:'Luna',level:3,exact:true}).waitFor();await page.getByRole('heading',{name:'Luna',level:3,exact:true}).scrollIntoViewIfNeeded();await pause(3000);
 await caption('Contactar a la tutora','Abrimos una conversación con Ana, tutora de Luna. El aviso veterinario acompaña el contacto.');
 await click(page.getByRole('button',{name:'Contactar al tutor',exact:true}));
 await page.waitForURL('**/conversaciones/*');
 await page.getByRole('heading',{name:'Ana Demo',exact:true}).waitFor();
 const conversacionUrl=page.url();
 await page.locator('app-conversaciones').getByRole('complementary',{name:'Validación veterinaria'}).scrollIntoViewIfNeeded();await pause(3500);
 await type(page.locator('#mensaje'),'Hola Ana, ¿podemos coordinar una evaluación veterinaria para Luna?');
 await click(page.getByRole('button',{name:'Enviar mensaje',exact:true}));
 await page.getByText('Hola Ana, ¿podemos coordinar una evaluación veterinaria para Luna?',{exact:true}).waitFor();await pause(3000);
 await cambiarCuenta(ana);
 await page.getByRole('link',{name:'Notificaciones de solicitudes de sangre',exact:true}).click();
 await page.getByRole('heading',{name:'Solicitud de sangre compatible',exact:true}).waitFor();
 await caption('Avisos dentro de Pethub','Ana recibe un aviso porque la solicitud coincide con su donante. Puede marcarlo como leído.');await pause(3500);
 await click(page.getByRole('button',{name:'Marcar como leída',exact:true}));await page.getByText('Leída',{exact:true}).waitFor();await pause(1500);
 await page.goto(`${app}/conversaciones`);
 await page.getByRole('link',{name:'Mateo Demo',exact:true}).waitFor();
 await caption('Conversaciones guardadas','La otra persona ve el mensaje en su cuenta y puede responder desde la misma conversación.');await pause();
 await click(page.getByRole('link',{name:'Mateo Demo',exact:true}));
 await page.getByText('Hola Ana, ¿podemos coordinar una evaluación veterinaria para Luna?',{exact:true}).waitFor();
 await type(page.locator('#mensaje'),'Hola Mateo, sí. Coordinemos la evaluación presencial con la clínica.');
 await click(page.getByRole('button',{name:'Enviar mensaje',exact:true}));
 await page.getByText('Hola Mateo, sí. Coordinemos la evaluación presencial con la clínica.',{exact:true}).waitFor();await pause(2000);
 await page.reload();
 await page.getByText('Hola Mateo, sí. Coordinemos la evaluación presencial con la clínica.',{exact:true}).waitFor();
 await caption('Persistencia y aviso','Al recargar se conservan los mensajes y el aviso veterinario. Los mensajes nuevos se consultan con Actualizar.');
 await page.locator('app-conversaciones').getByRole('complementary',{name:'Validación veterinaria'}).scrollIntoViewIfNeeded();await pause(4000);
 assert.equal(page.url(),conversacionUrl);
 assert.deepEqual(failures,[],'Se registraron errores en la aplicación');
 await page.screenshot({path:`${out}/chat-final.png`,fullPage:false});
 await cover('Cuidar y conectar','Mascotas · Vacunas · Donantes · Solicitudes · Avisos · Mensajes. Demostración con datos de prueba. Pethub facilita el contacto; no certifica aptitud médica.');await pause(5000);
 succeeded=true;
 await fs.writeFile(`${out}/resultado.json`,JSON.stringify({success:true,flow:'Login, mascota, vacuna, inscripción, solicitud, búsqueda, contacto, aviso, notificación, respuesta y persistencia',apiErrors:failures,commit:process.env.GITHUB_SHA},null,2));
}finally{
 if(!succeeded) await page.screenshot({path:`${out}/error.png`,fullPage:true}).catch(()=>{});
 await cdp.send('Page.stopScreencast');
 const endTime=Date.now()/1000;
 await Promise.all(writes);
 const lines=[];
 for(let i=0;i<frames.length;i++){
  lines.push(`file '${frames[i].name}'`);
  lines.push(`duration ${Math.max(0.02,(frames[i+1]?.time??endTime)-frames[i].time).toFixed(4)}`);
 }
 if(frames.length)lines.push(`file '${frames.at(-1).name}'`);
 await fs.writeFile(`${framesDir}/frames.txt`,lines.join('\n')+'\n');
 await fs.writeFile(`${out}/captura.json`,JSON.stringify({success:succeeded,frames:frames.length,durationSeconds:frames.length?endTime-frames[0].time:0},null,2));
 await context.close();
 await browser.close();
}
