(() => {
  const M=window.OYAG_MODULES||{};
  const url=(key,fallback)=>M[key]?.publicUrl||fallback;
  const SITE=url('site','https://cledemilsonoliveira.com/');
  const ACADEMY=url('academy','https://academy.cledemilsonoliveira.com/');
  const APP=url('app','https://app.cledemilsonoliveira.com/');
  const MARKET=url('marketplace','https://marketplace.cledemilsonoliveira.com/');
  const PARCERIAS=url('parcerias','https://parcerias.cledemilsonoliveira.com/');
  const CONTEUDOS=url('conteudos','https://conteudos.cledemilsonoliveira.com/');

  const linksByContext={
    home:[
      ['Site oficial',SITE,'site','high'],
      ['OYAG Ecosystem',APP,'ecosystem','high'],
      ['Marketplace',MARKET,'marketplace','medium'],
      ['Parcerias',PARCERIAS,'parcerias','low'],
      ['Conteúdos',CONTEUDOS,'conteudos','medium']
    ],
    course:[
      ['Site oficial',SITE,'site','high'],
      ['Academy',ACADEMY,'academy','high'],
      ['OYAG Ecosystem',APP,'ecosystem','medium'],
      ['Conteúdos',CONTEUDOS,'conteudos','low'],
      ['Painel OYAG','../dashboard.html','painel','medium']
    ],
    lesson:[
      ['Site oficial',SITE,'site','high'],
      ['Academy',ACADEMY,'academy','high'],
      ['Minha trilha','./curso.html','trilha','medium'],
      ['OYAG Ecosystem',APP,'ecosystem','low']
    ],
    demo:[
      ['Site oficial',SITE,'site','high'],
      ['Academy',ACADEMY,'academy','high'],
      ['Curso principal',SITE+'curso-programacao/','curso','medium'],
      ['OYAG Ecosystem',APP,'ecosystem','low']
    ]
  };
  document.querySelectorAll('[data-academy-nav]').forEach(nav=>{
    const context=nav.getAttribute('data-academy-nav')||'home';
    const links=linksByContext[context]||linksByContext.home;
    nav.classList.add('academy-global-nav');
    nav.innerHTML='';
    for(const [label,href,key,priority] of links){
      const a=document.createElement('a');
      a.href=href;
      a.textContent=label;
      a.dataset.priority=priority;
      if(key==='site') a.dataset.siteLink='true';
      if((context==='home'&&key==='site')||(context!=='home'&&key==='academy')) a.dataset.primary='true';
      nav.appendChild(a);
    }
  });
})();