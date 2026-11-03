(async()=>{
const cfg=window.AGAM_BACKEND||{}, configured=/^https:\/\/.+\.supabase\.co$/.test(cfg.url||'') && !String(cfg.anonKey||'').startsWith('PEGA_');
const $=s=>document.querySelector(s), esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
/* FASE 3.5.2 - Vista previa local del proyecto */
const projectPreviewDialog=document.createElement('dialog');
let projectPreviewObjectUrl=null;

projectPreviewDialog.id='projectPreviewDialog';
projectPreviewDialog.innerHTML=`
  <div style="padding:24px;max-width:650px">
    <div class="modalHead">
      <div>
        <p class="eyebrow">VISTA PREVIA</p>
        <h2>Así se verá el proyecto</h2>
      </div>
      <button type="button" id="closeProjectPreview"
        class="iconbtn" aria-label="Cerrar">×</button>
    </div>
    <article style="margin-top:20px;border:1px solid #e5eaf1;border-radius:16px;overflow:hidden">
      <img id="previewProjectImage" alt="Imagen del proyecto"
        style="width:100%;height:220px;object-fit:contain;background:#f8fafc">
      <div style="padding:18px">
        <div id="previewProjectMeta" class="projectMeta"></div>
        <h3 id="previewProjectTitle"></h3>
        <p id="previewProjectDescription"></p>
        <div id="previewProjectDetails"></div>
      </div>
    </article>
    <p style="color:#667085;font-size:.85rem">
      Vista previa local. Los cambios no se guardan hasta pulsar Aplicar.
    </p>
  </div>
`;

document.body.appendChild(projectPreviewDialog);

$('#previewItem').addEventListener('click',()=>{
  if($('#itemKind').value!=='project'){
    alert('La vista previa está disponible para proyectos.');
    return;
  }

  const title=$('#itemName').value.trim();
  const description=$('#itemDesc').value.trim();

  if(projectPreviewObjectUrl){
  URL.revokeObjectURL(projectPreviewObjectUrl);
  projectPreviewObjectUrl=null;
}

const previewFile=$('#itemFile').files?.[0];
const image=previewFile
  ? (projectPreviewObjectUrl=URL.createObjectURL(previewFile))
  : $('#itemImage').value.trim();

  const category=$('#itemProjectCategory').value.trim()||'General';
  const featured=$('#itemFeatured').checked;
  const date=$('#itemProjectDate').value;
  const status=$('#itemProjectStatus').value||'En ejecucion';

  $('#previewProjectTitle').textContent=title||'Título del proyecto';
  $('#previewProjectDescription').textContent=
    description||'Descripción del proyecto';

  const previewImage=$('#previewProjectImage');
  previewImage.style.display=image?'block':'none';
  previewImage.src=image;

  const safe=value=>String(value||'').replace(
    /[&<>"']/g,
    c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])
  );

  $('#previewProjectMeta').innerHTML=
    `<span class="projectCategory">${safe(category)}</span>`+
    (featured?'<span class="projectFeatured">Destacado</span>':'');

  $('#previewProjectDetails').innerHTML=
    `<p><strong>Fecha:</strong> ${safe(date||'Sin fecha')}</p>`+
    `<p><strong>Estado:</strong> ${safe(status)}</p>`;

  projectPreviewDialog.showModal();
});

$('#closeProjectPreview').addEventListener('click',()=>{
  projectPreviewDialog.close();

  if(projectPreviewObjectUrl){
    URL.revokeObjectURL(projectPreviewObjectUrl);
    projectPreviewObjectUrl=null;
  }
});
if(!configured){$('#loginMessage').textContent='Backend aún no configurado. Completa config.js.';return}
const sb=window.supabase.createClient(cfg.url,cfg.anonKey), defaults=window.AGAM_DEFAULT_CONTENT;
let data=structuredClone(defaults), session=null, pendingFile=null, busy=false; data.projectImages={};
let itemPreviewObjectUrl=null;
const titles={
  dashboard:'Panel administrativo',
  projects:'Proyectos',
  clients:'Clientes',
  trash:'Papelera',
  activity:'Actividad',
  settings:'Configuración'
};

function notice(msg,type='ok'){
  const n=$('#notice');
  n.className='notice '+(type==='error'?'noticeError':'');
  n.innerHTML=msg;
}

async function logActivity(action,entityType,entityId=null,entityName=null,details={}){
  if(!session?.user)return false;

  const row={
    action,
    entity_type:entityType,
    entity_id:entityId?String(entityId):null,
    entity_name:entityName||null,
    details:details||{},
    actor_uid:session.user.id,
    actor_email:session.user.email||null
  };

  try{
    const {error}=await sb
      .from('activity_log')
      .insert(row);

    if(error){
      console.warn('AGAM activity log:',error.message);
      return false;
    }

    return true;
  }catch(e){
    console.warn('AGAM activity log:',e?.message||e);
    return false;
  }
}

function go(id){
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===id));
  document.querySelectorAll('.navbtn').forEach(x=>x.classList.toggle('active',x.dataset.view===id));
  $('#viewTitle').textContent=titles[id]||'Administrador';
}

document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));

async function requireSession(){
  const {data:{session:s}}=await sb.auth.getSession();
  session=s;
  $('#loginGate').classList.toggle('hidden',!!session);

  if(session){
    $('#adminEmail').textContent=session.user.email||'';
    $('#backendStatus').textContent='Backend seguro activo';
    await loadAll();
  }
}

$('#loginForm').onsubmit=async e=>{
  e.preventDefault();
  $('#loginMessage').textContent='Ingresando…';

  const {error}=await sb.auth.signInWithPassword({
    email:$('#loginEmail').value.trim(),
    password:$('#loginPassword').value
  });

  if(error){
    $('#loginMessage').textContent='No fue posible iniciar sesión. Verifica las credenciales.';
    return;
  }

  $('#loginMessage').textContent='';
  await requireSession();
};

$('#logoutBtn').onclick=async()=>{
  await sb.auth.signOut();
  location.reload();
};

async function normalizeTableOrder(table,rows){
  const sorted=[...rows].sort(
    (a,b)=>
      (Number(a.sort_order)||999999)-(Number(b.sort_order)||999999)||
      String(a.created_at||'').localeCompare(String(b.created_at||''))||
      String(a.id).localeCompare(String(b.id))
  );

  const fixes=sorted
    .map((r,i)=>({id:r.id,want:i+1,have:Number(r.sort_order)||0}))
    .filter(x=>x.have!==x.want);

  if(!fixes.length)return false;

  for(const f of fixes){
    const {error}=await sb.from(table).update({sort_order:f.want}).eq('id',f.id);
    if(error)throw error;
  }

  return true;
}

