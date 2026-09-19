const cfg=window.OYAG_CONFIG;
const sb=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:localStorage}});
const feed=document.querySelector('#feed'),feedStatus=document.querySelector('#feedStatus'),composer=document.querySelector('#composer'),postForm=document.querySelector('#postForm'),postMessage=document.querySelector('#postMessage');
const topicLabels={geral:'Geral',vendas:'Vendas',lideranca:'Liderança',marketing:'Marketing',gestao:'Gestão',desenvolvimento_pessoal:'Desenvolvimento pessoal',programacao:'Programação'};
let session=null,currentTopic='';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const dt=v=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));
async function requireSession(){const {data}=await sb.auth.getSession();session=data.session;if(!session){location.replace('./login.html?next='+encodeURIComponent('/community-app.html'));return false}document.querySelector('#memberEmail').textContent=session.user.email||'';document.querySelector('#memberName').textContent=session.user.user_metadata?.full_name||String(session.user.email||'Membro OYAG').split('@')[0];return true}
async function loadFeed(){
 feedStatus.textContent='Carregando publicações…';
 let q=sb.from('oyag_community_posts').select('id,author_user_id,author_name_snapshot,topic,title,body,status,created_at').eq('status','published').order('created_at',{ascending:false}).limit(80);
 if(currentTopic)q=q.eq('topic',currentTopic);
 const {data,error}=await q;
 if(error){console.error(error);feedStatus.textContent='Não foi possível carregar a comunidade.';return}
 feedStatus.textContent=(data?.length||0)+' publicação(ões)';
 if(!data?.length){feed.innerHTML='<div class="empty">Ainda não há publicações neste tema. Comece uma conversa útil para a comunidade.</div>';return}
 feed.innerHTML=data.map(p=>'<article class="community-post" data-post="'+esc(p.id)+'"><div class="post-meta"><span><strong>'+esc(p.author_name_snapshot)+'</strong> · '+esc(dt(p.created_at))+'</span><span class="post-topic">'+esc(topicLabels[p.topic]||p.topic)+'</span></div><h3>'+esc(p.title)+'</h3><div class="post-body">'+esc(p.body)+'</div><div class="post-actions"><button type="button" data-comments="'+esc(p.id)+'">Ver comentários</button><button type="button" data-report-post="'+esc(p.id)+'">Reportar</button></div><div class="comments" data-comments-box="'+esc(p.id)+'" hidden></div></article>').join('');
}
async function loadComments(postId){
 const box=feed.querySelector('[data-comments-box="'+CSS.escape(postId)+'"]'); if(!box)return;
 box.hidden=false;box.innerHTML='<span>Carregando comentários…</span>';
 const {data,error}=await sb.from('oyag_community_comments').select('id,author_name_snapshot,body,created_at').eq('post_id',postId).eq('status','published').order('created_at',{ascending:true}).limit(100);
 if(error){box.textContent='Não foi possível carregar os comentários.';return}
 box.innerHTML=(data||[]).map(c=>'<div class="comment"><strong>'+esc(c.author_name_snapshot)+' · '+esc(dt(c.created_at))+'</strong><p>'+esc(c.body)+'</p></div>').join('')+'<form class="comment-form" data-comment-form="'+esc(postId)+'"><input maxlength="2000" required placeholder="Escreva um comentário construtivo"><button class="community-primary" type="submit">Comentar</button></form>';
}
postForm.onsubmit=async e=>{e.preventDefault();postMessage.textContent='Publicando…';const topic=document.querySelector('#postTopic').value,title=document.querySelector('#postTitle').value.trim(),body=document.querySelector('#postBody').value.trim();const {error}=await sb.rpc('oyag_community_create_post',{p_topic:topic,p_title:title,p_body:body});if(error){console.error(error);postMessage.textContent='Não foi possível publicar agora.';return}postForm.reset();composer.hidden=true;postMessage.textContent='';await loadFeed()};
feed.addEventListener('click',async e=>{const c=e.target.closest('[data-comments]');if(c){await loadComments(c.dataset.comments);return}const r=e.target.closest('[data-report-post]');if(r){const reason=prompt('Por que você está reportando esta publicação?','Conteúdo inadequado ou fora das regras');if(!reason)return;const {error}=await sb.rpc('oyag_community_report',{p_post_id:r.dataset.reportPost,p_comment_id:null,p_reason:reason});alert(error?'Não foi possível enviar o reporte.':'Reporte enviado para análise.')}});
feed.addEventListener('submit',async e=>{const f=e.target.closest('[data-comment-form]');if(!f)return;e.preventDefault();const input=f.querySelector('input'),body=input.value.trim();if(!body)return;const {error}=await sb.rpc('oyag_community_create_comment',{p_post_id:f.dataset.commentForm,p_body:body});if(error){alert('Não foi possível comentar agora.');return}input.value='';await loadComments(f.dataset.commentForm)});
document.querySelector('#newPostButton').onclick=()=>{composer.hidden=false;document.querySelector('#postTitle').focus()};
document.querySelector('#closeComposer').onclick=()=>composer.hidden=true;
document.querySelector('#refreshFeed').onclick=loadFeed;
document.querySelector('#topicFilters').onclick=e=>{const b=e.target.closest('[data-topic]');if(!b)return;document.querySelectorAll('#topicFilters button').forEach(x=>x.classList.toggle('active',x===b));currentTopic=b.dataset.topic||'';loadFeed()};
document.querySelector('#logout').onclick=async()=>{await sb.auth.signOut();location.replace('./login.html')};
(async()=>{if(await requireSession())loadFeed()})();