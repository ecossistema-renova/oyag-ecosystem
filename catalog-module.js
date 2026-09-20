(function(){
  const UFS=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  let ctx=null,items=[],orgs=[],modal=null,editing=null;

  const e=v=>ctx?.esc?ctx.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=(c,cur='BRL')=>ctx?.formatMoney?ctx.formatMoney(c,cur):new Intl.NumberFormat('pt-BR',{style:'currency',currency:cur}).format(Number(c||0)/100);
  const centsToInput=v=>v==null?'':(Number(v)/100).toFixed(2).replace('.',',');
  const inputToCents=v=>{
    const s=String(v??'').trim().replace(/\s/g,'').replace(/\./g,'').replace(',','.');
    if(!s)return null;
    const n=Number(s); return Number.isFinite(n)?Math.round(n*100):NaN;
  };
  const locationLabel=x=>{
    if(x.market_scope==='digital')return 'Online · todo o Brasil';
    if(x.market_scope==='national')return 'Atendimento nacional';
    if(x.market_scope==='state')return x.market_state?'Estado · '+x.market_state:'Atendimento estadual';
    if(x.market_scope==='local')return [x.market_city,x.market_state].filter(Boolean).join(' · ')||'Atendimento local';
    return 'Abrangência não informada';
  };
  function discount(x){
    const r=Number(x.price_cents),p=Number(x.promo_price_cents);
    return r>0&&p>=0&&p<r?Math.round((1-p/r)*100):0;
  }

  function render(){
    const root=ctx.root;
    root.innerHTML='<div class="catalog-toolbar"><div><p class="eyebrow">CATÁLOGO</p><h2>Produtos & Serviços</h2><p class="muted">Uma única base para gestão e Marketplace OYAG.</p></div><button class="catalog-primary" id="newCatalogItem">+ Novo produto ou serviço</button></div>'+
      (items.length?'<div class="catalog-grid">'+items.map(x=>{
        const d=discount(x),promo=x.promo_price_cents!=null&&(!x.promo_ends_at||new Date(x.promo_ends_at)>new Date());
        return '<article class="catalog-card">'+
          '<div class="catalog-media">'+(x.image_url?'<img src="'+e(x.image_url)+'" alt="'+e(x.name)+'" loading="lazy">':'<div class="catalog-image">OYAG</div>')+
          '<div class="catalog-badges">'+(x.is_featured?'<span class="catalog-badge featured">Destaque</span>':'')+(promo&&d?'<span class="catalog-badge promo">-'+d+'%</span>':'')+(x.promo_label?'<span class="catalog-badge free">'+e(x.promo_label)+'</span>':'')+'</div></div>'+
          '<div class="catalog-body"><div class="catalog-meta"><span>'+e(x.item_type==='service'?'Serviço':'Produto')+'</span><b class="status-'+e(x.status)+'">'+e(x.status)+'</b></div>'+
          '<h3>'+e(x.name)+'</h3><p>'+e(x.description||'Sem descrição')+'</p>'+
          '<div class="catalog-price">'+(promo?'<del>'+e(money(x.price_cents,x.currency))+'</del><strong>'+e(money(x.promo_price_cents,x.currency))+'</strong>':'<strong>'+e(money(x.price_cents,x.currency))+'</strong>')+'</div>'+
          (promo&&x.promo_ends_at?'<small class="catalog-limited">Oferta por tempo limitado · até '+e(new Date(x.promo_ends_at).toLocaleDateString('pt-BR'))+'</small>':'')+
          '<small class="catalog-location">⌖ '+e(locationLabel(x))+'</small><small>'+e(orgs.find(o=>o.id===x.organization_id)?.name||'Empresa')+'</small>'+
          '<div class="catalog-actions"><button data-edit-catalog="'+e(x.id)+'">Editar</button><button data-archive-catalog="'+e(x.id)+'">Arquivar</button></div></div></article>';
      }).join('')+'</div>':'<div class="panel"><h2>Seu catálogo está vazio</h2><p class="muted">Cadastre o primeiro produto ou serviço.</p></div>');
    root.querySelector('#newCatalogItem')?.addEventListener('click',()=>openModal(null));
    root.querySelectorAll('[data-edit-catalog]').forEach(b=>b.addEventListener('click',()=>openModal(items.find(x=>x.id===b.dataset.editCatalog))));
    root.querySelectorAll('[data-archive-catalog]').forEach(b=>b.addEventListener('click',()=>archiveItem(b.dataset.archiveCatalog)));
  }

  function ensureModal(){
    if(modal)return modal;
    const wrap=document.createElement('div');
    wrap.className='catalog-modal'; wrap.hidden=true;
    wrap.innerHTML='<div class="catalog-modal-backdrop" data-catalog-close></div><section class="catalog-modal-card" role="dialog" aria-modal="true" aria-labelledby="catalogModalTitle">'+
      '<header class="catalog-modal-head"><div><p class="eyebrow">CATÁLOGO OYAG</p><h2 id="catalogModalTitle">Novo produto ou serviço</h2><p>Preencha os dados que aparecerão no painel e na vitrine pública.</p></div><button type="button" class="catalog-modal-close" data-catalog-close aria-label="Fechar">×</button></header>'+
      '<form id="catalogForm" class="catalog-form"><div class="catalog-form-grid">'+
      '<label><span>Empresa</span><select name="organization_id" required></select></label>'+
      '<label><span>Tipo</span><select name="item_type"><option value="product">Produto</option><option value="service">Serviço</option></select></label>'+
      '<label class="span-2"><span>Nome *</span><input name="name" required maxlength="180" placeholder="Ex.: Cesta de frutas premium"></label>'+
      '<label class="span-2"><span>Descrição</span><textarea name="description" rows="4" maxlength="1200" placeholder="Explique o produto, benefício e o que o cliente recebe."></textarea></label>'+
      '<label class="span-2"><span>URL da imagem</span><input name="image_url" type="url" placeholder="https://..."><small>Use uma imagem clara e atrativa. A prévia aparece ao lado.</small></label>'+
      '<div class="catalog-image-preview span-2"><div><span>Prévia da imagem</span><strong>O produto precisa chamar atenção antes do texto.</strong></div><img id="catalogImagePreview" alt="Prévia do produto"></div>'+
      '<label><span>Categoria</span><input name="category" maxlength="100" placeholder="Ex.: Alimentos, Serviços, OYAG Academy"></label>'+
      '<label><span>Condição comercial</span><input name="commercial_condition" maxlength="160" placeholder="Ex.: Pagamento único"></label>'+
      '<label><span>Preço normal (R$) *</span><input name="price" inputmode="decimal" required placeholder="99,90"></label>'+
      '<label><span>Preço promocional (R$)</span><input name="promo_price" inputmode="decimal" placeholder="69,90"></label>'+
      '<label><span>Chamada da promoção</span><input name="promo_label" maxlength="80" placeholder="Ex.: 30% OFF"></label>'+
      '<label><span>Fim da promoção</span><input name="promo_ends_at" type="datetime-local"></label>'+
      '<label class="catalog-switch"><input name="is_featured" type="checkbox"><span><b>Produto em destaque</b><small>Recebe prioridade visual na vitrine.</small></span></label>'+
      '<label><span>Status</span><select name="status"><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="paused">Pausado</option></select></label>'+
      '<label><span>Abrangência</span><select name="market_scope"><option value="national">Todo o Brasil</option><option value="state">Estado</option><option value="local">Cidade / região local</option><option value="digital">Online / digital</option></select></label>'+
      '<label data-location-state><span>UF</span><select name="market_state"><option value="">Selecione</option>'+UFS.map(uf=>'<option value="'+uf+'">'+uf+'</option>').join('')+'</select></label>'+
      '<label data-location-city><span>Cidade</span><input name="market_city" maxlength="120" placeholder="Ex.: Sapucaia do Sul"></label>'+
      '<label><span>Entrega</span><select name="fulfillment_type"><option value="physical">Produto físico</option><option value="digital">Produto digital</option><option value="service">Serviço</option></select></label>'+
      '<label data-shipping-mode><span>Frete</span><select name="shipping_mode"><option value="free">Grátis</option><option value="fixed">Valor fixo</option></select></label>'+
      '<label data-shipping-fixed><span>Frete fixo (R$)</span><input name="shipping_fixed" inputmode="decimal" placeholder="12,90"></label>'+

      '</div><div class="catalog-promo-preview" id="catalogPromoPreview"><span>Promoção</span><strong>Nenhuma promoção configurada</strong><small>Ao informar preço promocional, o desconto será calculado automaticamente.</small></div>'+
      '<div class="catalog-form-error" id="catalogFormError" aria-live="polite"></div>'+
      '<footer class="catalog-modal-actions"><button type="button" class="ui-secondary" data-catalog-close>Cancelar</button><button type="submit" class="catalog-primary" id="catalogSave">Salvar produto</button></footer>'+
      '</form></section>';
    document.body.appendChild(wrap); modal=wrap;
    wrap.querySelectorAll('[data-catalog-close]').forEach(x=>x.addEventListener('click',closeModal));
    wrap.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeModal()});
    wrap.querySelector('#catalogForm').addEventListener('submit',saveItem);
    const form=wrap.querySelector('#catalogForm');
    form.image_url.addEventListener('input',updatePreview);
    form.price.addEventListener('input',updatePromo);
    form.promo_price.addEventListener('input',updatePromo);
    form.promo_ends_at.addEventListener('input',updatePromo);
    form.item_type.addEventListener('change',syncType);
    form.fulfillment_type.addEventListener('change',syncShipping);
    form.market_scope.addEventListener('change',syncLocation);
    return wrap;
  }

  function updatePreview(){
    const form=modal.querySelector('#catalogForm'),img=modal.querySelector('#catalogImagePreview'),url=form.image_url.value.trim();
    img.removeAttribute('src'); img.classList.toggle('has-image',Boolean(url));
    if(url){img.src=url;img.onerror=()=>{img.removeAttribute('src');img.classList.remove('has-image')}}
  }
  function updatePromo(){
    const f=modal.querySelector('#catalogForm'),box=modal.querySelector('#catalogPromoPreview');
    const r=inputToCents(f.price.value),p=inputToCents(f.promo_price.value);
    if(Number.isFinite(r)&&Number.isFinite(p)&&r>0&&p>=0&&p<r){
      const pct=Math.round((1-p/r)*100);
      box.innerHTML='<span>Prévia da promoção</span><strong>'+pct+'% de desconto · '+e(money(p))+'</strong><small>'+(f.promo_ends_at.value?'Oferta por tempo limitado.':'Promoção sem data final definida.')+'</small>';
    }else box.innerHTML='<span>Promoção</span><strong>Nenhuma promoção configurada</strong><small>Ao informar preço promocional, o desconto será calculado automaticamente.</small>';
  }
  function syncType(){
    const f=modal.querySelector('#catalogForm');
    if(f.item_type.value==='service')f.fulfillment_type.value='service';
    else if(f.fulfillment_type.value==='service')f.fulfillment_type.value='physical';
    syncShipping();
  }
  function syncShipping(){
    const f=modal.querySelector('#catalogForm'),physical=f.fulfillment_type.value==='physical';
    modal.querySelector('[data-shipping-mode]').hidden=!physical;
    modal.querySelector('[data-shipping-fixed]').hidden=!physical||f.shipping_mode.value!=='fixed';
    f.shipping_mode.onchange=syncShipping;
  }
  function syncLocation(){
    const f=modal.querySelector('#catalogForm'),scope=f.market_scope.value;
    modal.querySelector('[data-location-state]').hidden=!['state','local'].includes(scope);
    modal.querySelector('[data-location-city]').hidden=scope!=='local';
  }
  function fillForm(item){
    const f=modal.querySelector('#catalogForm');
    f.organization_id.innerHTML=orgs.map(o=>'<option value="'+e(o.id)+'">'+e(o.name)+'</option>').join('');
    f.organization_id.value=item?.organization_id||orgs[0]?.id||'';
    f.item_type.value=item?.item_type||'product';
    f.name.value=item?.name||''; f.description.value=item?.description||''; f.image_url.value=item?.image_url||'';
    f.category.value=item?.category||''; f.commercial_condition.value=item?.commercial_condition||'Pagamento único';
    f.price.value=centsToInput(item?.price_cents); f.promo_price.value=centsToInput(item?.promo_price_cents);
    f.promo_label.value=item?.promo_label||''; f.is_featured.checked=Boolean(item?.is_featured);
    f.status.value=item?.status||'draft'; f.market_scope.value=item?.market_scope||'national';
    f.market_state.value=item?.market_state||''; f.market_city.value=item?.market_city||'';
    f.fulfillment_type.value=item?.fulfillment_type||(f.item_type.value==='service'?'service':'physical');
    f.shipping_mode.value=item?.shipping_mode||'free'; f.shipping_fixed.value=centsToInput(item?.shipping_fixed_cents);
    f.promo_ends_at.value=item?.promo_ends_at?new Date(new Date(item.promo_ends_at).getTime()-new Date(item.promo_ends_at).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
    updatePreview();updatePromo();syncType();syncLocation();
  }
  function openModal(item){
    if(!orgs.length){alert('Cadastre uma empresa antes de criar produtos.');return}
    editing=item||null;ensureModal();fillForm(editing);
    modal.querySelector('#catalogModalTitle').textContent=editing?'Editar produto ou serviço':'Novo produto ou serviço';
    modal.querySelector('#catalogSave').textContent=editing?'Salvar alterações':'Cadastrar produto';
    modal.querySelector('#catalogFormError').textContent='';
    modal.hidden=false;document.body.classList.add('catalog-modal-open');
    setTimeout(()=>modal.querySelector('[name="name"]')?.focus(),40);
  }
  function closeModal(){
    if(!modal)return;modal.hidden=true;document.body.classList.remove('catalog-modal-open');editing=null;
  }
  async function saveItem(ev){
    ev.preventDefault();
    const f=ev.currentTarget,errorEl=modal.querySelector('#catalogFormError'),btn=modal.querySelector('#catalogSave');
    errorEl.textContent='';
    const price=inputToCents(f.price.value),promo=inputToCents(f.promo_price.value),shipping=inputToCents(f.shipping_fixed.value);
    if(!f.name.value.trim()){errorEl.textContent='Informe o nome do produto.';return}
    if(!Number.isFinite(price)||price<0){errorEl.textContent='Informe um preço válido.';return}
    if(f.promo_price.value.trim()&&(!Number.isFinite(promo)||promo<0||promo>=price)){errorEl.textContent='O preço promocional precisa ser menor que o preço normal.';return}
    if(['state','local'].includes(f.market_scope.value)&&!f.market_state.value){errorEl.textContent='Selecione a UF da oferta.';return}
    if(f.market_scope.value==='local'&&f.market_city.value.trim().length<2){errorEl.textContent='Informe a cidade da oferta local.';return}
    if(f.fulfillment_type.value==='physical'&&f.shipping_mode.value==='fixed'&&(!Number.isFinite(shipping)||shipping<=0)){errorEl.textContent='Informe o valor do frete fixo.';return}

    btn.disabled=true;btn.textContent='Salvando…';
    const args={
      p_action:editing?'update':'create',p_item_id:editing?.id||null,p_organization_id:f.organization_id.value,
      p_item_type:f.item_type.value,p_name:f.name.value.trim(),p_description:f.description.value.trim()||null,
      p_image_url:f.image_url.value.trim()||null,p_category:f.category.value.trim()||null,p_price_cents:price,
      p_promo_price_cents:f.promo_price.value.trim()?promo:null,p_promo_label:f.promo_label.value.trim()||null,
      p_promo_ends_at:f.promo_ends_at.value?new Date(f.promo_ends_at.value).toISOString():null,p_is_featured:f.is_featured.checked,
      p_commercial_condition:f.commercial_condition.value.trim()||null,p_status:f.status.value,
      p_fulfillment_type:f.fulfillment_type.value,p_shipping_mode:f.fulfillment_type.value==='physical'?f.shipping_mode.value:'free',
      p_shipping_fixed_cents:f.fulfillment_type.value==='physical'&&f.shipping_mode.value==='fixed'?shipping:0,
      p_market_scope:f.market_scope.value,p_market_state:f.market_state.value||null,p_market_city:f.market_city.value.trim()||null
    };
    const {error}=await ctx.sb.rpc('oyag_manage_catalog_item_v2',args);
    btn.disabled=false;btn.textContent=editing?'Salvar alterações':'Cadastrar produto';
    if(error){errorEl.textContent='Não foi possível salvar: '+error.message;return}
    closeModal();await mount(ctx);
  }
  async function archiveItem(id){
    if(!confirm('Arquivar este item? Ele deixará de aparecer no Marketplace.'))return;
    const {error}=await ctx.sb.rpc('oyag_manage_catalog_item_v2',{p_action:'archive',p_item_id:id});
    if(error)alert('Não foi possível arquivar: '+error.message);else await mount(ctx);
  }
  async function mount(nextCtx){
    ctx=nextCtx;ctx.root.innerHTML='<div class="loading">Carregando catálogo…</div>';
    const [o,i]=await Promise.all([
      ctx.sb.from('organizations').select('id,name,status').eq('status','active').order('name'),
      ctx.sb.from('oyag_catalog_items').select('id,organization_id,item_type,fulfillment_type,shipping_mode,shipping_fixed_cents,name,description,image_url,category,price_cents,currency,promo_price_cents,promo_label,promo_ends_at,is_featured,commercial_condition,status,market_scope,market_state,market_city,destination_url,updated_at').neq('status','archived').order('updated_at',{ascending:false})
    ]);
    if(o.error||i.error){ctx.root.innerHTML='<div class="panel"><h2>Não foi possível carregar o catálogo</h2><p class="muted">'+e(o.error?.message||i.error?.message||'Tente novamente.')+'</p></div>';return}
    orgs=o.data||[];items=i.data||[];render();
  }
  window.OYAG_CATALOG={mount};
})();