/* OYAG Academy public-entry resolver
   Cross-module links enter through academy.cledemilsonoliveira.com.
   Marketplace can persist the intended course before leaving the OYAG origin;
   after the public subdomain redirects back to /academy/, this resolver restores
   the exact internal destination without exposing internal routes as module URLs.
*/
(() => {
  const KEY='oyag-academy-public-entry';
  const MAX_AGE=2*60*1000;
  const validSlug=v=>/^[a-z0-9][a-z0-9-]{1,99}$/.test(String(v||''));

  const params=new URLSearchParams(location.search);
  let course=params.get('course')||'';
  let action=params.get('action')||'';

  try{
    const raw=localStorage.getItem(KEY);
    if(raw){
      localStorage.removeItem(KEY);
      const saved=JSON.parse(raw);
      if(saved && Date.now()-Number(saved.created_at||0)<=MAX_AGE){
        if(!course && validSlug(saved.course))course=saved.course;
        if(!action && ['signup','login'].includes(saved.action))action=saved.action;
      }
    }
  }catch(_){}

  if(!validSlug(course)){
    if(action==='signup'){
      location.replace('../login.html?mode=signup&next='+encodeURIComponent('/academy/'));
      return;
    }
    if(action==='login'){
      location.replace('../login.html?next='+encodeURIComponent('/academy/'));
    }
    return;
  }

  const next='/academy/curso.html?course='+encodeURIComponent(course);
  if(action==='signup'){
    location.replace('../login.html?mode=signup&next='+encodeURIComponent(next));
    return;
  }
  if(action==='login'){
    location.replace('../login.html?next='+encodeURIComponent(next));
    return;
  }
  location.replace('./curso.html?course='+encodeURIComponent(course));
})();