async function loadAll(){
  let [pr,cl,st,al]=await Promise.all([
    sb.from('projects').select('*').order('sort_order'),
    sb.from('clients').select('*').order('sort_order'),
    sb.from('site_settings').select('*').eq('id',1).maybeSingle(),
    sb.from('activity_log').select('*').order('created_at',{ascending:false}).limit(100)
  ]);

  if(pr.error||cl.error||st.error){
    notice('<strong>Error de sincronización.</strong> Revisa las políticas RLS o la configuración.','error');
    console.error(pr.error,cl.error,st.error);
    return;
  }

  if(al.error){
    console.warn('Historial de actividad no disponible:',al.error.message);
    data.activity=[];
  }else{
    data.activity=al.data||[];
  }

  try{
    const changedP=await normalizeTableOrder('projects',pr.data||[]);
    const changedC=await normalizeTableOrder('clients',cl.data||[]);

    if(changedP||changedC){
      [pr,cl]=await Promise.all([
        sb.from('projects').select('*').order('sort_order'),
        sb.from('clients').select('*').order('sort_order')
      ]);

      if(pr.error||cl.error)throw(pr.error||cl.error);
    }
  }catch(e){
    console.warn('No fue posible normalizar el orden:',e.message);
    notice('<strong>Contenido cargado.</strong> No se pudo normalizar automáticamente el orden.','error');
  }

  data.projects=(pr.data||[]).map(x=>({
    id:x.id,
    title:x.title,
    image:x.image_url,
    description:x.description||'',
    active:x.active,
    archived:x.archived===true,
    deletedAt:x.deleted_at||null,
    updatedAt:x.updated_at||null,
    order:x.sort_order,
    projectDate:x.project_date||'',
    projectStatus:x.project_status||'En ejecucion',
    projectCategory:x.project_category||'General',
    seoTitle:x.seo_title||'',
    seoDescription:x.seo_description||'',
    imageAlt:x.image_alt||'',
    featured:x.featured===true
  }));

  const gi=await sb.from('project_images').select('*').order('sort_order');

  if(gi.error){
    console.warn('Galería Fase 3.2 no disponible:',gi.error.message);
    data.projectImages={};
  }else{
    data.projectImages=(gi.data||[]).reduce((a,x)=>{
      (a[x.project_id]??=[]).push(x);
      return a;
    },{});
  }

  data.clients=(cl.data||[]).map(x=>({
    id:x.id,
    name:x.name,
    image:x.image_url,
    active:x.active,
    archived:x.archived===true,
    deletedAt:x.deleted_at||null,
    updatedAt:x.updated_at||null,
    order:x.sort_order
  }));

  if(st.data){
  data.settings={
    whatsapp:st.data.whatsapp||'',
    email:st.data.email||'',
    phones:st.data.phones||'',
    location:st.data.location||'',
    companyName:st.data.company_name||'',
    companyTagline:st.data.company_tagline||'',
    responseTime:st.data.response_time||'',
    experienceYears:st.data.experience_years||'',
    businessScope:st.data.business_scope||'',
    businessFocus:st.data.business_focus||''
  };
}
  

  render();
}

function filtered(arr,kind){
  const q=(kind==='project'
    ?$('#projectSearch')
    :$('#clientSearch'))?.value.trim().toLowerCase()||'';

  return [...arr]
  .filter(x=>x.archived!==true)
  .sort((a,b)=>(a.order||0)-(b.order||0))
  .filter(
    x=>
      !q||
      (x.title||x.name||'')
        .toLowerCase()
        .includes(q)
  );
}

function render(){
  const projects=data.projects||[];
  const clients=data.clients||[];
  const ps=filtered(projects,'project');
  const cs=filtered(clients,'client');
const trashProjects=projects
  .filter(x=>x.archived===true)
  .sort((a,b)=>{
    const da=new Date(a.deletedAt||0).getTime();
    const db=new Date(b.deletedAt||0).getTime();
    return db-da;
  });

const trashClients=clients
  .filter(x=>x.archived===true)
  .sort((a,b)=>{
    const da=new Date(a.deletedAt||0).getTime();
    const db=new Date(b.deletedAt||0).getTime();
    return db-da;
  });

  // FASE 3.5.1 / 3.5.4 - Dashboard ejecutivo
  const operationalProjects=projects.filter(x=>x.archived!==true);
  const operationalClients=clients.filter(x=>x.archived!==true);

  const projectPublished=operationalProjects
    .filter(x=>x.active!==false).length;

  const projectHidden=operationalProjects
    .filter(x=>x.active===false).length;

  const clientVisible=operationalClients
    .filter(x=>x.active!==false).length;

  const clientHidden=operationalClients
    .filter(x=>x.active===false).length;

  const operationalProjectIds=new Set(
    operationalProjects.map(x=>x.id)
  );

  const galleryImages=Object.entries(data.projectImages||{})
    .filter(([projectId])=>operationalProjectIds.has(projectId))
    .reduce(
      (total,[,images])=>
        total+(Array.isArray(images)?images.length:0),
      0
    );

  const projectCovers=operationalProjects
    .filter(x=>x.image).length;

  const clientLogos=operationalClients
    .filter(x=>x.image).length;

  const totalMedia=projectCovers+clientLogos+galleryImages;

  const setText=(selector,value)=>{
    const el=$(selector);
    if(el)el.textContent=value;
  };

  setText('#projectCount',projectPublished);
  setText('#projectHiddenCount',projectHidden);
  setText('#clientCount',clientVisible);
  setText('#clientHiddenCount',clientHidden);
  setText('#galleryImageCount',galleryImages);
  setText('#projectTotalCount',operationalProjects.length);
  setText('#clientTotalCount',operationalClients.length);
  setText('#mediaTotalCount',totalMedia);

  $('#projectList').innerHTML=ps.length
    ?ps.map(x=>card(x,'project')).join('')
    :'<p class="empty">No hay proyectos que coincidan.</p>';

  $('#clientList').innerHTML=cs.length
    ?cs.map(x=>card(x,'client')).join('')
    :'<p class="empty">No hay clientes que coincidan.</p>';

  setText('#trashProjectCount',trashProjects.length);
  setText('#trashClientCount',trashClients.length);

  $('#trashProjectList').innerHTML=trashProjects.length
    ?trashProjects.map(x=>trashCard(x,'project')).join('')
    :'<p class="empty">No hay proyectos en la papelera.</p>';

  $('#trashClientList').innerHTML=trashClients.length
    ?trashClients.map(x=>trashCard(x,'client')).join('')
    :'<p class="empty">No hay clientes en la papelera.</p>';

  const activity=data.activity||[];
  const actionLabels={
    CREATED:'Creado',
    UPDATED:'Actualizado',
    ARCHIVED:'Enviado a papelera',
    RESTORED:'Restaurado',
    PURGED:'Eliminado definitivamente',
    REORDERED:'Orden modificado',
    GALLERY_IMAGES_ADDED:'Fotografías agregadas',
    GALLERY_IMAGE_DELETED:'Fotografía eliminada',
    GALLERY_REORDERED:'Galería reordenada',
    GALLERY_ALT_UPDATED:'Texto ALT actualizado',
    SETTINGS_UPDATED:'Configuración actualizada',
    PROJECT_DUPLICATED:'Proyecto duplicado'
  };

  setText('#activityCount',activity.length);

  $('#activityList').innerHTML=activity.length
    ?activity.map(a=>{
      const date=a.created_at
        ?new Date(a.created_at).toLocaleString('es-CO')
        :'Sin fecha';
      const label=actionLabels[a.action]||a.action||'Actividad';
      const entity=a.entity_name||a.entity_type||'Sistema';
      const actor=a.actor_email||'Administrador';

      return `<article class="activityItem">
        <div class="activityItemMain">
          <strong>${esc(label)}</strong>
          <span>${esc(entity)}</span>
        </div>
        <div class="activityItemMeta">
          <span>${esc(date)}</span>
          <span>${esc(actor)}</span>
        </div>
      </article>`;
    }).join('')
    :'<p class="empty">No hay actividad registrada.</p>';

  document.querySelectorAll('[data-edit]').forEach(
    b=>b.onclick=()=>edit(b.dataset.kind,b.dataset.edit)
  );

  document.querySelectorAll('[data-delete]').forEach(
    b=>b.onclick=()=>remove(b.dataset.kind,b.dataset.delete)
  );

  document.querySelectorAll('[data-restore]').forEach(
    b=>b.onclick=()=>restoreItem(b.dataset.kind,b.dataset.restore)
  );

  document.querySelectorAll('[data-purge]').forEach(
    b=>b.onclick=()=>purgeItem(b.dataset.kind,b.dataset.purge)
  );

  document.querySelectorAll('[data-gallery]').forEach(
    b=>b.onclick=()=>openGalleryAdmin(b.dataset.gallery)
  );
    document.querySelectorAll('[data-duplicate]').forEach(
    b=>b.onclick=()=>duplicateProject(b.dataset.duplicate)
  );
  document.querySelectorAll('[data-move]').forEach(
    b=>b.onclick=()=>moveItem(b.dataset.kind,b.dataset.move,b.dataset.dir)
  );

  $('#sWhatsapp').value=data.settings.whatsapp||'';
  $('#sEmail').value=data.settings.email||'';
  $('#sPhones').value=data.settings.phones||'';
  $('#sLocation').value=data.settings.location||'';
  $('#sCompanyName').value=data.settings.companyName||'';
  $('#sCompanyTagline').value=data.settings.companyTagline||'';
  $('#sResponseTime').value=data.settings.responseTime||'';
  $('#sExperienceYears').value=data.settings.experienceYears||'';
  $('#sBusinessScope').value=data.settings.businessScope||'';
  $('#sBusinessFocus').value=data.settings.businessFocus||'';
}

