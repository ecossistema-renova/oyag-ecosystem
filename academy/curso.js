const cfg=window.OYAG_CONFIG;
const sb=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:localStorage}});
const params=new URLSearchParams(location.search);
const courseSlug=params.get('course')||'programacao-basico-ao-hard';
const levelsEl=document.querySelector('#levels');
const previewEl=document.querySelector('#preview');
const ownerEl=document.querySelector('#ownerPreview');
const courseEyebrowEl=document.querySelector('#courseEyebrow');
const courseTitleEl=document.querySelector('#courseTitle');
const courseDescriptionEl=document.querySelector('#courseDescription');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=(c,cur='BRL')=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:cur||'BRL'}).format(Number(c||0)/100);
let session=null,isOwner=false,courseMeta=null;

function courseHref(){return './curso.html?course='+encodeURIComponent(courseSlug)}
function lessonHref(slug){return './lesson.html?slug='+encodeURIComponent(slug)+'&course='+encodeURIComponent(courseSlug)}

function previewLesson(lesson,module,canAccess){
  previewEl.innerHTML='<div class="preview-body">'+
    '<p class="eyebrow">Nível '+esc(module.position)+' · Aula '+esc(lesson.position)+'</p>'+
    '<h2>'+esc(lesson.title)+'</h2>'+
    '<p class="muted">'+(canAccess?'Esta aula está publicada e disponível para sua conta.':'Esta aula faz parte de um nível publicado, mas o conteúdo completo permanece bloqueado até a liberação deste nível.')+'</p>'+
    '<div class="method"><span>Entender</span><span>Praticar</span><span>Validar</span><span>Evoluir</span></div>'+
    '<div class="preview-footer">'+
      (canAccess?'<a class="primary" href="'+lessonHref(lesson.slug)+'">Abrir aula</a>':
        '<div class="locked-note">🔒 Este conteúdo é liberado conforme a regra de acesso do nível.</div>'+
        (module.isNextPurchasable&&module.catalog_item_id?'<div class="academy-price-anchor">'+
          (module.promo_eligible&&module.promo_price_cents<module.regular_price_cents?'<del>'+esc(money(module.regular_price_cents,module.currency))+'</del>':'')+
          '<strong>'+esc(money(module.effective_price_cents,module.currency))+'</strong>'+
          (module.promo_eligible?'<small>Oferta disponível para sua conta.</small>':'<small>Preço regular.</small>')+
        '</div><button class="primary academy-buy" type="button" data-buy-module="'+esc(module.id)+'">Liberar Nível '+esc(module.position)+' por '+esc(money(module.effective_price_cents,module.currency))+'</button>':'<span class="locked-note">Avance pela trilha anterior para chegar a esta etapa.</span>'))+
    '</div></div>';
  const buy=previewEl.querySelector('[data-buy-module]');
  if(buy)buy.onclick=()=>startCheckout(module,buy);
}

async function startCheckout(module,button){
  if(!session){location.replace('../login.html?next='+encodeURIComponent('/academy/curso.html?course='+courseSlug));return}
  if(!module.catalog_item_id)return;
  button.disabled=true;
  const old=button.textContent;
  button.textContent='Preparando checkout…';
  const idem='academy-'+session.user.id+'-'+module.id+'-'+Date.now();
  try{
    const r=await fetch(cfg.supabaseUrl+'/functions/v1/oyag-create-checkout',{
      method:'POST',
      headers:{apikey:cfg.supabasePublishableKey,authorization:'Bearer '+session.access_token,'content-type':'application/json','x-idempotency-key':idem},
      body:JSON.stringify({items:[{catalog_item_id:module.catalog_item_id,quantity:1}],idempotency_key:idem})
    });
    const data=await r.json().catch(()=>({}));
    const checkout=data?.checkout;
    const checkoutId=checkout?.checkout_id||checkout?.id||null;
    if(!r.ok||!data?.ok||!checkoutId)throw new Error(data?.error||'checkout_creation_failed');
    location.href='../checkout.html?id='+encodeURIComponent(checkoutId)+'&flow=academy&module='+encodeURIComponent(module.id);
  }catch(e){
    console.error('ACADEMY_CHECKOUT',e);
    button.disabled=false;button.textContent=old;
    alert('Não foi possível abrir o checkout agora. Tente novamente em instantes.');
  }
}

