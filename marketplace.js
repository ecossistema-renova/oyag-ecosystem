const cfg=window.OYAG_CONFIG;
const legacySessionKey='sb-'+new URL(cfg.supabaseUrl).hostname.split('.')[0]+'-auth-token';
if(!localStorage.getItem(legacySessionKey)&&sessionStorage.getItem(legacySessionKey)){
  localStorage.setItem(legacySessionKey,sessionStorage.getItem(legacySessionKey));
  sessionStorage.removeItem(legacySessionKey);
}
const sb=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:localStorage}
});
const grid=document.querySelector('#marketGrid'),statusEl=document.querySelector('#marketStatus'),searchEl=document.querySelector('#search'),catEl=document.querySelector('#category'),stateEl=document.querySelector('#regionState'),cityEl=document.querySelector('#regionCity'),orderEl=document.querySelector('#order');
let items=[],buying=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=(c,cur)=>c==null?'Consulte':new Intl.NumberFormat('pt-BR',{style:'currency',currency:cur||'BRL'}).format(Number(c)/100);

const ACADEMY_PUBLIC='https://academy.cledemilsonoliveira.com/';
function academyCourseFromItem(item){
  if(!item)return '';
  try{
    if(item.destination_url){
      const u=new URL(item.destination_url,location.origin);
      if(u.pathname.endsWith('/academy/curso.html')||u.pathname.endsWith('/curso.html')){
        const slug=u.searchParams.get('course')||'';
        if(/^[a-z0-9][a-z0-9-]{1,99}$/.test(slug))return slug;
      }
    }
  }catch(_){}
  return '';
}
function enterAcademy(item,action=''){
  const course=academyCourseFromItem(item);
  try{
    if(course){
      localStorage.setItem('oyag-academy-public-entry',JSON.stringify({
        course,
        action:action||'',
        created_at:Date.now()
      }));
    }
  }catch(_){}
  location.assign(ACADEMY_PUBLIC);
}


const UFS=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
UFS.forEach(uf=>stateEl?.insertAdjacentHTML('beforeend','<option value="'+uf+'">'+uf+'</option>'));
try{
 const savedState=localStorage.getItem('oyag-market-state')||'',savedCity=localStorage.getItem('oyag-market-city')||'';
 if(stateEl)stateEl.value=savedState;if(cityEl)cityEl.value=savedCity;
}catch(_){}

