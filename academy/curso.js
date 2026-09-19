const cfg=window.OYAG_CONFIG;
const sb=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:localStorage}});
const levelsEl=document.querySelector('#levels');
const previewEl=document.querySelector('#preview');
const ownerEl=document.querySelector('#ownerPreview');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function previewLesson(lesson,module,canAccess){
  previewEl.innerHTML='<div class="preview-body">'+
    '<p class="eyebrow">Nível '+esc(module.position)+' · Aula '+esc(lesson.position)+'</p>'+
    '<h2>'+esc(lesson.title)+'</h2>'+
    '<p class="muted">'+(canAccess?'Esta aula está publicada e disponível para sua conta.':'Esta aula faz parte de um nível publicado, mas o conteúdo completo permanece bloqueado até a liberação deste nível.')+'</p>'+
    '<div class="method"><span>Entender</span><span>Praticar</span><span>Validar</span><span>Evoluir</span></div>'+
    '<div class="preview-footer">'+
      (canAccess?'<a class="primary" href="./lesson.html?slug='+encodeURIComponent(lesson.slug)+'">Abrir aula</a>':'<span class="locked-note">🔒 Acesso por nível. O checkout e a liberação automática serão conectados à próxima etapa comercial.</span>')+
    '</div></div>';
}

async function init(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){location.replace('../login.html?next='+encodeURIComponent('/academy/curso.html'));return}
  const uid=session.user.id;
  const {data:roleRow}=await sb.from('platform_roles').select('role').eq('user_id',uid).maybeSingle();
  const isOwner=['owner','platform_admin'].includes(roleRow?.role);
  if(isOwner)ownerEl.classList.add('show');

  const [{data:outline,error:outlineError},{data:entitlements}]=await Promise.all([
    sb.rpc('academy_course_outline',{p_course_slug:'programacao-basico-ao-hard'}),
    sb.from('academy_level_entitlements').select('module_id,status,expires_at').eq('user_id',uid).eq('status','active')
  ]);

  if(outlineError||!outline){levelsEl.innerHTML='<p>Não foi possível carregar a trilha.</p>';return}

  const byModule=new Map();
  outline.forEach(row=>{
    if(!byModule.has(row.module_id)){
      byModule.set(row.module_id,{
        id:row.module_id,title:row.module_title,description:row.module_description,
        position:row.module_position,required_plan:row.required_plan,status:row.module_status,lessons:[]
      });
    }
    if(row.lesson_id)byModule.get(row.module_id).lessons.push({
      id:row.lesson_id,slug:row.lesson_slug,title:row.lesson_title,position:row.lesson_position,status:row.lesson_status
    });
  });

  const activeEntitlements=new Set((entitlements||[]).filter(e=>!e.expires_at||new Date(e.expires_at)>new Date()).map(e=>e.module_id));
  const modules=[...byModule.values()].sort((a,b)=>a.position-b.position);

  levelsEl.innerHTML='';
  modules.forEach(module=>{
    const canAccess=isOwner||module.required_plan==='free'||activeEntitlements.has(module.id);
    const card=document.createElement('article');
    card.className='level-card-row'+(canAccess?'':' locked');
    const label=module.required_plan==='free'?'Gratuito':canAccess?'Liberado':'Acesso por nível';
    card.innerHTML='<div class="level-meta"><span class="chip">Nível '+esc(module.position)+'</span><span class="chip '+(canAccess?'':'lock')+'">'+esc(label)+'</span>'+(isOwner?'<span class="chip lock">Proprietário</span>':'')+'</div>'+
      '<h2>'+esc(module.title)+'</h2><p>'+esc(module.description||'')+'</p><div class="lesson-buttons"></div>'+
      (!canAccess?'<div class="locked-note">🔒 Nível publicado. O conteúdo é liberado para contas com acesso a este nível.</div>':'');

    const buttons=card.querySelector('.lesson-buttons');
    module.lessons.sort((a,b)=>a.position-b.position).forEach(lesson=>{
      const b=document.createElement('button');
      b.type='button';
      b.className=canAccess?'':'lesson-locked';
      b.innerHTML=(canAccess?'▶ ':'🔒 ')+esc(lesson.title);
      b.onclick=()=>previewLesson(lesson,module,canAccess);
      buttons.appendChild(b);
    });
    levelsEl.appendChild(card);
  });

  const firstModule=modules[0],firstLesson=firstModule?.lessons?.[0];
  if(firstModule&&firstLesson)previewLesson(firstLesson,firstModule,true);
}
init();