const host=document.querySelector('#mfPlans');
const cards=[
  {
    eyebrow:'CONTA OYAG',
    name:'Comece gratuitamente',
    copy:'Use o OYAG Finance com a mesma conta do ecossistema para organizar sua rotina financeira.',
    price:'Grátis',
    features:['Dashboard financeiro','Receitas e despesas','Contas e saldos','Cartões','Orçamentos','Metas'],
    primary:true,
    href:'./finance/'
  },
  {
    eyebrow:'ECOSSISTEMA',
    name:'Plano Essencial OYAG',
    copy:'Para quem também quer publicar produtos e serviços no Marketplace OYAG, conforme as regras vigentes do plano.',
    price:'R$ 49,90',
    suffix:'/ mês',
    features:['Recursos financeiros da conta','Publicação no Marketplace','Integração com módulos OYAG'],
    primary:false,
    href:'./dashboard.html'
  }
];
host.innerHTML=cards.map(p=>'<article class="plan-card '+(p.primary?'highlight':'')+'">'+
  (p.primary?'<span class="plan-badge">COMECE AQUI</span>':'')+
  '<span class="sales-eyebrow">'+p.eyebrow+'</span><h3>'+p.name+'</h3>'+
  '<p class="plan-copy">'+p.copy+'</p><div class="plan-price"><strong>'+p.price+'</strong><span>'+(p.suffix||'')+'</span></div>'+
  '<div class="plan-features">'+p.features.map(x=>'<span>'+x+'</span>').join('')+'</div>'+
  '<a class="sales-btn '+(p.primary?'primary':'')+'" href="'+p.href+'">'+(p.primary?'Abrir OYAG Finance':'Abrir minha conta OYAG')+'</a></article>'
).join('');