function regionRank(x){
 const state=stateEl?.value||'',city=(cityEl?.value||'').trim().toLowerCase();
 if(!state)return x.is_featured?0:1;
 if(x.market_scope==='local'&&x.market_state===state&&(!city||String(x.market_city||'').toLowerCase()===city))return 0;
 if(x.market_scope==='state'&&x.market_state===state)return 1;
 if(x.market_scope==='national'||x.market_scope==='digital')return 2;
 if(x.market_state===state)return 2;
 return 3;
}
function locationLabel(x){
 if(x.market_scope==='digital')return 'Online · todo o Brasil';
 if(x.market_scope==='national')return 'Atendimento nacional';
 if(x.market_scope==='state')return x.market_state?'Atende '+x.market_state:'Atendimento estadual';
 if(x.market_scope==='local')return [x.market_city,x.market_state].filter(Boolean).join(' / ')||'Atendimento local';
 return '';
}
function discountPct(x){
 const r=Number(x.regular_price_cents),p=Number(x.promo_price_cents);
 return r>0&&p>=0&&p<r?Math.round((1-p/r)*100):0;
}
function render(){
 const q=searchEl.value.trim().toLowerCase(),c=catEl.value;
 let list=items.filter(x=>(!q||[x.name,x.description,x.organization_name,x.market_city,x.market_state].some(v=>String(v||'').toLowerCase().includes(q)))&&(!c||x.category===c));
 list.sort((a,b)=>{
   const rr=regionRank(a)-regionRank(b);if(rr)return rr;
   if(Boolean(a.is_featured)!==Boolean(b.is_featured))return a.is_featured?-1:1;
   if(orderEl.value==='price_asc')return (a.price_cents??Infinity)-(b.price_cents??Infinity);
   if(orderEl.value==='price_desc')return (b.price_cents??-1)-(a.price_cents??-1);
   return a.name.localeCompare(b.name,'pt-BR');
 });
 const state=stateEl?.value||'';
 statusEl.textContent=list.length?list.length+' oferta(s) encontrada(s)'+(state?' · '+state+' priorizado':''):'Nenhuma oferta publicada no momento.';
 grid.innerHTML=list.map(x=>{
  const pct=discountPct(x),promo=x.promo_price_cents!=null;
  return '<article class="market-card">'+
   '<div class="market-media">'+(x.image_url?'<img src="'+esc(x.image_url)+'" alt="'+esc(x.name)+'">':'<div class="market-placeholder">OYAG</div>')+
   '<div class="market-badges">'+(x.is_featured?'<span class="market-badge featured">Destaque</span>':'')+(pct?'<span class="market-badge promo">-'+pct+'%</span>':'')+(x.promo_label?'<span class="market-badge free">'+esc(x.promo_label)+'</span>':'')+'</div></div>'+
   '<div><small>'+esc(x.category||x.item_type)+'</small><h2>'+esc(x.name)+'</h2><p>'+esc(x.description||'Oferta disponível no OYAG Ecosystem.')+
   '</p><span>'+esc(x.organization_name)+'</span>'+
   (promo&&x.regular_price_cents!=null?
     '<div class="market-price-anchor"><del>'+esc(money(x.regular_price_cents,x.currency))+'</del><strong>'+esc(money(x.promo_price_cents,x.currency))+'</strong><small>'+(x.promo_ends_at?'Oferta por tempo limitado':'Condição promocional')+'</small></div>':
     '<strong>'+esc(money(x.price_cents,x.currency))+'</strong>')+
   (locationLabel(x)?'<em class="market-location">⌖ '+esc(locationLabel(x))+'</em>':'')+
   (x.commercial_condition?'<em>'+esc(x.commercial_condition)+'</em>':'')+
   (x.fulfillment_type==='physical'?'<em>'+(x.shipping_mode==='fixed'?'Frete fixo: '+esc(money(x.shipping_fixed_cents,x.currency)):'Frete grátis')+'</em>':'')+
   '<button class="button primary buy-button" type="button" data-buy="'+esc(x.id)+'">'+(x.destination_url?'Acessar':x.category==='OYAG Academy'?'Acessar na Academy':'Comprar')+'</button></div></article>';
 }).join('');
}

const leadModal=document.querySelector('#leadModal');
const leadForm=document.querySelector('#leadForm');
const leadProduct=document.querySelector('#leadProduct');
const leadName=document.querySelector('#leadName');
const leadEmail=document.querySelector('#leadEmail');
const leadWhatsapp=document.querySelector('#leadWhatsapp');
const leadEmailOptIn=document.querySelector('#leadEmailOptIn');
const leadWhatsappOptIn=document.querySelector('#leadWhatsappOptIn');
const leadWebsite=document.querySelector('#leadWebsite');
const leadError=document.querySelector('#leadError');
const leadContinue=document.querySelector('#leadContinue');
const shippingFields=document.querySelector('#shippingFields');
const shipPostalCode=document.querySelector('#shipPostalCode');
const shipState=document.querySelector('#shipState');
const shipStreet=document.querySelector('#shipStreet');
const shipNumber=document.querySelector('#shipNumber');
const shipComplement=document.querySelector('#shipComplement');
const shipNeighborhood=document.querySelector('#shipNeighborhood');
const shipCity=document.querySelector('#shipCity');
let pendingItemId=null;
let pendingRequiresShipping=false;

function phoneMask(value){
 const d=String(value||'').replace(/\D/g,'').slice(0,11);
 if(d.length<=2)return d;
 if(d.length<=6)return '('+d.slice(0,2)+') '+d.slice(2);
 if(d.length<=10)return '('+d.slice(0,2)+') '+d.slice(2,6)+'-'+d.slice(6);
 return '('+d.slice(0,2)+') '+d.slice(2,7)+'-'+d.slice(7);
}
leadWhatsapp?.addEventListener('input',()=>{leadWhatsapp.value=phoneMask(leadWhatsapp.value)});
shipPostalCode?.addEventListener('input',()=>{
 const d=shipPostalCode.value.replace(/\D/g,'').slice(0,8);
 shipPostalCode.value=d.length>5?d.slice(0,5)+'-'+d.slice(5):d;
});
shipState?.addEventListener('input',()=>{shipState.value=shipState.value.replace(/[^a-z]/gi,'').toUpperCase().slice(0,2)});

