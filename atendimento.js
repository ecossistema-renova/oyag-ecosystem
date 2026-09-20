const cfg=window.OYAG_CONFIG;
const form=document.querySelector('#purchaseSupportForm');
const statusEl=document.querySelector('#status');
const send=document.querySelector('#send');
const typeEl=document.querySelector('#requestType');
const orderRef=document.querySelector('#orderRef');
const nameEl=document.querySelector('#name');
const emailEl=document.querySelector('#email');
const whatsappEl=document.querySelector('#whatsapp');
const messageEl=document.querySelector('#message');
const companyEl=document.querySelector('#company');

const labels={
 duvida_compra:'Dúvida sobre compra',
 pagamento:'Pagamento',
 cancelamento:'Cancelamento',
 reembolso:'Reembolso / arrependimento',
 acesso_academy:'Acesso à OYAG Academy'
};

form.addEventListener('submit',async e=>{
 e.preventDefault();
 statusEl.className='msg';
 statusEl.textContent='';
 const type=typeEl.value;
 const name=nameEl.value.trim();
 const email=emailEl.value.trim().toLowerCase();
 const message=messageEl.value.trim();
 if(!labels[type]){statusEl.className='msg error';statusEl.textContent='Selecione o tipo de solicitação.';return}
 if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||message.length<10){
   statusEl.className='msg error';statusEl.textContent='Revise nome, e-mail e descrição da solicitação.';return
 }
 send.disabled=true;send.textContent='Registrando…';
 const ref=orderRef.value.trim();
 const finalMessage=(ref?'Pedido/checkout informado: '+ref+'\n\n':'')+message;
 try{
   const r=await fetch(cfg.supabaseUrl+'/functions/v1/oyag-public-contact',{
     method:'POST',
     cache:'no-store',
     headers:{'content-type':'application/json'},
     body:JSON.stringify({
       channel:'financeiro',
       name,
       email,
       whatsapp:whatsappEl.value.trim(),
       subject:'Atendimento de compra · '+labels[type],
       message:finalMessage,
       source_url:location.href,
       company:companyEl.value||''
     })
   });
   const data=await r.json().catch(()=>({}));
   if(!r.ok||!data?.ok)throw new Error(data?.error||'Falha ao registrar');
   statusEl.className='msg ok';
   statusEl.textContent='Solicitação registrada. Protocolo: '+(data.id||'OYAG')+'.';
   form.reset();
 }catch(err){
   console.error('OYAG_PURCHASE_SUPPORT',err);
   statusEl.className='msg error';
   statusEl.textContent='Não foi possível registrar agora. Tente novamente ou envie um e-mail para suporte@cledemilsonoliveira.com.';
 }finally{
   send.disabled=false;send.textContent='Registrar solicitação';
 }
});