function trashCard(x,k){
  const name=x.title||x.name||'Sin nombre';

  const deletedDate=x.deletedAt
    ?new Date(x.deletedAt).toLocaleString('es-CO')
    :'Sin fecha registrada';

  return `<article class="trashCard">
    <img
      class="${k==='project'?'projectImg':''}"
      src="${esc(x.image)}"
      alt="${esc(name)}"
      loading="lazy"
    >

    <div class="cardBody">
      <div class="cardTop">
        <span class="badge off">En papelera</span>
        <span class="orderTag">
          ${k==='project'?'Proyecto':'Cliente'}
        </span>
      </div>

      <h3>${esc(name)}</h3>

      <p>
        Enviado a papelera:
        <strong>${esc(deletedDate)}</strong>
      </p>

      <div class="cardActions">
        <button
          type="button"
          data-restore="${esc(x.id)}"
          data-kind="${k}"
        >
          Restaurar
        </button>

        <button
          type="button"
          class="danger"
          data-purge="${esc(x.id)}"
          data-kind="${k}"
        >
          Eliminar definitivamente
        </button>
      </div>
    </div>
  </article>`;
}

function card(x,k){
  return `<article>
    <img
      class="${k==='project'?'projectImg':''}"
      src="${esc(x.image)}"
      alt="${esc(x.title||x.name)}"
      loading="lazy"
    >
    <div class="cardBody">
      <div class="cardTop">
        <span class="badge ${x.active===false?'off':''}">
          ${x.active===false?'Oculto':'Visible'}
        </span>
        <span class="orderTag">Orden ${esc(x.order||'—')}</span>
      </div>

      <h3>${esc(x.title||x.name)}</h3>

      <p>
        ${k==='project'
          ?esc(x.description||'Sin descripción')
          :'Logo de cliente'}
      </p>

      <p class="lastModified">
        Última modificación:
        <strong>${esc(x.updatedAt?new Date(x.updatedAt).toLocaleString('es-CO'):'Sin fecha registrada')}</strong>
      </p>

      <div class="cardActions">
        <button
          data-move="${esc(x.id)}"
          data-kind="${k}"
          data-dir="up"
          title="Subir orden"
        >↑</button>

        <button
          data-move="${esc(x.id)}"
          data-kind="${k}"
          data-dir="down"
          title="Bajar orden"
        >↓</button>

        ${k==='project'
          ?`<button class="galleryBtn" data-gallery="${esc(x.id)}">
              Galería
              <span class="projectGalleryCount">
                ${(data.projectImages?.[x.id]||[]).length}
              </span>
            </button>`
          :''}
	        ${k==='project'
          ?`<button
              data-duplicate="${esc(x.id)}"
              title="Crear una copia independiente del proyecto"
            >
              Duplicar
            </button>`
          :''}
        <button data-edit="${esc(x.id)}" data-kind="${k}">
          Editar
        </button>

        <button
          class="danger"
          data-delete="${esc(x.id)}"
          data-kind="${k}"
        >
          Enviar a Papelera
        </button>
      </div>
    </div>
  </article>`;
}

const dlg=$('#editor');

dlg.addEventListener('close',()=>{
  if(itemPreviewObjectUrl){
    URL.revokeObjectURL(itemPreviewObjectUrl);
    itemPreviewObjectUrl=null;
  }
});