async function openLeadModal(itemId){
 const item=items.find(x=>x.id===itemId);
 if(!item)return;
 pendingItemId=itemId;
 pendingRequiresShipping=item.fulfillment_type==='physical';
 leadProduct.textContent=item.name+' · '+money(item.price_cents,item.currency)+(pendingRequiresShipping?(item.shipping_mode==='fixed'?' · Frete '+money(item.shipping_fixed_cents,item.currency):' · Frete grátis'):'');
 leadError.textContent='';
 if(shippingFields)shippingFields.hidden=!pendingRequiresShipping;
 const {data:{session}}=await sb.auth.getSession();
 if(session?.user?.email&&!leadEmail.value)leadEmail.value=session.user.email;
 leadModal.hidden=false;
 document.body.style.overflow='hidden';
 setTimeout(()=>leadName?.focus(),50);
}
function closeLeadModal(){
 if(buying)return;
 leadModal.hidden=true;
 document.body.style.overflow='';
 pendingItemId=null;
 pendingRequiresShipping=false;
 if(shippingFields)shippingFields.hidden=true;
}
leadModal?.querySelectorAll('[data-lead-close]').forEach(el=>el.addEventListener('click',closeLeadModal));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!leadModal.hidden)closeLeadModal()});

function currentUtm(){
 const p=new URLSearchParams(location.search),out={};
 ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(k=>{if(p.get(k))out[k]=p.get(k).slice(0,200)});
 return out;
}

async function startBuy(itemId){
 if(buying)return;
 const item=items.find(x=>x.id===itemId);
 if(!item){statusEl.textContent='Este produto não está disponível agora.';return}
 const academyCourse=academyCourseFromItem(item);
 if(academyCourse){
   enterAcademy(item);
   return
 }
 if(item.category==='OYAG Academy'){
   enterAcademy(item);
   return
 }
 if(item.destination_url){
   const {data:{session}}=await sb.auth.getSession();
   const target=item.destination_url;
   if(session){location.assign(target);return}
   const next=target.startsWith('./')?'/'+target.slice(2):target;
   location.assign('./login.html?mode=signup&next='+encodeURIComponent(next));
   return
 }
 await openLeadModal(itemId);
}