async function init(){
  const auth=await sb.auth.getSession();
  session=auth?.data?.session||null;
  if(!session){location.replace('../login.html?next='+encodeURIComponent('/academy/curso.html?course='+courseSlug));return}
  const uid=session.user.id;
  const [{data:roleRow},{data:courseRow,error:courseError}]=await Promise.all([
    sb.from('platform_roles').select('role').eq('user_id',uid).maybeSingle(),
    sb.from('academy_courses').select('slug,title,description,level_start,level_end,status').eq('slug',courseSlug).maybeSingle()
  ]);
  isOwner=['owner','platform_admin'].includes(roleRow?.role);
  if(isOwner)ownerEl.classList.add('show');
  if(courseError||!courseRow){
    levelsEl.innerHTML='<p>Curso não encontrado ou indisponível.</p>';return;
  }
  courseMeta=courseRow;
  document.title=courseMeta.title+' | OYAG Academy';
  courseEyebrowEl.textContent='OYAG Academy · '+courseMeta.level_end+' níveis';
  courseTitleEl.textContent=courseMeta.title;
  courseDescriptionEl.textContent=courseMeta.description||'Formação prática da OYAG Academy.';

  const {data:outline,error:outlineError}=await sb.rpc('academy_course_outline_v4',{p_course_slug:courseSlug});
  if(outlineError||!outline){levelsEl.innerHTML='<p>Não foi possível carregar a trilha.</p>';return}

  const byModule=new Map();
  outline.forEach(row=>{
    if(!byModule.has(row.module_id)){
      byModule.set(row.module_id,{
        id:row.module_id,title:row.module_title,description:row.module_description,
        position:row.module_position,required_plan:row.required_plan,status:row.module_status,
        catalog_item_id:row.catalog_item_id,
        regular_price_cents:Number(row.regular_price_cents||0),promo_price_cents:Number(row.promo_price_cents||0),
        effective_price_cents:Number(row.effective_price_cents||row.regular_price_cents||0),currency:row.currency||'BRL',
        promo_eligible:Boolean(row.promo_eligible),promo_qualification_ends_at:row.promo_qualification_ends_at,promo_label:row.promo_label||'',
        has_access:Boolean(row.has_access),can_purchase:Boolean(row.can_purchase),
        lesson_count:Number(row.lesson_count||0),mastered_count:Number(row.mastered_count||0),progress_percent:Number(row.progress_percent||0),lessons:[]
      });
    }
    if(row.lesson_id)byModule.get(row.module_id).lessons.push({
      id:row.lesson_id,slug:row.lesson_slug,title:row.lesson_title,position:row.lesson_position,status:row.lesson_status,
      progress_status:row.lesson_progress_status,best_score:Number(row.lesson_best_score||0)
    });
  });

  const modules=[...byModule.values()].sort((a,b)=>a.position-b.position);
  levelsEl.innerHTML='';
  modules.forEach(module=>{
    const canAccess=isOwner||module.has_access||module.required_plan==='free';
    const isNextPurchasable=!canAccess&&module.can_purchase;
    const card=document.createElement('article');
    card.className='level-card-row'+(canAccess?'':' locked');
    const label=module.required_plan==='free'?'Gratuito':canAccess?'Liberado':isNextPurchasable&&module.catalog_item_id?money(module.effective_price_cents,module.currency):'Próxima etapa';
    card.innerHTML='<div class="level-meta"><span class="chip">Nível '+esc(module.position)+'</span><span class="chip '+(canAccess?'':'lock')+'">'+esc(label)+'</span>'+(isOwner?'<span class="chip lock">Proprietário</span>':'')+'</div>'+
      '<h2>'+esc(module.title)+'</h2><p>'+esc(module.description||'')+'</p>'+
      '<div class="academy-level-progress"><div><span>Progresso</span><strong>'+esc(module.mastered_count)+'/'+esc(module.lesson_count)+' aulas</strong></div><div class="academy-level-progressbar"><i style="width:'+esc(module.progress_percent)+'%"></i></div><small>'+esc(module.progress_percent)+'% concluído</small></div>'+
      '<div class="lesson-buttons"></div>'+
      (!canAccess?'<div class="locked-note">'+(isNextPurchasable?'🔒 Próximo nível da sua trilha. A regra comercial de liberação aparece aqui quando configurada.':'🔒 Conclua e libere as etapas anteriores para continuar.')+'</div>'+
        (module.promo_eligible&&module.promo_price_cents<module.regular_price_cents?'<div class="academy-price-anchor compact"><del>'+esc(money(module.regular_price_cents,module.currency))+'</del><strong>'+esc(money(module.promo_price_cents,module.currency))+'</strong><small>Preço disponível para sua conta.</small></div>':
          (!canAccess&&module.regular_price_cents?'<div class="academy-price-anchor compact"><strong>'+esc(money(module.regular_price_cents,module.currency))+'</strong><small>Preço regular.</small></div>':''))+
        (isNextPurchasable&&module.catalog_item_id?'<button class="primary academy-buy-card" type="button">Liberar por '+esc(money(module.effective_price_cents,module.currency))+'</button>':''):'');

    const buttons=card.querySelector('.lesson-buttons');
    module.lessons.sort((a,b)=>a.position-b.position).forEach(lesson=>{
      const b=document.createElement('button');b.type='button';b.className=canAccess?'':'lesson-locked';
      b.innerHTML=(lesson.progress_status==='mastered'?'✓ ':canAccess?'▶ ':'🔒 ')+esc(lesson.title);
      b.onclick=()=>previewLesson(lesson,{...module,isNextPurchasable},canAccess);buttons.appendChild(b);
    });
    const buy=card.querySelector('.academy-buy-card');if(buy)buy.onclick=()=>startCheckout(module,buy);
    levelsEl.appendChild(card);
  });

  const firstModule=modules.find(m=>(isOwner||m.has_access||m.required_plan==='free')&&m.mastered_count<m.lesson_count)
    ||modules.find(m=>isOwner||m.has_access||m.required_plan==='free')||modules[0];
  const firstLesson=firstModule?.lessons?.[0];
  if(firstModule&&firstLesson)previewLesson(firstLesson,firstModule,isOwner||firstModule.has_access||firstModule.required_plan==='free');
}
init();