function edit(kind,id){
  const arr=kind==='project'?data.projects:data.clients;
  const x=id?arr.find(v=>v.id===id):null;

  if(itemPreviewObjectUrl){
  URL.revokeObjectURL(itemPreviewObjectUrl);
  itemPreviewObjectUrl=null;
}

  pendingFile=null;
  $('#itemFile').value='';
  $('#fileInfo').textContent='';
  $('#itemPreview').classList.add('hidden');

  $('#itemKind').value=kind;
  $('#itemId').value=x?.id||'';
  $('#editorType').textContent=kind==='project'?'Proyecto':'Cliente';
  $('#editorTitle').textContent=x?'Editar':'Agregar';
  $('#itemName').value=x?.title||x?.name||'';
  $('#itemDesc').value=x?.description||'';

  $('#descWrap').style.display=kind==='project'?'grid':'none';
  $('#projectMetaWrap').style.display=kind==='project'?'grid':'none';

  $('#itemProjectDate').value=
    kind==='project'?(x?.projectDate||''):'';

  $('#itemProjectStatus').value=
    kind==='project'
      ?(x?.projectStatus||'En ejecucion')
      :'En ejecucion';
$('#itemProjectCategory').value=
  kind==='project'
    ?(x?.projectCategory||'General')
    :'General';

$('#itemSeoTitle').value=
  kind==='project'?(x?.seoTitle||''):'';

$('#itemSeoDescription').value=
  kind==='project'?(x?.seoDescription||''):'';

$('#itemImageAlt').value=
  kind==='project'?(x?.imageAlt||''):'';

$('#itemFeatured').checked=
  kind==='project' && x?.featured===true;

  $('#itemImage').value=x?.image||'';

  $('#itemOrder').value=
    x?.order||
    (Math.max(0,...arr.map(v=>Number(v.order)||0))+1);

  $('#itemActive').checked=x?.active!==false;

  if(x?.image){
    $('#itemPreview').src=x.image;
    $('#itemPreview').classList.remove('hidden');
  }

  dlg.showModal();
}
$('#addProject').onclick=()=>edit('project');
$('#addClient').onclick=()=>edit('client');

async function optimizeImage(file,kind){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)){
    throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.');
  }

  if(file.size>5*1024*1024){
    throw new Error('La imagen supera 5 MB.');
  }

  const img=await createImageBitmap(file);
  const maxW=kind==='project'?1920:1200;
  const maxH=kind==='project'?1400:800;

  const scale=Math.min(
    1,
    maxW/img.width,
    maxH/img.height
  );

  const w=Math.max(1,Math.round(img.width*scale));
  const h=Math.max(1,Math.round(img.height*scale));

  const c=document.createElement('canvas');
  c.width=w;
  c.height=h;

  c.getContext('2d').drawImage(img,0,0,w,h);
  img.close();

  const blob=await new Promise((res,rej)=>
    c.toBlob(
      b=>b
        ?res(b)
        :rej(new Error('No fue posible optimizar la imagen.')),
      'image/webp',
      .84
    )
  );

  return new File(
    [blob],
    (file.name.replace(/\.[^.]+$/,'')||'imagen')+'.webp',
    {type:'image/webp'}
  );
}

async function processItemFile(raw){
  try{
    if(!raw){
      pendingFile=null;
      $('#fileInfo').textContent='';
      return;
    }

    pendingFile=await optimizeImage(
      raw,
      $('#itemKind').value
    );

    $('#fileInfo').textContent=
      `Optimizada: ${(pendingFile.size/1024).toFixed(0)} KB · WEBP`;

    if(itemPreviewObjectUrl){
  URL.revokeObjectURL(itemPreviewObjectUrl);
}

itemPreviewObjectUrl=URL.createObjectURL(pendingFile);
$('#itemPreview').src=itemPreviewObjectUrl;
    $('#itemPreview').classList.remove('hidden');

  }catch(err){
    alert(err.message);
    $('#itemFile').value='';
    $('#fileInfo').textContent='';
if(itemPreviewObjectUrl){
  URL.revokeObjectURL(itemPreviewObjectUrl);
  itemPreviewObjectUrl=null;
}    
pendingFile=null;
  }
}

$('#itemFile').onchange=async e=>{
  const raw=e.target.files?.[0]||null;
  await processItemFile(raw);
};
const itemDropZone=$('#itemDropZone');

['dragenter','dragover'].forEach(eventName=>{
  itemDropZone.addEventListener(eventName,e=>{
    e.preventDefault();
    e.stopPropagation();
    itemDropZone.classList.add('dragActive');
  });
});

['dragleave','drop'].forEach(eventName=>{
  itemDropZone.addEventListener(eventName,e=>{
    e.preventDefault();
    e.stopPropagation();
    itemDropZone.classList.remove('dragActive');
  });
});

itemDropZone.addEventListener('drop',async e=>{
  const raw=e.dataTransfer?.files?.[0]||null;

  if(!raw) return;

  await processItemFile(raw);
});
function storagePathFromUrl(url){
  try{
    const u=new URL(url);

    const marker=
      `/storage/v1/object/public/${cfg.bucket||'agam-media'}/`;

    const i=u.pathname.indexOf(marker);

    return i>=0
      ?decodeURIComponent(u.pathname.slice(i+marker.length))
      :null;

  }catch{
    return null;
  }
}

