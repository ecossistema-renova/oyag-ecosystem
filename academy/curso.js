const cfg=window.OYAG_CONFIG;
const sb=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:localStorage}});
const levelsEl=document.querySelector('#levels');
const previewEl=document.querySelector('#preview');
const ownerEl=document.querySelector('#ownerPreview');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function theoryValue(theory,key,fallback=''){return theory&&typeof theory==='object'&&theory[key]?theory[key]:fallback}
function showLesson(lesson,module,isOwner){
  const theory=lesson.theory||{};
  const methodology=Array.isArray(theory.methodology)?theory.methodology:[];
  previewEl.innerHTML='<div class="preview-body">'+
    '<p class="eyebrow">Nível '+esc(module.position)+' · Aula '+esc(lesson.position)+(isOwner&&lesson.status!=='published'?' · PRÉVIA':'')+'</p>'+
    '<h2>'+esc(lesson.title)+'</h2>'+
    '<div class="method">'+methodology.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>'+
    '<dl>'+
      '<div><dt>Objetivo</dt><dd>'+esc(theoryValue(theory,'objective','Compreender e aplicar o conteúdo desta etapa.'))+'</dd></div>'+
      '<div><dt>Prática</dt><dd>'+esc(theoryValue(theory,'practice',lesson.instructions||'Atividade prática da etapa.'))+'</dd></div>'+
      '<div><dt>Critério de domínio</dt><dd>'+esc(theoryValue(theory,'checkpoint','Cumprir os requisitos essenciais com 100% de domínio.'))+'</dd></div>'+
    '</dl>'+
    '<div class="preview-footer">'+
      (lesson.slug==='o-que-e-programacao'?'<a class="primary" href="./aula-demo.html">Abrir aula interativa</a>':'<span class="locked-note">'+(isOwner?'Estrutura pedagógica disponível para revisão do proprietário. Conteúdo interativo completo será conectado nesta etapa.':'Esta aula será liberada conforme sua progressão e acesso ao nível.')+'</span>')+
    '</div></div>';
}
async function init(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){
    const next=encodeURIComponent('/academy/curso.html');
    location.replace('../login.html?next='+next);
    return;
  }
  const uid=session.user.id;
  const {data:roleRow}=await sb.from('platform_roles').select('role').eq('user_id',uid).maybeSingle();
  const isOwner=roleRow?.role==='owner';
  if(isOwner)ownerEl.classList.add('show');
  const {data:course,error:courseError}=await sb.from('academy_courses').select('id,title,description').eq('slug','programacao-basico-ao-hard').maybeSingle();
  if(courseError||!course){levelsEl.innerHTML='<p>Não foi possível carregar o curso.</p>';return}
  const {data:modules,error:moduleError}=await sb.from('academy_modules').select('id,title,description,position,required_plan,status').eq('course_id',course.id).order('position');
  if(moduleError||!modules){levelsEl.innerHTML='<p>Não foi possível carregar os níveis.</p>';return}
  const ids=modules.map(m=>m.id);
  let lessons=[];
  if(ids.length){
    const q=await sb.from('academy_lessons').select('id,module_id,slug,title,theory,instructions,position,status').in('module_id',ids).order('position');
    lessons=q.data||[];
  }
  levelsEl.innerHTML='';
  modules.forEach(module=>{
    const moduleLessons=lessons.filter(l=>l.module_id===module.id);
    const locked=!isOwner&&module.required_plan!=='free';
    const card=document.createElement('article');
    card.className='level-card-row'+(locked?' locked':'');
    const label=module.required_plan==='free'?'Gratuito':'Acesso por nível';
    card.innerHTML='<div class="level-meta"><span class="chip">Nível '+esc(module.position)+'</span><span class="chip '+(locked?'lock':'')+'">'+esc(label)+'</span>'+(isOwner&&module.status!=='published'?'<span class="chip lock">Prévia</span>':'')+'</div>'+
      '<h2>'+esc(module.title)+'</h2><p>'+esc(module.description||'')+'</p>'+
      '<div class="lesson-buttons"></div>'+
      (locked?'<div class="locked-note">Conclua o nível anterior e contrate este nível para liberar as aulas.</div>':'');
    const buttons=card.querySelector('.lesson-buttons');
    if(isOwner||!locked){
      if(moduleLessons.length){
        moduleLessons.forEach(lesson=>{
          const b=document.createElement('button');
          b.type='button';
          b.textContent=(lesson.status==='published'?'▶ ':'◌ ')+lesson.title;
          b.onclick=()=>showLesson(lesson,module,isOwner);
          buttons.appendChild(b);
        });
      }else if(!locked){
        buttons.innerHTML='<div class="locked-note">As próximas aulas deste nível serão liberadas conforme a trilha.</div>';
      }
    }
    levelsEl.appendChild(card);
  });
  if(isOwner&&lessons.length)showLesson(lessons[0],modules.find(m=>m.id===lessons[0].module_id),true);
}
init();