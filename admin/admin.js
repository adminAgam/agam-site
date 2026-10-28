(async()=>{
const cfg=window.AGAM_BACKEND||{}, configured=/^https:\/\/.+\.supabase\.co$/.test(cfg.url||'') && !String(cfg.anonKey||'').startsWith('PEGA_');
const $=s=>document.querySelector(s), esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
if(!configured){$('#loginMessage').textContent='Backend aún no configurado. Completa config.js.';return}
const sb=window.supabase.createClient(cfg.url,cfg.anonKey), defaults=window.AGAM_DEFAULT_CONTENT;
let data=structuredClone(defaults), session=null, pendingFile=null, busy=false; data.projectImages={};
const titles={dashboard:'Panel administrativo',projects:'Proyectos',clients:'Clientes',settings:'Configuración'};
function notice(msg,type='ok'){const n=$('#notice');n.className='notice '+(type==='error'?'noticeError':'');n.innerHTML=msg}
function go(id){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('.navbtn').forEach(x=>x.classList.toggle('active',x.dataset.view===id));$('#viewTitle').textContent=titles[id]||'Administrador'}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
async function requireSession(){const {data:{session:s}}=await sb.auth.getSession();session=s;$('#loginGate').classList.toggle('hidden',!!session);if(session){$('#adminEmail').textContent=session.user.email||'';$('#backendStatus').textContent='Backend seguro activo';await loadAll()}}
$('#loginForm').onsubmit=async e=>{e.preventDefault();$('#loginMessage').textContent='Ingresando…';const {error}=await sb.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});if(error){$('#loginMessage').textContent='No fue posible iniciar sesión. Verifica las credenciales.';return}$('#loginMessage').textContent='';await requireSession()};
$('#logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
async function normalizeTableOrder(table,rows){const sorted=[...rows].sort((a,b)=>(Number(a.sort_order)||999999)-(Number(b.sort_order)||999999)||String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.id).localeCompare(String(b.id)));const fixes=sorted.map((r,i)=>({id:r.id,want:i+1,have:Number(r.sort_order)||0})).filter(x=>x.have!==x.want);if(!fixes.length)return false;for(const f of fixes){const {error}=await sb.from(table).update({sort_order:f.want}).eq('id',f.id);if(error)throw error}return true}
async function loadAll(){let [pr,cl,st]=await Promise.all([sb.from('projects').select('*').order('sort_order'),sb.from('clients').select('*').order('sort_order'),sb.from('site_settings').select('*').eq('id',1).maybeSingle()]);if(pr.error||cl.error||st.error){notice('<strong>Error de sincronización.</strong> Revisa las políticas RLS o la configuración.','error');console.error(pr.error,cl.error,st.error);return}try{const changedP=await normalizeTableOrder('projects',pr.data||[]),changedC=await normalizeTableOrder('clients',cl.data||[]);if(changedP||changedC){[pr,cl]=await Promise.all([sb.from('projects').select('*').order('sort_order'),sb.from('clients').select('*').order('sort_order')]);if(pr.error||cl.error)throw(pr.error||cl.error)}}catch(e){console.warn('No fue posible normalizar el orden:',e.message);notice('<strong>Contenido cargado.</strong> No se pudo normalizar automáticamente el orden.','error')}data.projects=(pr.data||[]).map(x=>({id:x.id,title:x.title,image:x.image_url,description:x.description||'',active:x.active,order:x.sort_order}));const gi=await sb.from('project_images').select('*').order('sort_order');if(gi.error){console.warn('Galería Fase 3.2 no disponible:',gi.error.message);data.projectImages={}}else{data.projectImages=(gi.data||[]).reduce((a,x)=>{(a[x.project_id]??=[]).push(x);return a},{})}data.clients=(cl.data||[]).map(x=>({id:x.id,name:x.name,image:x.image_url,active:x.active,order:x.sort_order}));if(st.data)data.settings={whatsapp:st.data.whatsapp||'',email:st.data.email||'',phones:st.data.phones||'',location:st.data.location||''};render()}
function filtered(arr,kind){const q=(kind==='project'?$('#projectSearch'):$('#clientSearch'))?.value.trim().toLowerCase()||'';return [...arr].sort((a,b)=>(a.order||0)-(b.order||0)).filter(x=>!q||(x.title||x.name||'').toLowerCase().includes(q))}
function render(){const ps=filtered(data.projects||[],'project'),cs=filtered(data.clients||[],'client');$('#projectCount').textContent=(data.projects||[]).filter(x=>x.active!==false).length;$('#clientCount').textContent=(data.clients||[]).filter(x=>x.active!==false).length;$('#projectList').innerHTML=ps.length?ps.map(x=>card(x,'project')).join(''):'<p class="empty">No hay proyectos que coincidan.</p>';$('#clientList').innerHTML=cs.length?cs.map(x=>card(x,'client')).join(''):'<p class="empty">No hay clientes que coincidan.</p>';document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.kind,b.dataset.edit));document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.kind,b.dataset.delete));document.querySelectorAll('[data-gallery]').forEach(b=>b.onclick=()=>openGalleryAdmin(b.dataset.gallery));document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>moveItem(b.dataset.kind,b.dataset.move,b.dataset.dir));$('#sWhatsapp').value=data.settings.whatsapp||'';$('#sEmail').value=data.settings.email||'';$('#sPhones').value=data.settings.phones||'';$('#sLocation').value=data.settings.location||''}
function card(x,k){return `<article><img class="${k==='project'?'projectImg':''}" src="${esc(x.image)}" alt="${esc(x.title||x.name)}" loading="lazy"><div class="cardBody"><div class="cardTop"><span class="badge ${x.active===false?'off':''}">${x.active===false?'Oculto':'Visible'}</span><span class="orderTag">Orden ${esc(x.order||'—')}</span></div><h3>${esc(x.title||x.name)}</h3><p>${k==='project'?esc(x.description||'Sin descripción'):'Logo de cliente'}</p><div class="cardActions"><button data-move="${esc(x.id)}" data-kind="${k}" data-dir="up" title="Subir orden">↑</button><button data-move="${esc(x.id)}" data-kind="${k}" data-dir="down" title="Bajar orden">↓</button>${k==='project'?`<button class="galleryBtn" data-gallery="${esc(x.id)}">Galería <span class="projectGalleryCount">${(data.projectImages?.[x.id]||[]).length}</span></button>`:''}<button data-edit="${esc(x.id)}" data-kind="${k}">Editar</button><button class="danger" data-delete="${esc(x.id)}" data-kind="${k}">Eliminar</button></div></div></article>`}
const dlg=$('#editor');
function edit(kind,id){const arr=kind==='project'?data.projects:data.clients,x=id?arr.find(v=>v.id===id):null;pendingFile=null;$('#itemFile').value='';$('#itemPreview').classList.add('hidden');$('#itemKind').value=kind;$('#itemId').value=x?.id||'';$('#editorType').textContent=kind==='project'?'Proyecto':'Cliente';$('#editorTitle').textContent=x?'Editar':'Agregar';$('#itemName').value=x?.title||x?.name||'';$('#itemDesc').value=x?.description||'';$('#descWrap').style.display=kind==='project'?'grid':'none';$('#itemImage').value=x?.image||'';$('#itemOrder').value=x?.order||(Math.max(0,...arr.map(v=>Number(v.order)||0))+1);$('#itemActive').checked=x?.active!==false;if(x?.image){$('#itemPreview').src=x.image;$('#itemPreview').classList.remove('hidden')}dlg.showModal()}
$('#addProject').onclick=()=>edit('project');$('#addClient').onclick=()=>edit('client');
async function optimizeImage(file,kind){if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.');if(file.size>5*1024*1024)throw new Error('La imagen supera 5 MB.');const img=await createImageBitmap(file);const maxW=kind==='project'?1920:1200,maxH=kind==='project'?1400:800,scale=Math.min(1,maxW/img.width,maxH/img.height),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);img.close();const blob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('No fue posible optimizar la imagen.')),'image/webp',.84));return new File([blob],(file.name.replace(/\.[^.]+$/,'')||'imagen')+'.webp',{type:'image/webp'})}
$('#itemFile').onchange=async e=>{try{const raw=e.target.files?.[0]||null;if(!raw){pendingFile=null;return}pendingFile=await optimizeImage(raw,$('#itemKind').value);$('#fileInfo').textContent=`Optimizada: ${(pendingFile.size/1024).toFixed(0)} KB · WEBP`;$('#itemPreview').src=URL.createObjectURL(pendingFile);$('#itemPreview').classList.remove('hidden')}catch(err){alert(err.message);e.target.value='';pendingFile=null}};
function storagePathFromUrl(url){try{const u=new URL(url);const marker=`/storage/v1/object/public/${cfg.bucket||'agam-media'}/`;const i=u.pathname.indexOf(marker);return i>=0?decodeURIComponent(u.pathname.slice(i+marker.length)):null}catch{return null}}
async function deleteMedia(url){const path=storagePathFromUrl(url);if(!path)return;const {error}=await sb.storage.from(cfg.bucket||'agam-media').remove([path]);if(error)console.warn('No se pudo retirar archivo antiguo:',error.message)}
async function upload(kind){if(!pendingFile)return $('#itemImage').value.trim();const path=`${kind}s/${crypto.randomUUID()}.webp`;const {error}=await sb.storage.from(cfg.bucket||'agam-media').upload(path,pendingFile,{contentType:'image/webp',cacheControl:'31536000',upsert:false});if(error)throw error;return sb.storage.from(cfg.bucket||'agam-media').getPublicUrl(path).data.publicUrl}
$('#applyItem').onclick=async()=>{if(busy)return;busy=true;const btn=$('#applyItem');btn.disabled=true;try{const kind=$('#itemKind').value,id=$('#itemId').value||crypto.randomUUID(),arr=kind==='project'?data.projects:data.clients,old=arr.find(v=>v.id===id),image=await upload(kind),base={id,image_url:image,sort_order:Math.max(1,Number($('#itemOrder').value)||1),active:$('#itemActive').checked};let row;if(kind==='project')row={...base,title:$('#itemName').value.trim(),description:$('#itemDesc').value.trim()};else row={...base,name:$('#itemName').value.trim()};if(!row.title&&!row.name)throw new Error('Escribe un nombre o título.');if(!row.image_url)throw new Error('Selecciona una imagen o conserva la existente.');const table=kind==='project'?'projects':'clients',{error}=await sb.from(table).upsert(row);if(error)throw error;if(pendingFile&&old?.image&&old.image!==image)await deleteMedia(old.image);dlg.close();await loadAll();notice('<strong>Guardado.</strong> El contenido ya está disponible en el sitio público.')}catch(e){alert('No se pudo guardar: '+e.message)}finally{btn.disabled=false;busy=false}};
async function remove(kind,id){const arr=kind==='project'?data.projects:data.clients,item=arr.find(x=>x.id===id);if(!item||!confirm(`¿Eliminar definitivamente “${item.title||item.name}”?\n\nTambién se eliminarán sus imágenes administradas por AGAM.`))return;if(kind==='project'){for(const g of (data.projectImages?.[id]||[]))await deleteMedia(g.image_url)}const {error}=await sb.from(kind==='project'?'projects':'clients').delete().eq('id',id);if(error)return alert(error.message);await deleteMedia(item.image);await loadAll();notice('<strong>Eliminado.</strong> El registro y sus archivos asociados fueron retirados.')}
async function moveItem(kind,id,dir){if(busy)return;busy=true;try{const arr=[...(kind==='project'?data.projects:data.clients)].sort((a,b)=>(a.order||0)-(b.order||0)),i=arr.findIndex(x=>x.id===id),j=dir==='up'?i-1:i+1;if(i<0||j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];const table=kind==='project'?'projects':'clients';for(let n=0;n<arr.length;n++){if(Number(arr[n].order)!==n+1){const {error}=await sb.from(table).update({sort_order:n+1}).eq('id',arr[n].id);if(error)throw error}}await loadAll()}catch(e){alert('No se pudo cambiar el orden: '+e.message)}finally{busy=false}}

// FASE 3.3.4 - GALERIA ADMIN: UX + LIMITE DE 10 FOTOGRAFIAS ADICIONALES
const MAX_GALLERY_IMAGES=10;
const galleryDlg=$('#galleryEditor');
let galleryProjectId=null;

async function openGalleryAdmin(projectId){
  galleryProjectId=projectId;
  const p=data.projects.find(x=>x.id===projectId);
  $('#galleryTitle').textContent=p?.title||'Fotografías';
  $('#galleryFiles').value='';
  renderGalleryAdmin();
  galleryDlg.showModal();
}

function renderGalleryAdmin(){
  const rows=[...(data.projectImages?.[galleryProjectId]||[])]
    .sort((a,b)=>a.sort_order-b.sort_order);

  const count=rows.length;
  const remaining=Math.max(0,MAX_GALLERY_IMAGES-count);

  const counter=$('#galleryCurrentCount');
  const counterBox=$('#galleryCounter');
  const fileInput=$('#galleryFiles');
  const uploadBtn=$('#uploadGallery');

  if(counter)counter.textContent=count;

  if(counterBox){
    counterBox.classList.toggle('full',count>=MAX_GALLERY_IMAGES);
    counterBox.title=count>=MAX_GALLERY_IMAGES
      ?'Se alcanzó el límite de fotografías adicionales.'
      :`${remaining} espacio(s) disponible(s).`;
  }

  if(fileInput){
    fileInput.disabled=count>=MAX_GALLERY_IMAGES;
    if(count>=MAX_GALLERY_IMAGES)fileInput.value='';
  }

  if(uploadBtn){
    uploadBtn.disabled=count>=MAX_GALLERY_IMAGES;
    uploadBtn.textContent=count>=MAX_GALLERY_IMAGES
      ?'Límite de 10 fotografías alcanzado'
      :'Subir fotografías';
  }

  $('#galleryAdminList').innerHTML=rows.length
    ?rows.map((x,i)=>`
      <article class="galleryAdminItem">
        <img src="${esc(x.image_url)}" alt="Foto ${i+1}">
        <div class="gaBody">
          <small>Foto ${i+1} de ${count}</small>
          <div class="gaActions">
            <button
              type="button"
              data-gmove="${esc(x.id)}"
              data-dir="up"
              title="Mover fotografía hacia arriba"
              ${i===0?'disabled':''}
            >↑</button>

            <button
              type="button"
              data-gmove="${esc(x.id)}"
              data-dir="down"
              title="Mover fotografía hacia abajo"
              ${i===count-1?'disabled':''}
            >↓</button>

            <button
              type="button"
              class="danger"
              data-gdelete="${esc(x.id)}"
            >Eliminar</button>
          </div>
        </div>
      </article>
    `).join('')
    :'<p class="empty">Aún no hay fotografías adicionales.</p>';

  document.querySelectorAll('[data-gdelete]').forEach(
    b=>b.onclick=()=>deleteGalleryImage(b.dataset.gdelete)
  );

  document.querySelectorAll('[data-gmove]').forEach(
    b=>b.onclick=()=>moveGalleryImage(b.dataset.gmove,b.dataset.dir)
  );
}

$('#closeGalleryAdmin').onclick=()=>galleryDlg.close();

$('#galleryFiles').onchange=()=>{
  const input=$('#galleryFiles');
  const files=[...(input.files||[])];
  if(!files.length)return;

  const current=(data.projectImages?.[galleryProjectId]||[]).length;
  const remaining=Math.max(0,MAX_GALLERY_IMAGES-current);

  if(remaining===0){
    input.value='';
    alert('Este proyecto ya alcanzó el límite de 10 fotografías adicionales.');
    return;
  }

  if(files.length>remaining){
    input.value='';
    alert(
      `Este proyecto tiene ${current} fotografía(s) adicional(es). `+
      `Solo puedes seleccionar ${remaining} fotografía(s) más.`
    );
  }
};

$('#uploadGallery').onclick=async()=>{
  const input=$('#galleryFiles');
  const files=[...(input.files||[])];

  if(!files.length){
    return alert('Selecciona una o más fotografías.');
  }

  const current=(data.projectImages?.[galleryProjectId]||[]).length;
  const remaining=Math.max(0,MAX_GALLERY_IMAGES-current);

  // Validación obligatoria antes de optimizar o subir archivos a Storage.
  if(remaining===0){
    input.value='';
    renderGalleryAdmin();
    return alert('Este proyecto ya alcanzó el límite de 10 fotografías adicionales.');
  }

  if(files.length>remaining){
    input.value='';
    return alert(
      `No se realizó ninguna carga. Actualmente hay ${current} fotografía(s) `+
      `y solo quedan ${remaining} espacio(s) disponible(s).`
    );
  }

  const btn=$('#uploadGallery');
  btn.disabled=true;

  try{
    let order=current;

    for(const raw of files){
      const f=await optimizeImage(raw,'project');

      const path=
        `projects/${galleryProjectId}/gallery/${crypto.randomUUID()}.webp`;

      const {error:upErr}=await sb.storage
        .from(cfg.bucket||'agam-media')
        .upload(path,f,{
          contentType:'image/webp',
          cacheControl:'31536000',
          upsert:false
        });

      if(upErr)throw upErr;

      const url=sb.storage
        .from(cfg.bucket||'agam-media')
        .getPublicUrl(path).data.publicUrl;

      const {error}=await sb
        .from('project_images')
        .insert({
          project_id:galleryProjectId,
          image_url:url,
          sort_order:++order,
          active:true
        });

      if(error){
        await sb.storage
          .from(cfg.bucket||'agam-media')
          .remove([path]);
        throw error;
      }
    }

    input.value='';
    await loadAll();
    renderGalleryAdmin();

    notice(
      '<strong>Galería actualizada.</strong> '+
      'Las fotografías ya están disponibles en el sitio público.'
    );

  }catch(e){
    alert('No se pudieron subir las fotografías: '+e.message);

  }finally{
    renderGalleryAdmin();
  }
};

async function deleteGalleryImage(id){
  const row=(data.projectImages?.[galleryProjectId]||[])
    .find(x=>x.id===id);

  if(
    !row||
    !confirm('¿Eliminar esta fotografía de la galería?')
  )return;

  const {error}=await sb
    .from('project_images')
    .delete()
    .eq('id',id);

  if(error)return alert(error.message);

  await deleteMedia(row.image_url);
  await loadAll();
  renderGalleryAdmin();
}

async function moveGalleryImage(id,dir){
  const rows=[...(data.projectImages?.[galleryProjectId]||[])]
    .sort((a,b)=>a.sort_order-b.sort_order);

  const i=rows.findIndex(x=>x.id===id);
  const j=dir==='up'?i-1:i+1;

  if(i<0||j<0||j>=rows.length)return;

  [rows[i],rows[j]]=[rows[j],rows[i]];

  for(let n=0;n<rows.length;n++){
    const {error}=await sb
      .from('project_images')
      .update({sort_order:n+1})
      .eq('id',rows[n].id);

    if(error)return alert(error.message);
  }

  await loadAll();
  renderGalleryAdmin();
}

// FASE 3.3.4 - ESCANEO RECURSIVO SEGURO DE STORAGE
async function listAllFiles(folder){
  const bucket=cfg.bucket||'agam-media';
  const out=[];

  async function walk(currentFolder){
    let offset=0;

    for(;;){
      const {data:items,error}=await sb.storage
        .from(bucket)
        .list(currentFolder,{
          limit:100,
          offset,
          sortBy:{column:'name',order:'asc'}
        });

      if(error)throw error;

      const rows=items||[];

      for(const item of rows){
        if(!item?.name||item.name.startsWith('.'))continue;

        const path=currentFolder
          ?`${currentFolder}/${item.name}`
          :item.name;

        /*
          Supabase Storage:
          - un archivo real tiene id
          - una carpeta/prefijo no tiene id

          Las carpetas nunca se agregan como candidatas
          a eliminación. Se recorren recursivamente.
        */
        if(item.id){
          out.push(path);
        }else{
          await walk(path);
        }
      }

      if(rows.length<100)break;
      offset+=100;
    }
  }

  await walk(folder);
  return out;
}

async function scanOrphans(){
  const used=new Set(
    [...(data.projects||[]),...(data.clients||[])]
      .map(x=>storagePathFromUrl(x.image))
      .filter(Boolean)
  );

  Object.values(data.projectImages||{})
    .flat()
    .forEach(x=>{
      const path=storagePathFromUrl(x.image_url);
      if(path)used.add(path);
    });

  const candidates=[];

  for(const folder of ['projects','clients']){
    const files=await listAllFiles(folder);

    for(const path of files){
      if(!used.has(path)){
        candidates.push(path);
      }
    }
  }

  return candidates;
}

async function cleanupOrphans(){if(busy)return;busy=true;const btn=$('#cleanupMedia');if(btn)btn.disabled=true;try{const orphan=await scanOrphans();if(!orphan.length){notice('<strong>Storage limpio.</strong> No se encontraron imágenes huérfanas.');return}const sample=orphan.slice(0,8).join('\n');const more=orphan.length>8?'\n…':'';if(!confirm(`Se encontraron ${orphan.length} archivo(s) huérfano(s) administrados por AGAM:\n\n${sample}${more}\n\n¿Deseas eliminarlos de Storage?\n\nSolo se eliminarán archivos de projects/ y clients/ que no estén referenciados por la base de datos.`))return;const {error}=await sb.storage.from(cfg.bucket||'agam-media').remove(orphan);if(error)throw error;notice(`<strong>Limpieza completada.</strong> Se eliminaron ${orphan.length} archivo(s) huérfano(s).`)}catch(e){alert('No se pudo limpiar Storage: '+e.message)}finally{if(btn)btn.disabled=false;busy=false}}
$('#cleanupMedia').onclick=cleanupOrphans;
$('#projectSearch').oninput=render;$('#clientSearch').oninput=render;
$('#saveAll').onclick=async()=>{const row={id:1,whatsapp:$('#sWhatsapp').value.trim(),email:$('#sEmail').value.trim(),phones:$('#sPhones').value.trim(),location:$('#sLocation').value.trim()};if(row.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))return alert('El correo no tiene un formato válido.');const {error}=await sb.from('site_settings').upsert(row);if(error)return alert(error.message);data.settings={whatsapp:row.whatsapp,email:row.email,phones:row.phones,location:row.location};notice('<strong>Configuración guardada.</strong> Los datos quedaron sincronizados.')};
sb.auth.onAuthStateChange((_e,s)=>{session=s;$('#loginGate').classList.toggle('hidden',!!s)});await requireSession();
})();