async function deleteMedia(url){
  const path=storagePathFromUrl(url);
  if(!path)return;

  const {error}=await sb.storage
    .from(cfg.bucket||'agam-media')
    .remove([path]);

  if(error){
    console.warn(
      'No se pudo retirar archivo antiguo:',
      error.message
    );
  }
}
async function cloneMedia(url, destinationPath){
  const sourcePath=storagePathFromUrl(url);

  if(!sourcePath){
    throw new Error(
      'La imagen original no pertenece al bucket administrado por AGAM.'
    );
  }

  if(!destinationPath){
    throw new Error(
      'No se especificó la ruta de destino.'
    );
  }

  const bucket=cfg.bucket||'agam-media';

  const {data:blob,error:downloadError}=await sb.storage
    .from(bucket)
    .download(sourcePath);

  if(downloadError)throw downloadError;

  if(!blob){
    throw new Error(
      'No fue posible descargar la imagen original.'
    );
  }

  const {error:uploadError}=await sb.storage
    .from(bucket)
    .upload(
      destinationPath,
      blob,
      {
        contentType:blob.type||'image/webp',
        cacheControl:'31536000',
        upsert:false
      }
    );

  if(uploadError)throw uploadError;

  return sb.storage
    .from(bucket)
    .getPublicUrl(destinationPath)
    .data
    .publicUrl;
}
async function duplicateProject(sourceId){
  if(busy)return;

  const source=data.projects.find(
    x=>x.id===sourceId
  );

  if(!source){
    return alert(
      'No se encontró el proyecto que deseas duplicar.'
    );
  }

  if(source.archived===true){
    return alert(
      'No se puede duplicar un proyecto que está en la papelera.'
    );
  }

  const gallery=[
    ...(data.projectImages?.[sourceId]||[])
  ].sort(
    (a,b)=>(a.sort_order||0)-(b.sort_order||0)
  );

  const newId=crypto.randomUUID();
  const newTitle=`Copia de ${source.title}`;
  const createdPaths=[];
  let projectCreated=false;

  if(
    !confirm(
      `¿Duplicar el proyecto “${source.title}”?\n\n`+
      `La copia se creará como “${newTitle}”.\n`+
      `Quedará oculta y no destacada hasta que la revises.\n`+
      `También se copiarán de forma independiente la portada y `+
      `${gallery.length} fotografía(s) de la galería.`
    )
  ){
    return;
  }

  busy=true;

  try{
    notice(
      '<strong>Duplicando proyecto.</strong> '+
      'Copiando contenido e imágenes de forma independiente...'
    );

    const coverPath=
      `projects/${newId}/cover/${crypto.randomUUID()}.webp`;

    const newCoverUrl=await cloneMedia(
      source.image,
      coverPath
    );

    createdPaths.push(coverPath);

    const row={
      id:newId,
      title:newTitle,
      description:source.description||'',
      image_url:newCoverUrl,
      sort_order:Math.max(
        1,
        ...data.projects
          .filter(x=>!x.archived)
          .map(x=>Number(x.order)||1)
      )+1,
      active:false,
      project_date:source.projectDate||null,
      project_status:
        source.projectStatus||'En ejecucion',
      project_category:
        source.projectCategory||'General',
      featured:false,
      archived:false,
      deleted_at:null,
      seo_title:source.seoTitle||null,
      seo_description:source.seoDescription||null,
      image_alt:source.imageAlt||null
    };

    const {error:projectError}=await sb
      .from('projects')
      .insert(row);

    if(projectError)throw projectError;

    projectCreated=true;

    let galleryCopied=0;

    for(const image of gallery){
      const galleryPath=
        `projects/${newId}/gallery/${crypto.randomUUID()}.webp`;

      const newGalleryUrl=await cloneMedia(
        image.image_url,
        galleryPath
      );

      createdPaths.push(galleryPath);

      const {error:imageError}=await sb
        .from('project_images')
        .insert({
          project_id:newId,
          image_url:newGalleryUrl,
          sort_order:
            Number(image.sort_order)||galleryCopied+1,
          active:image.active!==false,
          alt_text:image.alt_text||null
        });

      if(imageError)throw imageError;

      galleryCopied++;
    }

    await logActivity(
      'PROJECT_DUPLICATED',
      'project',
      newId,
      newTitle,
      {
        source_project_id:sourceId,
        source_project_name:source.title,
        gallery_images:galleryCopied,
        active:false,
        featured:false
      }
    );

    await loadAll();

    notice(
      '<strong>Proyecto duplicado.</strong> '+
      `“${newTitle}” fue creado como oculto con `+
      `${galleryCopied} fotografía(s) de galería.`
    );

  }catch(e){
    console.error(
      'AGAM duplicate project:',
      e
    );

    if(projectCreated){
      const {error:rollbackError}=await sb
        .from('projects')
        .delete()
        .eq('id',newId);

      if(rollbackError){
        console.error(
          'AGAM duplicate rollback DB:',
          rollbackError.message
        );
      }
    }

    if(createdPaths.length){
      const {error:storageRollbackError}=await sb.storage
        .from(cfg.bucket||'agam-media')
        .remove(createdPaths);

      if(storageRollbackError){
        console.error(
          'AGAM duplicate rollback Storage:',
          storageRollbackError.message
        );
      }
    }

    alert(
      'No se pudo duplicar el proyecto.\n\n'+
      (e?.message||e)+
      '\n\nEl proyecto original no fue modificado.'
    );

  }finally{
    busy=false;
  }
}
async function upload(kind){
  if(!pendingFile){
    return $('#itemImage').value.trim();
  }

  const path=
    `${kind}s/${crypto.randomUUID()}.webp`;

  const {error}=await sb.storage
    .from(cfg.bucket||'agam-media')
    .upload(
      path,
      pendingFile,
      {
        contentType:'image/webp',
        cacheControl:'31536000',
        upsert:false
      }
    );

  if(error)throw error;

  return sb.storage
    .from(cfg.bucket||'agam-media')
    .getPublicUrl(path)
    .data
    .publicUrl;
}

$('#applyItem').onclick=async()=>{
  if(busy)return;

  busy=true;

  const btn=$('#applyItem');
  btn.disabled=true;

  try{
    const kind=$('#itemKind').value;
    const id=$('#itemId').value||crypto.randomUUID();
    const arr=kind==='project'?data.projects:data.clients;
    const old=arr.find(v=>v.id===id);
    const image=await upload(kind);

    const base={
      id,
      image_url:image,
      sort_order:Math.max(
        1,
        Number($('#itemOrder').value)||1
      ),
      active:$('#itemActive').checked
    };

    let row;

    if(kind==='project'){
      row={
        ...base,
        title:$('#itemName').value.trim(),
        description:$('#itemDesc').value.trim(),
        project_date:$('#itemProjectDate').value||null,
        project_status:
  $('#itemProjectStatus').value||'En ejecucion',
project_category:
  $('#itemProjectCategory').value.trim()||'General',
seo_title:
  $('#itemSeoTitle').value.trim()||null,
seo_description:
  $('#itemSeoDescription').value.trim()||null,
image_alt:
  $('#itemImageAlt').value.trim()||null,
featured:
  $('#itemFeatured').checked
      };
    }else{
      row={
        ...base,
        name:$('#itemName').value.trim()
      };
    }

    if(!row.title&&!row.name){
      throw new Error('Escribe un nombre o título.');
    }

    if(!row.image_url){
      throw new Error(
        'Selecciona una imagen o conserva la existente.'
      );
    }

    if(kind==='project'){
      if((row.seo_title||'').length>60){
        throw new Error(
          'El título SEO no puede superar 60 caracteres.'
        );
      }

      if((row.seo_description||'').length>160){
        throw new Error(
          'La descripción SEO no puede superar 160 caracteres.'
        );
      }

      if((row.image_alt||'').length>180){
        throw new Error(
          'El texto ALT de la portada no puede superar 180 caracteres.'
        );
      }
    }

    const table=
      kind==='project'
        ?'projects'
        :'clients';

    const {error}=await sb
      .from(table)
      .upsert(row);

    if(error)throw error;

    if(
      pendingFile&&
      old?.image&&
      old.image!==image
    ){
      await deleteMedia(old.image);
    }

    await logActivity(
      old?'UPDATED':'CREATED',
      kind,
      id,
      row.title||row.name||'Sin nombre',
      {
        active:row.active,
        image_changed:!!pendingFile
      }
    );

    dlg.close();
    await loadAll();

    notice(
      '<strong>Guardado.</strong> '+
      'El contenido ya está disponible en el sitio público.'
    );

  }catch(e){
    alert('No se pudo guardar: '+e.message);

  }finally{
    btn.disabled=false;
    busy=false;
  }
};
async function purgeItem(kind,id){
  const arr=
    kind==='project'
      ?data.projects
      :data.clients;

  const item=arr.find(x=>x.id===id);

  if(!item||item.archived!==true){
    return alert(
      'Por seguridad, solo pueden eliminarse definitivamente registros que estén en la papelera.'
    );
  }

  const name=item.title||item.name||'Sin nombre';

  const typed=prompt(
    `ELIMINACIÓN DEFINITIVA\n\n`+
    `Esta acción no se puede deshacer.\n`+
    `Se eliminarán “${name}” y sus imágenes administradas por AGAM.\n\n`+
    `Para confirmar, escribe exactamente:\n${name}`
  );

  if(typed===null){
    return;
  }

  if(typed!==name){
    return alert(
      'Confirmación incorrecta. No se eliminó ningún registro ni archivo.'
    );
  }

  if(
    !confirm(
      `Última confirmación:\n\n`+
      `¿Eliminar definitivamente “${name}”?`
    )
  ){
    return;
  }

  const mediaUrls=[
    item.image,
    ...(kind==='project'
      ?(data.projectImages?.[id]||[]).map(g=>g.image_url)
      :[])
  ].filter(Boolean);

  const {error}=await sb
    .from(
      kind==='project'
        ?'projects'
        :'clients'
    )
    .delete()
    .eq('id',id)
    .eq('archived',true);

  if(error){
    return alert(
      'No se pudo eliminar el registro: '+
      error.message
    );
  }

  for(const url of mediaUrls){
    await deleteMedia(url);
  }

  await logActivity(
    'PURGED',
    kind,
    id,
    name,
    {media_count:mediaUrls.length}
  );

  await loadAll();

  notice(
    '<strong>Eliminado definitivamente.</strong> '+
    'El registro y sus archivos administrados por AGAM fueron retirados.'
  );
}
async function restoreItem(kind,id){
  const arr=
    kind==='project'
      ?data.projects
      :data.clients;

  const item=arr.find(x=>x.id===id);

  if(!item||item.archived!==true){
    return;
  }

  const name=item.title||item.name||'Sin nombre';

  if(
    !confirm(
      `¿Restaurar “${name}”?\n\n`+
      'Se retirará de la papelera, pero permanecerá oculto hasta que decidas publicarlo nuevamente.'
    )
  ){
    return;
  }

  const {error}=await sb
    .from(
      kind==='project'
        ?'projects'
        :'clients'
    )
    .update({
      archived:false,
      deleted_at:null,
      active:false
    })
    .eq('id',id);

  if(error){
    return alert(
      'No se pudo restaurar: '+
      error.message
    );
  }

  await logActivity(
    'RESTORED',
    kind,
    id,
    name,
    {active:false}
  );

  await loadAll();

  notice(
    '<strong>Restaurado.</strong> '+
    'El registro salió de la papelera y quedó oculto para revisión antes de publicarlo.'
  );
}
async function remove(kind,id){
  const arr=
    kind==='project'
      ?data.projects
      :data.clients;

  const item=arr.find(x=>x.id===id);

  if(!item){
    return;
  }

  const name=item.title||item.name||'Sin nombre';

  if(
    !confirm(
      `¿Enviar “${name}” a la papelera?\n\n`+
      'Dejará de mostrarse públicamente, pero el registro y sus imágenes se conservarán.'
    )
  ){
    return;
  }

  const {error}=await sb
    .from(
      kind==='project'
        ?'projects'
        :'clients'
    )
    .update({
      archived:true,
      deleted_at:new Date().toISOString(),
      active:false
    })
    .eq('id',id);

  if(error){
    return alert(
      'No se pudo enviar a la papelera: '+
      error.message
    );
  }

  await logActivity(
    'ARCHIVED',
    kind,
    id,
    name,
    {active:false}
  );

  await loadAll();

  notice(
    '<strong>Enviado a la papelera.</strong> '+
    'El registro dejó de mostrarse públicamente y sus archivos fueron conservados.'
  );
}


