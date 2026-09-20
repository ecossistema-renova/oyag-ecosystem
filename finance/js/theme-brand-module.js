import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const THEME_KEY='oyag_finance_theme';
const LEGACY_THEME_KEY='renova_theme_v2';
const root=document.documentElement;
const BRAND_LOGO='../assets/oyag-approved-mark.png';
const DEVELOPER_IMAGE='https://epbhiygonpkzlmbbsyqv.supabase.co/storage/v1/object/public/Imagens%20para%20site/Minha%20foto%20oficial.png';
const DEVELOPER_PAGE_URL='https://cledemilsonoliveira.com/#sobre';
const FALLBACK_LOGO='../assets/oyag-approved-mark.png';

function ensureBrandAssetStyles(){
  if(!document.querySelector('link[data-renova-brand-assets]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./css/theme-brand-supabase.css?v=20260913-0170';
    link.dataset.renovaBrandAssets='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-renova-nextgo-menu]')){
    const menuLink=document.createElement('link');
    menuLink.rel='stylesheet';
    menuLink.href='./css/mobile-menu-nextgo.css?v=20260913-0170';
    menuLink.dataset.renovaNextgoMenu='1';
    document.head.appendChild(menuLink);
  }
}

function preferredTheme(){
  const saved=localStorage.getItem(THEME_KEY)||localStorage.getItem(LEGACY_THEME_KEY);
  return saved==='light'?'light':'dark';
}

function applyTheme(theme){
  root.dataset.theme=theme;
  root.dataset.userTheme='1';
  localStorage.setItem(THEME_KEY,theme);
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',theme==='light'?'#eef4f9':'#050912');
  const btn=document.querySelector('#renovaThemeToggle');
  if(btn){
    const icon=btn.querySelector('.renova-theme-icon');
    const text=btn.querySelector('.renova-theme-text');
    const next=theme==='dark'?'light':'dark';
    if(icon)icon.textContent=theme==='dark'?'☀':'☾';
    if(text)text.textContent=theme==='dark'?'Modo claro':'Modo escuro';
    btn.setAttribute('aria-label',`Ativar modo ${next==='light'?'claro':'escuro'}`);
    btn.title=`Ativar modo ${next==='light'?'claro':'escuro'}`;
  }
  window.dispatchEvent(new CustomEvent('oyag:themechange',{detail:{theme}}));
}

function applyImageFallbacks(card){
  const logo=card.querySelector('.renova-company-logo');
  const developer=card.querySelector('.renova-developer-image');
  logo?.addEventListener('error',()=>{
    if(logo.src!==new URL(FALLBACK_LOGO,location.href).href)logo.src=FALLBACK_LOGO;
  },{once:true});
  developer?.addEventListener('error',()=>{
    developer.style.display='none';
    card.classList.add('renova-developer-no-image');
  },{once:true});
}

function normalizeConnectionLabel(){
  const badge=document.querySelector('#connectionBadge');
  if(!badge)return;
  const sync=()=>{
    if((badge.textContent||'').trim().toLowerCase()==='supabase conectado'){
      badge.innerHTML='<i></i> Conectado';
    }
  };
  sync();
  new MutationObserver(sync).observe(badge,{childList:true,subtree:true,characterData:true});
}

function closeMobileMenu(){
  document.body.classList.remove('menu-open');
  syncMobileMenuButton();
}

function syncMobileMenuButton(){
  const openBtn=document.querySelector('#mobileMenuBtn');
  if(!openBtn)return;
  const opened=document.body.classList.contains('menu-open');
  openBtn.setAttribute('aria-expanded',opened?'true':'false');
  openBtn.setAttribute('aria-label',opened?'Fechar menu':'Abrir menu');
  openBtn.innerHTML=opened?'<span aria-hidden="true">×</span><b>Fechar</b>':'<span aria-hidden="true">☰</span><b>Menu</b>';
}

