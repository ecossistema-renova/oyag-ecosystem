(() => {
  const SITE='https://cledemilsonoliveira.com/';
  const linksByContext={
    home:[
      ['Site oficial',SITE,'site','high'],
      ['OYAG Ecosystem','../desktop/','ecosystem','high'],
      ['Marketplace','../marketplace.html','marketplace','medium'],
      ['Parcerias','https://parcerias.cledemilsonoliveira.com/','parcerias','low'],
      ['Conteúdos',SITE+'conteudos/','conteudos','medium']
    ],
    course:[
      ['Site oficial',SITE,'site','high'],
      ['Academy','./','academy','high'],
      ['OYAG Ecosystem','../desktop/','ecosystem','medium'],
      ['Conteúdos',SITE+'conteudos/','conteudos','low'],
      ['Painel OYAG','../dashboard.html','painel','medium']
    ],
    lesson:[
      ['Site oficial',SITE,'site','high'],
      ['Academy','./','academy','high'],
      ['Minha trilha','./curso.html','trilha','medium'],
      ['OYAG Ecosystem','../desktop/','ecosystem','low']
    ],
    demo:[
      ['Site oficial',SITE,'site','high'],
      ['Academy','./','academy','high'],
      ['Curso principal',SITE+'curso-programacao/','curso','medium'],
      ['OYAG Ecosystem','../desktop/','ecosystem','low']
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