async function moveItem(kind,id,dir){
  if(busy)return;

  busy=true;

  try{
    const arr=[
      ...(kind==='project'
        ?data.projects
        :data.clients)
    ].sort(
      (a,b)=>(a.order||0)-(b.order||0)
    );

    const i=arr.findIndex(x=>x.id===id);
    const j=dir==='up'?i-1:i+1;

    if(i<0||j<0||j>=arr.length){
      return;
    }

    [arr[i],arr[j]]=[arr[j],arr[i]];

    const table=
      kind==='project'
        ?'projects'
        :'clients';

    for(let n=0;n<arr.length;n++){
      if(Number(arr[n].order)!==n+1){
        const {error}=await sb
          .from(table)
          .update({sort_order:n+1})
          .eq('id',arr[n].id);

        if(error)throw error;
      }
    }

    const moved=arr[j];

    await logActivity(
      'REORDERED',
      kind,
      moved.id,
      moved.title||moved.name||'Sin nombre',
      {
        direction:dir,
        new_position:j+1
      }
    );

    await loadAll();

  }catch(e){
    alert(
      'No se pudo cambiar el orden: '+
      e.message
    );

  }finally{
    busy=false;
  }
}

// FASE 3.3.4 - GALERIA ADMIN:
// UX + LIMITE DE 10 FOTOGRAFIAS ADICIONALES

const MAX_GALLERY_IMAGES=10;
const galleryDlg=$('#galleryEditor');
let galleryProjectId=null;

async function openGalleryAdmin(projectId){
  galleryProjectId=projectId;

  const p=data.projects.find(
    x=>x.id===projectId
  );

  $('#galleryTitle').textContent=
    p?.title||'Fotografías';

  $('#galleryFiles').value='';

  renderGalleryAdmin();
  galleryDlg.showModal();
}

function renderGalleryAdmin(){
  const rows=[
    ...(data.projectImages?.[galleryProjectId]||[])
  ].sort(
    (a,b)=>a.sort_order-b.sort_order
  );

  const count=rows.length;

  const remaining=Math.max(
    0,
    MAX_GALLERY_IMAGES-count
  );

  const counter=$('#galleryCurrentCount');
  const counterBox=$('#galleryCounter');
  const fileInput=$('#galleryFiles');
  const uploadBtn=$('#uploadGallery');

  if(counter){
    counter.textContent=count;
  }

  if(counterBox){
    counterBox.classList.toggle(
      'full',
      count>=MAX_GALLERY_IMAGES
    );

    counterBox.title=
      count>=MAX_GALLERY_IMAGES
        ?'Se alcanzó el límite de fotografías adicionales.'
        :`${remaining} espacio(s) disponible(s).`;
  }

  if(fileInput){
    fileInput.disabled=
      count>=MAX_GALLERY_IMAGES;

    if(count>=MAX_GALLERY_IMAGES){
      fileInput.value='';
    }
  }

  if(uploadBtn){
    uploadBtn.disabled=
      count>=MAX_GALLERY_IMAGES;

    uploadBtn.textContent=
      count>=MAX_GALLERY_IMAGES
        ?'Límite de 10 fotografías alcanzado'
        :'Subir fotografías';
  }

  $('#galleryAdminList').innerHTML=
    rows.length
      ?rows.map((x,i)=>`
        <article class="galleryAdminItem">
          <img
            src="${esc(x.image_url)}"
            alt="Foto ${i+1}"
          >

          <div class="gaBody">
            <small>
              Foto ${i+1} de ${count}
            </small>

            <label class="galleryAltField">
              Texto ALT
              <input
                type="text"
                maxlength="180"
                value="${esc(x.alt_text||'')}"
                data-galt-input="${esc(x.id)}"
                placeholder="Describe brevemente esta fotografía"
              >
            </label>

            <button
              type="button"
              data-galt-save="${esc(x.id)}"
            >
              Guardar ALT
            </button>

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
              >
                Eliminar
              </button>
            </div>
          </div>
        </article>
      `).join('')
      :'<p class="empty">Aún no hay fotografías adicionales.</p>';

  document
    .querySelectorAll('[data-galt-save]')
    .forEach(
      b=>b.onclick=
        ()=>saveGalleryAlt(b.dataset.galtSave)
    );

  document
    .querySelectorAll('[data-gdelete]')
    .forEach(
      b=>b.onclick=
        ()=>deleteGalleryImage(b.dataset.gdelete)
    );

  document
    .querySelectorAll('[data-gmove]')
    .forEach(
      b=>b.onclick=
        ()=>moveGalleryImage(
          b.dataset.gmove,
          b.dataset.dir
        )
    );
}