function ensureMobileMenuUx(){
  const sidebar=document.querySelector('#sidebar');
  const sidebarHead=sidebar?.querySelector('.sidebar-head');
  const nav=document.querySelector('#mainNav');
  const openBtn=document.querySelector('#mobileMenuBtn');
  const backdrop=document.querySelector('#mobileBackdrop');
  if(!sidebar||!sidebarHead||!nav)return;

  sidebar.classList.add('renova-mobile-dropdown');

  const subscription=nav.querySelector('[data-page="subscription"]');
  const separator=nav.querySelector('.nav-separator');
  if(subscription&&separator&&subscription.previousElementSibling!==separator){
    nav.insertBefore(subscription,separator);
  }

  document.querySelector('#renovaMobileMenuClose')?.remove();

  if(openBtn&&!openBtn.dataset.renovaDropdownBound){
    openBtn.dataset.renovaDropdownBound='1';
    openBtn.setAttribute('aria-controls','sidebar');
    openBtn.setAttribute('aria-haspopup','menu');
    openBtn.addEventListener('click',()=>requestAnimationFrame(syncMobileMenuButton));
  }

  if(!nav.dataset.renovaDropdownBound){
    nav.dataset.renovaDropdownBound='1';
    nav.addEventListener('click',event=>{
      if(event.target.closest('[data-page]'))requestAnimationFrame(closeMobileMenu);
    });
  }

  if(backdrop&&!backdrop.dataset.renovaDropdownBound){
    backdrop.dataset.renovaDropdownBound='1';
    backdrop.addEventListener('click',closeMobileMenu);
  }

  if(!document.body.dataset.renovaDropdownKeys){
    document.body.dataset.renovaDropdownKeys='1';
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&document.body.classList.contains('menu-open'))closeMobileMenu();
    });
    window.addEventListener('resize',()=>{
      if(window.innerWidth>760)closeMobileMenu();
    });
  }

  syncMobileMenuButton();
}

function ensureCard(){
  const sidebar=document.querySelector('#sidebar');
  const nav=document.querySelector('#mainNav');
  if(!sidebar||!nav)return;

  let card=document.querySelector('#renovaCompanyCard');
  if(!card){
    card=document.createElement('section');
    card.id='renovaCompanyCard';
    card.className='renova-company-card renova-company-card-vertical';
    card.setAttribute('aria-label','Informações do OYAG Ecosystem');
    card.innerHTML=`
      <div class="renova-company-brand renova-company-brand-vertical">
        <img class="renova-company-logo" src="${BRAND_LOGO}" alt="Logo OYAG Ecosystem">
        <div class="renova-company-copy">
          <strong>OYAG ECOSYSTEM</strong>
          <span>Gestão • Controle • Resultados</span>
        </div>
      </div>

      <div class="renova-company-creator renova-company-creator-vertical">
        <img class="renova-developer-image" src="${DEVELOPER_IMAGE}" alt="Cledemilson Oliveira de Assis, desenvolvedor do OYAG Ecosystem">
        <div>
          <span>Desenvolvedor do OYAG Ecosystem</span>
          <b>Cledemilson Oliveira de Assis</b>
        </div>
      </div>

      <a class="renova-ecosystem-link" href="${DEVELOPER_PAGE_URL}" target="_blank" rel="noopener noreferrer" aria-label="Conhecer o desenvolvedor do OYAG Ecosystem">
        <span>↗</span><b>Conhecer o desenvolvedor</b>
      </a>

      <button id="renovaThemeToggle" class="renova-theme-toggle" type="button">
        <span class="renova-theme-icon">☾</span>
        <span class="renova-theme-text">Modo escuro</span>
      </button>`;

    nav.insertAdjacentElement('afterend',card);
    applyImageFallbacks(card);
    document.querySelector('#renovaThemeToggle')?.addEventListener('click',()=>applyTheme(root.dataset.theme==='light'?'dark':'light'));
  }

  normalizeConnectionLabel();
  ensureMobileMenuUx();
  applyTheme(preferredTheme());
}

ensureBrandAssetStyles();
applyTheme(preferredTheme());
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>{ensureCard();},{once:true});
}else{
  ensureCard();
  ensureCard();
}