leadForm?.addEventListener('submit',async e=>{
 e.preventDefault();
 if(buying||!pendingItemId)return;
 const fullName=leadName.value.trim();
 const email=leadEmail.value.trim().toLowerCase();
 const whatsapp=leadWhatsapp.value.replace(/\D/g,'');
 if(fullName.length<2){leadError.textContent='Informe seu nome completo.';leadName.focus();return}
 if(!/^\S+@\S+\.\S+$/.test(email)){leadError.textContent='Informe um e-mail válido.';leadEmail.focus();return}
 if(whatsapp.length<10){leadError.textContent='Informe um WhatsApp válido com DDD.';leadWhatsapp.focus();return}

 let shippingAddress=null;
 if(pendingRequiresShipping){
  const postalCode=shipPostalCode.value.replace(/\D/g,'');
  const state=shipState.value.trim().toUpperCase();
  const street=shipStreet.value.trim();
  const number=shipNumber.value.trim();
  const complement=shipComplement.value.trim();
  const neighborhood=shipNeighborhood.value.trim();
  const city=shipCity.value.trim();

  if(postalCode.length!==8){leadError.textContent='Informe um CEP válido.';shipPostalCode.focus();return}
  if(street.length<2){leadError.textContent='Informe o endereço de entrega.';shipStreet.focus();return}
  if(!number){leadError.textContent='Informe o número do endereço.';shipNumber.focus();return}
  if(neighborhood.length<2){leadError.textContent='Informe o bairro.';shipNeighborhood.focus();return}
  if(city.length<2){leadError.textContent='Informe a cidade.';shipCity.focus();return}
  if(!/^[A-Z]{2}$/.test(state)){leadError.textContent='Informe a UF com 2 letras.';shipState.focus();return}

  shippingAddress={postal_code:postalCode,street,number,complement,neighborhood,city,state,country_code:'BR'};
 }

 buying=true;
 leadContinue.disabled=true;
 leadContinue.textContent='Preparando pagamento…';
 leadError.textContent='';
 statusEl.textContent='Salvando seus dados e preparando o checkout…';

 const idem=crypto.randomUUID();
 try{
  const {data:{session}}=await sb.auth.getSession();
  const headers={
   apikey:cfg.supabasePublishableKey,
   'content-type':'application/json',
   'x-idempotency-key':idem
  };
  if(session?.access_token)headers.authorization='Bearer '+session.access_token;

  const r=await fetch(cfg.supabaseUrl+'/functions/v1/oyag-start-public-purchase',{
   method:'POST',
   headers,
   body:JSON.stringify({
    full_name:fullName,
    email,
    whatsapp,
    catalog_item_id:pendingItemId,
    shipping_address:shippingAddress,
    email_marketing_opt_in:leadEmailOptIn.checked,
    whatsapp_marketing_opt_in:leadWhatsappOptIn.checked,
    idempotency_key:idem,
    utm:currentUtm(),
    page:'marketplace',
    referrer:document.referrer||'',
    website:leadWebsite.value||''
   })
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.ok)throw new Error(data?.detail||data?.error||'Não foi possível iniciar a compra.');

  const checkoutId=data.checkout?.checkout_id;
  if(!checkoutId)throw new Error('Checkout não retornado.');

  if(data.buyer_mode==='guest'&&data.guest_token){
   sessionStorage.setItem('oyag_guest_checkout_'+checkoutId,JSON.stringify({
    guest_token:data.guest_token,
    guest_session_id:data.guest_session_id,
    lead_id:data.lead_id,
    created_at:new Date().toISOString()
   }));
  }

  if(data.tracking_token){
   sessionStorage.setItem('oyag_tracking_'+checkoutId,data.tracking_token);
   localStorage.setItem('oyag_tracking_'+checkoutId,data.tracking_token);
  }

  sessionStorage.setItem('oyag_last_lead',JSON.stringify({
   lead_id:data.lead_id,
   email,
   whatsapp,
   full_name:fullName
  }));

  location.assign('./checkout.html?id='+encodeURIComponent(checkoutId));
 }catch(err){
  console.error('OYAG_LEAD_PURCHASE',err);
  leadError.textContent='Não foi possível continuar agora. Tente novamente.';
  statusEl.textContent='A compra não foi iniciada.';
  buying=false;
  leadContinue.disabled=false;
  leadContinue.textContent='Continuar para o pagamento';
 }
});

async function load(){
 statusEl.textContent='Carregando vitrine…';
 const r=await fetch(cfg.supabaseUrl+'/rest/v1/rpc/oyag_public_marketplace_list_v3',{
  method:'POST',
  headers:{apikey:cfg.supabasePublishableKey,'content-type':'application/json'},
  body:'{}'
 });
 const data=await r.json().catch(()=>null);
 if(!r.ok||!Array.isArray(data)){
  console.error('OYAG_MARKETPLACE',data);
  statusEl.textContent='Não foi possível carregar a vitrine agora. Tente novamente.';
  return;
 }
 items=data;
 catEl.innerHTML='<option value="">Todas as categorias</option>';
 [...new Set(items.map(x=>x.category).filter(Boolean))].sort().forEach(c=>catEl.insertAdjacentHTML('beforeend','<option>'+esc(c)+'</option>'));
 render();
 const params=new URLSearchParams(location.search),pending=params.get('buy');
 if(pending&&items.some(x=>x.id===pending)){
  params.delete('buy');
  history.replaceState({},'',location.pathname+(params.toString()?'?'+params.toString():'')+location.hash);
  await startBuy(pending);
 }
}
grid.addEventListener('click',e=>{const b=e.target.closest('[data-buy]');if(b)startBuy(b.dataset.buy)});
[searchEl,catEl,stateEl,cityEl,orderEl].filter(Boolean).forEach(x=>x.addEventListener('input',()=>{try{if(stateEl)localStorage.setItem('oyag-market-state',stateEl.value||'');if(cityEl)localStorage.setItem('oyag-market-city',cityEl.value.trim())}catch(_){}render()}));
load();