$('#closeGalleryAdmin').onclick=
  ()=>galleryDlg.close();

const galleryDropZone=$('#galleryDropZone');

['dragenter','dragover'].forEach(eventName=>{
  galleryDropZone.addEventListener(eventName,e=>{
    e.preventDefault();
    e.stopPropagation();
    galleryDropZone.classList.add('dragActive');
  });
});

['dragleave','drop'].forEach(eventName=>{
  galleryDropZone.addEventListener(eventName,e=>{
    e.preventDefault();
    e.stopPropagation();
    galleryDropZone.classList.remove('dragActive');
  });
});

galleryDropZone.addEventListener('drop',e=>{
  const dropped=[...(e.dataTransfer?.files||[])];

  if(!dropped.length)return;

  const input=$('#galleryFiles');
  const dt=new DataTransfer();

  dropped.forEach(file=>dt.items.add(file));
  input.files=dt.files;

  input.dispatchEvent(
    new Event('change',{bubbles:true})
  );
});

$('#galleryFiles').onchange=()=>{
  const input=$('#galleryFiles');
  const files=[...(input.files||[])];

  if(!files.length)return;

  const allowed=/^image\/(jpeg|png|webp)$/;
  const maxSize=5*1024*1024;

  const invalidFormat=files.find(
    file=>!allowed.test(file.type)
  );

  if(invalidFormat){
    input.value='';

    alert(
      `El archivo "${invalidFormat.name}" no tiene un formato permitido. `+
      'Usa únicamente JPG, PNG o WEBP.'
    );

    return;
  }

  const oversized=files.find(
    file=>file.size>maxSize
  );

  if(oversized){
    input.value='';

    alert(
      `El archivo "${oversized.name}" supera el límite de 5 MB.`
    );

    return;
  }

  const current=
    (data.projectImages?.[galleryProjectId]||[]).length;

  const remaining=Math.max(
    0,
    MAX_GALLERY_IMAGES-current
  );

  if(remaining===0){
    input.value='';

    alert(
      'Este proyecto ya alcanzó el límite de 10 fotografías adicionales.'
    );

    return;
  }

  if(files.length>remaining){
    input.value='';

    alert(
      `Este proyecto tiene ${current} fotografía(s) adicional(es). `+
      `Solo puedes seleccionar ${remaining} fotografía(s) más.`
    );

    return;
  }
};

$('#uploadGallery').onclick=async()=>{
  const input=$('#galleryFiles');
  const files=[...(input.files||[])];

  if(!files.length){
    return alert(
      'Selecciona una o más fotografías.'
    );
  }

  const current=
    (data.projectImages?.[galleryProjectId]||[]).length;

  const remaining=Math.max(
    0,
    MAX_GALLERY_IMAGES-current
  );

  // Validación obligatoria antes de optimizar
  // o subir archivos a Storage.
  if(remaining===0){
    input.value='';
    renderGalleryAdmin();

    return alert(
      'Este proyecto ya alcanzó el límite de 10 fotografías adicionales.'
    );
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
      const f=await optimizeImage(
        raw,
        'project'
      );

      const path=
        `projects/${galleryProjectId}/gallery/${crypto.randomUUID()}.webp`;

      const {error:upErr}=await sb.storage
        .from(cfg.bucket||'agam-media')
        .upload(
          path,
          f,
          {
            contentType:'image/webp',
            cacheControl:'31536000',
            upsert:false
          }
        );

      if(upErr)throw upErr;

      const url=sb.storage
        .from(cfg.bucket||'agam-media')
        .getPublicUrl(path)
        .data
        .publicUrl;

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

    const project=data.projects.find(x=>x.id===galleryProjectId);

    await logActivity(
      'GALLERY_IMAGES_ADDED',
      'project',
      galleryProjectId,
      project?.title||'Sin nombre',
      {count:files.length}
    );

    await loadAll();
    renderGalleryAdmin();

    notice(
      '<strong>Galería actualizada.</strong> '+
      'Las fotografías ya están disponibles en el sitio público.'
    );

  }catch(e){
    alert(
      'No se pudieron subir las fotografías: '+
      e.message
    );

  }finally{
    renderGalleryAdmin();
  }
};

async function deleteGalleryImage(id){
  const row=
    (data.projectImages?.[galleryProjectId]||[])
      .find(x=>x.id===id);

  if(
    !row||
    !confirm(
      '¿Eliminar esta fotografía de la galería?'
    )
  ){
    return;
  }

  const {error}=await sb
    .from('project_images')
    .delete()
    .eq('id',id);

  if(error){
    return alert(error.message);
  }

  await deleteMedia(row.image_url);

  const project=data.projects.find(x=>x.id===galleryProjectId);

  await logActivity(
    'GALLERY_IMAGE_DELETED',
    'project',
    galleryProjectId,
    project?.title||'Sin nombre',
    {image_id:id}
  );

  await loadAll();
  renderGalleryAdmin();
}

async function saveGalleryAlt(id){
  const input=document.querySelector(
    `[data-galt-input="${id}"]`
  );

  if(!input){
    return alert(
      'No se encontró el campo ALT de esta fotografía.'
    );
  }

  const alt=input.value.trim();

  if(alt.length>180){
    return alert(
      'El texto ALT no puede superar 180 caracteres.'
    );
  }

  const {error}=await sb
    .from('project_images')
    .update({
      alt_text:alt||null
    })
    .eq('id',id);

  if(error){
    return alert(error.message);
  }

  const project=data.projects.find(
    x=>x.id===galleryProjectId
  );

  await logActivity(
    'GALLERY_ALT_UPDATED',
    'project',
    galleryProjectId,
    project?.title||'Sin nombre',
    {
      image_id:id,
      alt_defined:!!alt
    }
  );

  await loadAll();
  renderGalleryAdmin();

  const galleryNotice=$('#galleryNotice');

  if(galleryNotice){
    galleryNotice.hidden=false;
    galleryNotice.className='notice';
    galleryNotice.textContent=
      'Texto ALT actualizado correctamente.';
  }else{
    notice(
      'Texto ALT actualizado correctamente.'
    );
  }
}

async function moveGalleryImage(id,dir){
  const rows=[
    ...(data.projectImages?.[galleryProjectId]||[])
  ].sort(
    (a,b)=>a.sort_order-b.sort_order
  );

  const i=rows.findIndex(
    x=>x.id===id
  );

  const j=
    dir==='up'
      ?i-1
      :i+1;

  if(i<0||j<0||j>=rows.length){
    return;
  }

  [rows[i],rows[j]]=
    [rows[j],rows[i]];

  for(let n=0;n<rows.length;n++){
    const {error}=await sb
      .from('project_images')
      .update({
        sort_order:n+1
      })
      .eq(
        'id',
        rows[n].id
      );

    if(error){
      return alert(error.message);
    }
  }

  const project=data.projects.find(x=>x.id===galleryProjectId);
  const moved=rows[j];

  await logActivity(
    'GALLERY_REORDERED',
    'project',
    galleryProjectId,
    project?.title||'Sin nombre',
    {
      image_id:moved.id,
      direction:dir,
      new_position:j+1
    }
  );

  await loadAll();
  renderGalleryAdmin();
}

// FASE 3.3.4 - ESCANEO RECURSIVO SEGURO DE STORAGE

async function listAllFiles(folder){
  const bucket=
    cfg.bucket||'agam-media';

  const out=[];

  async function walk(currentFolder){
    let offset=0;

    for(;;){
      const {data:items,error}=
        await sb.storage
          .from(bucket)
          .list(
            currentFolder,
            {
              limit:100,
              offset,
              sortBy:{
                column:'name',
                order:'asc'
              }
            }
          );

      if(error)throw error;

      const rows=items||[];

      for(const item of rows){
        if(
          !item?.name||
          item.name.startsWith('.')
        ){
          continue;
        }

        const path=
          currentFolder
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

      if(rows.length<100){
        break;
      }

      offset+=100;
    }
  }

  await walk(folder);

  return out;
}

async function scanOrphans(){
  const used=new Set(
    [
      ...(data.projects||[]),
      ...(data.clients||[])
    ]
      .map(
        x=>storagePathFromUrl(x.image)
      )
      .filter(Boolean)
  );

  Object.values(
    data.projectImages||{}
  )
    .flat()
    .forEach(x=>{
      const path=
        storagePathFromUrl(
          x.image_url
        );

      if(path){
        used.add(path);
      }
    });

  const candidates=[];

  for(const folder of [
    'projects',
    'clients'
  ]){
    const files=
      await listAllFiles(folder);

    for(const path of files){
      if(!used.has(path)){
        candidates.push(path);
      }
    }
  }

  return candidates;
}



async function cleanupOrphans(){
  if(busy)return;

  busy=true;

  const btn=$('#cleanupMedia');

  if(btn){
    btn.disabled=true;
  }

  try{
    const orphan=await scanOrphans();

    if(!orphan.length){
      notice(
        '<strong>Storage limpio.</strong> '+
        'No se encontraron imágenes huérfanas.'
      );
      return;
    }

    const sample=
      orphan.slice(0,8).join('\n');

    const more=
      orphan.length>8
        ?'\n…'
        :'';

    if(
      !confirm(
        `Se encontraron ${orphan.length} archivo(s) huérfano(s) administrados por AGAM:\n\n`+
        `${sample}${more}\n\n`+
        '¿Deseas eliminarlos de Storage?\n\n'+
        'Solo se eliminarán archivos de projects/ y clients/ '+
        'que no estén referenciados por la base de datos.'
      )
    ){
      return;
    }

    const {error}=await sb.storage
      .from(cfg.bucket||'agam-media')
      .remove(orphan);

    if(error){
      throw error;
    }

    notice(
      `<strong>Limpieza completada.</strong> `+
      `Se eliminaron ${orphan.length} archivo(s) huérfano(s).`
    );

  }catch(e){
    alert(
      'No se pudo limpiar Storage: '+
      e.message
    );

  }finally{
    if(btn){
      btn.disabled=false;
    }

    busy=false;
  }
}

$('#cleanupMedia').onclick=cleanupOrphans;

$('#projectSearch').oninput=render;
$('#clientSearch').oninput=render;

$('#saveAll').onclick=async()=>{
  const row={
  id:1,
  whatsapp:$('#sWhatsapp').value.trim(),
  email:$('#sEmail').value.trim(),
  phones:$('#sPhones').value.trim(),
  location:$('#sLocation').value.trim(),
  company_name:$('#sCompanyName').value.trim(),
  company_tagline:$('#sCompanyTagline').value.trim(),
  response_time:$('#sResponseTime').value.trim(),
  experience_years:$('#sExperienceYears').value.trim(),
  business_scope:$('#sBusinessScope').value.trim(),
  business_focus:$('#sBusinessFocus').value.trim()
};
  if(!row.company_name){
    return alert(
      'El nombre empresarial es obligatorio.'
    );
  }

  const limits=[
    ['Nombre empresarial',row.company_name,100],
    ['Lema',row.company_tagline,120],
    ['WhatsApp',row.whatsapp,20],
    ['Correo',row.email,150],
    ['Teléfonos',row.phones,100],
    ['Ubicación',row.location,150],
    ['Tiempo de respuesta',row.response_time,40],
    ['Experiencia',row.experience_years,40],
    ['Área / alcance',row.business_scope,100],
    ['Enfoque empresarial',row.business_focus,150]
  ];

  const invalidField=limits.find(
    ([,value,max])=>(value||'').length>max
  );

  if(invalidField){
    return alert(
      `${invalidField[0]} supera el máximo de `+
      `${invalidField[2]} caracteres.`
    );
  }
  if(
    row.email&&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
  ){
    return alert(
      'El correo no tiene un formato válido.'
    );
  }

  const {error}=await sb
    .from('site_settings')
    .upsert(row);

  if(error){
    return alert(error.message);
  }

 data.settings={
  whatsapp:row.whatsapp,
  email:row.email,
  phones:row.phones,
  location:row.location,
  companyName:row.company_name,
  companyTagline:row.company_tagline,
  responseTime:row.response_time,
  experienceYears:row.experience_years,
  businessScope:row.business_scope,
  businessFocus:row.business_focus
};

  await logActivity(
    'SETTINGS_UPDATED',
    'site_settings',
    '1',
    'Configuración empresarial',
    {}
  );

  notice(
    '<strong>Configuración guardada.</strong> '+
    'Los datos quedaron sincronizados.'
  );
};

sb.auth.onAuthStateChange(
  (_e,s)=>{
    session=s;

    $('#loginGate')
      .classList
      .toggle(
        'hidden',
        !!s
      );
  }
);

await requireSession();

})();
