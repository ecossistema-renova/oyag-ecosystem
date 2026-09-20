const cfg=window.OYAG_CONFIG;
const sb=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:localStorage}});
const params=new URLSearchParams(location.search);
const slug=params.get('slug');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let lesson=null,moduleRow=null,theory={},starter='',quizPassed=new Set(),latestTestResults=[],session=null,currentProgress=null,isMastered=false;

const $=s=>document.querySelector(s);
const els={
 loading:$('#loadingState'),app:$('#lessonApp'),title:$('#lessonTitle'),summary:$('#lessonSummary'),eyebrow:$('#lessonEyebrow'),
 objective:$('#objectiveText'),concepts:$('#conceptsGrid'),steps:$('#theorySteps'),exampleBlock:$('#exampleBlock'),
 exampleTitle:$('#exampleTitle'),exampleCode:$('#exampleCode'),exampleExplanation:$('#exampleExplanation'),quiz:$('#quizContainer'),
 checkpointStatus:$('#checkpointStatus'),practice:$('#practiceText'),instructions:$('#instructionsText'),interactiveLab:$('#interactiveLab'),
 structuredPractice:$('#structuredPractice'),editor:$('#codeEditor'),run:$('#runButton'),reset:$('#resetButton'),hint:$('#hintButton'),
 feedback:$('#feedback'),requirements:$('#requirementsList'),checkpointText:$('#checkpointText'),next:$('#nextButton'),
 progressText:$('#progressText'),progressBar:$('#progressBar'),consolePanel:$('#consolePanel'),consoleOutput:$('#consoleOutput'),
 modeLabel:$('#modeLabel'),lessonStatus:$('#lessonStatus'),levelLabel:$('#levelLabel'),moduleLabel:$('#moduleLabel'),passingScore:$('#passingScore')
};

function setProgress(p){const n=Math.max(0,Math.min(100,Math.round(p)));els.progressText.textContent=n+'%';els.progressBar.style.width=n+'%'}
function renderTheory(){
 document.title=lesson.title+' | OYAG Academy';
 els.title.textContent=lesson.title;
 els.summary.textContent=theory.summary||theory.objective||'Aula prática da OYAG Academy.';
 els.eyebrow.textContent='Nível '+moduleRow.position+' · Aula '+lesson.position;
 els.objective.textContent=theory.objective||'Compreender e aplicar o conteúdo desta aula.';
 els.levelLabel.textContent=moduleRow.position+' — '+moduleRow.title;
 els.moduleLabel.textContent=moduleRow.description||'';
 els.passingScore.textContent=(lesson.passing_score||100)+'%';
 const concepts=Array.isArray(theory.concepts)?theory.concepts:[];
 els.concepts.innerHTML=concepts.length?concepts.map(c=>'<div><span>'+esc(c.term||'Conceito')+'</span><strong>'+esc(c.title||c.value||'')+'</strong><small>'+esc(c.explanation||'')+'</small></div>').join(''):'<div><span>Objetivo</span><strong>'+esc(theory.objective||'Compreender')+'</strong><small>Use a explicação e a atividade para consolidar esta etapa.</small></div>';
 const steps=Array.isArray(theory.steps)?theory.steps:[];
 els.steps.innerHTML=steps.length?steps.map((s,i)=>'<div><span>'+(i+1)+'</span><p><strong>'+esc(s.title||'Etapa')+'</strong> '+esc(s.text||'')+'</p></div>').join(''):'<div><span>1</span><p><strong>Entender.</strong> Leia o objetivo e relacione-o com a atividade proposta.</p></div><div><span>2</span><p><strong>Praticar.</strong> Execute a tarefa descrita com suas próprias decisões.</p></div><div><span>3</span><p><strong>Validar.</strong> Use o critério de domínio para revisar seu resultado.</p></div>';
 const ex=theory.example||{};
 if(ex.code){els.exampleTitle.textContent=ex.title||'Veja o conceito em ação';els.exampleCode.textContent=ex.code;els.exampleExplanation.textContent=ex.explanation||'Observe a relação entre a regra e o código.'}
 else els.exampleBlock.hidden=true;
 els.practice.textContent=theory.practice||lesson.instructions||'Resolva a atividade proposta.';
 els.instructions.textContent=lesson.instructions||theory.practice||'Aplique os conceitos desta aula.';
 els.checkpointText.textContent=theory.checkpoint||'Demonstrar compreensão e aplicar a atividade corretamente.';
 starter=lesson.starter_code||'';
 els.editor.value=starter;
}

async function recordProgress(score=0,theoryConfirmed=false){
 if(!lesson?.id||!session)return null;
 const {data,error}=await sb.rpc('academy_record_lesson_progress',{
   p_lesson_id:lesson.id,
   p_score:Math.max(0,Math.min(100,Math.round(Number(score)||0))),
   p_theory_confirmed:Boolean(theoryConfirmed)
 });
 if(error){console.error('ACADEMY_PROGRESS_SAVE',error);return null}
 currentProgress={
   ...(currentProgress||{}),
   status:data?.status||currentProgress?.status,
   best_score:Number(data?.best_score||currentProgress?.best_score||0),
   theory_confirmed_at:theoryConfirmed?(currentProgress?.theory_confirmed_at||new Date().toISOString()):currentProgress?.theory_confirmed_at,
   mastered_at:data?.status==='mastered'?(currentProgress?.mastered_at||new Date().toISOString()):currentProgress?.mastered_at
 };
 isMastered=data?.status==='mastered'||Number(data?.best_score||0)>=Number(lesson.passing_score||100);
 if(isMastered){
   setProgress(100);
   els.lessonStatus.textContent='Aula concluída';
   els.next.disabled=false;
   els.next.classList.add('unlocked');
   els.next.textContent=data?.module_completed?'Nível concluído ✓ Voltar à trilha':'Aula concluída ✓ Voltar à trilha';
   els.requirements.querySelectorAll('li').forEach(li=>li.classList.add('done'));
   if(data?.module_completed){
     els.feedback.className='feedback success';
     els.feedback.innerHTML='<strong>Nível concluído!</strong><span>Você dominou todas as aulas deste nível. O próximo nível já pode ser liberado na trilha.</span>';
   }
 }
 return data;
}

function renderQuiz(){
 const items=Array.isArray(theory.quiz)?theory.quiz:[];
 if(!items.length){
   els.quiz.innerHTML='<div class="checkpoint-status complete">Checkpoint orientado: revise o objetivo e o critério de domínio ✓</div>';
   els.checkpointStatus.hidden=true;quizPassed.add('auto');unlockLab();setProgress(isMastered?100:35);
   if(!currentProgress?.theory_confirmed_at&&!isMastered)recordProgress(0,true).catch(()=>{});
   return
 }
 els.quiz.innerHTML=items.map((item,i)=>'<fieldset class="question" data-q="'+i+'"><legend>'+(i+1)+'. '+esc(item.question)+'</legend><div class="answer-grid">'+(item.options||[]).map((o,j)=>'<button type="button" data-option="'+j+'">'+esc(o)+'</button>').join('')+'</div><p class="question-feedback" aria-live="polite"></p></fieldset>').join('');
 els.checkpointStatus.textContent='0 de '+items.length+' conceitos confirmados';
 els.quiz.querySelectorAll('.question').forEach(fs=>{
  fs.querySelectorAll('button').forEach(btn=>{
   btn.onclick=async()=>{
  const i=Number(fs.dataset.q),j=Number(btn.dataset.option),item=items[i],feedback=fs.querySelector('.question-feedback');
  fs.querySelectorAll('button').forEach(b=>b.classList.remove('correct','incorrect'));
  if(j===Number(item.correct)){btn.classList.add('correct');quizPassed.add(i);feedback.className='question-feedback ok';feedback.textContent=item.success||'Correto! Conceito confirmado.'}
  else{btn.classList.add('incorrect');feedback.className='question-feedback try';feedback.textContent=item.retry||'Ainda não. Revise a explicação e tente novamente.'}
  els.checkpointStatus.textContent=quizPassed.size+' de '+items.length+' conceitos confirmados';
  if(quizPassed.size===items.length){
    els.checkpointStatus.classList.add('complete');
    els.checkpointStatus.textContent='Teoria compreendida! Prática liberada ✓';
    unlockLab();
    await recordProgress(0,true);
  }
    updateProgress();
   };
  });
 });
}

function unlockLab(){
 const tests=theory.evaluator?.tests||[];
 if(tests.length&&starter){
   els.run.disabled=false;
   els.run.textContent='Executar e avaliar';
 }else{
   els.interactiveLab.hidden=true;
   els.structuredPractice.hidden=false;
   els.next.disabled=false;
   els.next.classList.add('unlocked');
   els.next.textContent=isMastered?'Aula concluída ✓ Voltar à trilha':'Marcar aula como concluída';
   if(!isMastered)setProgress(Math.max(65,Number(currentProgress?.best_score||0)));
 }
}

function renderRequirements(){
 const tests=theory.evaluator?.tests||[];
 if(!tests.length){
   els.requirements.innerHTML='<li class="done"><span></span>Objetivo da aula identificado</li><li class="done"><span></span>Atividade prática publicada</li><li class="'+(isMastered?'done':'')+'"><span></span>Conclusão registrada na trilha</li>';
   return
 }
 els.requirements.innerHTML=tests.map((t,i)=>'<li data-test-index="'+i+'"><span></span>'+esc(t.label||('Requisito '+(i+1)))+'</li>').join('');
}

function updateProgress(){
 if(isMastered){setProgress(100);return}
 const qItems=Array.isArray(theory.quiz)?theory.quiz.length:0;
 const quizPct=currentProgress?.theory_confirmed_at?35:(qItems?Math.min(35,(quizPassed.size/qItems)*35):35);
 const tests=theory.evaluator?.tests||[];
 const passed=latestTestResults.filter(Boolean).length;
 const currentScore=Math.max(Number(currentProgress?.best_score||0),tests.length?(passed/tests.length)*100:0);
 const testPct=tests.length?(currentScore/100)*65:30;
 setProgress(quizPct+testPct);
}

function applyExistingProgress(){
 if(!currentProgress)return;
 const items=Array.isArray(theory.quiz)?theory.quiz:[];
 if(currentProgress.theory_confirmed_at){
   items.forEach((_,i)=>quizPassed.add(i));
   if(items.length){
     els.checkpointStatus.classList.add('complete');
     els.checkpointStatus.textContent='Teoria já confirmada ✓';
   }
   unlockLab();
 }
 if(isMastered){
   setProgress(100);
   els.lessonStatus.textContent='Aula concluída';
   els.requirements.querySelectorAll('li').forEach(li=>li.classList.add('done'));
   els.next.disabled=false;
   els.next.classList.add('unlocked');
   els.next.textContent='Aula concluída ✓ Voltar à trilha';
   const tests=theory.evaluator?.tests||[];
   if(tests.length&&starter){els.run.disabled=false;els.run.textContent='Executar novamente'}
 }
 updateProgress();
}

const LAB_LIMITS=Object.freeze({
 sourceChars:12000,
 maxTests:24,
 expressionChars:600,
 maxLogs:30,
 logLineChars:600,
 timeoutMs:1500
});

function evaluateInWorker(source,tests){
 source=String(source||'');
 const safeTests=(Array.isArray(tests)?tests:[]).slice(0,LAB_LIMITS.maxTests).map(t=>({
   expression:String(t?.expression||'').slice(0,LAB_LIMITS.expressionChars)
 }));
 if(source.length>LAB_LIMITS.sourceChars){
   return Promise.resolve({
     ok:false,
     error:'O código ultrapassou o limite seguro de '+LAB_LIMITS.sourceChars+' caracteres.',
     results:safeTests.map(()=>false),
     logs:[]
   });
 }

 return new Promise(resolve=>{
   const channelName='oyag-lab-sandbox-v1';
   const requestToken=crypto.randomUUID();
   const iframe=document.createElement('iframe');
   iframe.setAttribute('sandbox','allow-scripts');
   iframe.setAttribute('aria-hidden','true');
   iframe.setAttribute('title','Ambiente isolado de execução do laboratório');
   iframe.referrerPolicy='no-referrer';
   iframe.tabIndex=-1;
   iframe.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;top:-10000px;border:0;opacity:0;pointer-events:none';

   const frameSource=`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'; img-src 'none'; media-src 'none'; font-src 'none'; style-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'"></head><body><script>
   (()=> {
     const CHANNEL='oyag-lab-sandbox-v1';
     let activeWorker=null;
     addEventListener('message',event=>{
       if(event.source!==parent)return;
       const msg=event.data;
       if(!msg||msg.channel!==CHANNEL||!msg.token||typeof msg.source!=='string'||!Array.isArray(msg.tests))return;
       if(activeWorker){try{activeWorker.terminate()}catch{} activeWorker=null}

       const workerCode=\`
       self.onmessage=function(event){
         const replyPort=event.ports&&event.ports[0];
         if(!replyPort)return;
         const payload=event.data||{};
         const source=String(payload.source||'');
         const tests=Array.isArray(payload.tests)?payload.tests:[];
         const maxLogs=Math.max(1,Math.min(50,Number(payload.maxLogs)||30));
         const maxLine=Math.max(80,Math.min(1000,Number(payload.maxLine)||600));
         const logs=[];
         const safeValue=value=>{
           try{
             if(typeof value==='string')return value.slice(0,maxLine);
             const serialized=JSON.stringify(value);
             return String(serialized===undefined?value:serialized).slice(0,maxLine);
           }catch{return String(value).slice(0,maxLine)}
         };
         const write=(...args)=>{
           if(logs.length>=maxLogs)return;
           logs.push(args.map(safeValue).join(' ').slice(0,maxLine));
         };
         const safeConsole=Object.freeze({log:write,info:write,warn:write,error:write});
         try{
           const runner=new Function(
             'console','tests','fetch','XMLHttpRequest','WebSocket','EventSource','Worker','SharedWorker','BroadcastChannel','importScripts','caches','indexedDB','localStorage','sessionStorage',
             '"use strict";\\n'+source+';\\nreturn tests.map(function(t){try{return !!eval(String(t.expression||"false"))}catch(_){return false}});'
           );
           const results=runner(
             safeConsole,tests,
             undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined
           );
           replyPort.postMessage({ok:true,results:Array.isArray(results)?results.map(Boolean):tests.map(()=>false),logs});
         }catch(err){
           replyPort.postMessage({ok:false,error:String(err&&err.message||err).slice(0,300),results:tests.map(()=>false),logs});
         }
       };
       \`;

       const blob=new Blob([workerCode],{type:'text/javascript'});
       const workerUrl=URL.createObjectURL(blob);
       const worker=new Worker(workerUrl);
       activeWorker=worker;
       const resultChannel=new MessageChannel();
       let finished=false;
       const finish=payload=>{
         if(finished)return;
         finished=true;
         clearTimeout(timer);
         try{worker.terminate()}catch{}
         URL.revokeObjectURL(workerUrl);
         activeWorker=null;
         parent.postMessage({channel:CHANNEL,token:msg.token,payload},'*');
       };
       resultChannel.port1.onmessage=e=>finish(e.data);
       const timer=setTimeout(()=>finish({
         ok:false,
         error:'Tempo limite excedido.',
         results:msg.tests.map(()=>false),
         logs:[]
       }),Math.max(500,Math.min(2200,Number(msg.timeoutMs)||1500)));
       worker.postMessage({
         source:msg.source,
         tests:msg.tests,
         maxLogs:msg.maxLogs,
         maxLine:msg.maxLine
       },[resultChannel.port2]);
     });
   })();
   <\/script></body></html>`;

   let settled=false;
   const cleanup=()=>{
     window.removeEventListener('message',onMessage);
     clearTimeout(parentTimer);
     iframe.remove();
   };
   const finish=result=>{
     if(settled)return;
     settled=true;
     cleanup();
     resolve(result);
   };
   const onMessage=event=>{
     if(event.source!==iframe.contentWindow)return;
     const msg=event.data;
     if(!msg||msg.channel!==channelName||msg.token!==requestToken)return;
     finish(msg.payload||{ok:false,error:'Resposta inválida do ambiente isolado.',results:safeTests.map(()=>false),logs:[]});
   };
   window.addEventListener('message',onMessage);
   const parentTimer=setTimeout(()=>finish({
     ok:false,
     error:'O ambiente isolado não respondeu a tempo.',
     results:safeTests.map(()=>false),
     logs:[]
   }),LAB_LIMITS.timeoutMs+900);

   iframe.addEventListener('load',()=>{
     try{
       iframe.contentWindow.postMessage({
         channel:channelName,
         token:requestToken,
         source,
         tests:safeTests,
         maxLogs:LAB_LIMITS.maxLogs,
         maxLine:LAB_LIMITS.logLineChars,
         timeoutMs:LAB_LIMITS.timeoutMs
       },'*');
     }catch{
       finish({ok:false,error:'Falha ao iniciar o ambiente isolado.',results:safeTests.map(()=>false),logs:[]});
     }
   },{once:true});
   iframe.srcdoc=frameSource;
   document.body.appendChild(iframe);
 });
}

async function runLab(){
 const tests=theory.evaluator?.tests||[];
 els.run.disabled=true;els.run.textContent='Avaliando…';
 const result=await evaluateInWorker(els.editor.value,tests);
 latestTestResults=result.results||tests.map(()=>false);
 latestTestResults.forEach((ok,i)=>{const li=els.requirements.querySelector('[data-test-index="'+i+'"]');if(li)li.classList.toggle('done',!!ok)});
 els.consolePanel.hidden=!(result.logs&&result.logs.length);els.consoleOutput.textContent=(result.logs||[]).join('\n');
 const passed=latestTestResults.filter(Boolean).length,ok=tests.length>0&&passed===tests.length;
 const score=tests.length?Math.round((passed/tests.length)*100):0;
 els.feedback.className='feedback '+(ok?'success':'error');
 els.feedback.innerHTML=ok?'<strong>Domínio comprovado!</strong><span>Seu código passou por todos os requisitos desta aula.</span>':'<strong>'+passed+' de '+tests.length+' requisitos atendidos.</strong><span>Revise o código e tente novamente.</span>';
 const saved=await recordProgress(score,true);
 if(ok&&saved){
   els.next.disabled=false;
   els.next.classList.add('unlocked');
   els.next.textContent=saved.module_completed?'Nível concluído ✓ Voltar à trilha':'Aula concluída ✓ Voltar à trilha';
   els.lessonStatus.textContent='Aula concluída';
 }
 updateProgress();els.run.disabled=false;els.run.textContent=isMastered?'Executar novamente':'Executar e avaliar';
}

async function init(){
 if(!slug){els.loading.textContent='Aula não informada.';return}
 const auth=await sb.auth.getSession();
 session=auth?.data?.session||null;
 if(!session){location.replace('../login.html?next='+encodeURIComponent('/academy/lesson.html?slug='+slug));return}
 const {data:roleRow}=await sb.from('platform_roles').select('role').eq('user_id',session.user.id).maybeSingle();
 const isOwner=roleRow?.role==='owner'||roleRow?.role==='platform_admin';
 els.modeLabel.textContent=isOwner?'Modo proprietário':'Aluno';
 const {data,error}=await sb.rpc('academy_get_lesson',{p_slug:slug});
 if(error||!data){
   els.loading.innerHTML='<strong>Aula indisponível.</strong><p>Este nível ainda não está liberado para sua conta.</p><a class="primary" href="./curso.html">Voltar à trilha</a>';
   return;
 }
 lesson=data;moduleRow=data.module||{};theory=data.theory||{};
 const {data:progressRow}=await sb.from('academy_lesson_progress')
   .select('status,best_score,theory_confirmed_at,mastered_at,last_activity_at')
   .eq('user_id',session.user.id).eq('lesson_id',lesson.id).maybeSingle();
 currentProgress=progressRow||null;
 isMastered=currentProgress?.status==='mastered'||Number(currentProgress?.best_score||0)>=Number(lesson.passing_score||100);
 els.lessonStatus.textContent=isMastered?'Aula concluída':isOwner?'Prévia completa':'Em estudo';
 renderTheory();renderQuiz();renderRequirements();applyExistingProgress();
 els.loading.hidden=true;els.app.hidden=false;
 document.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>document.querySelector('#'+b.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'}));
 els.run.onclick=runLab;
 els.reset.onclick=()=>{els.editor.value=starter;els.feedback.className='feedback neutral';els.feedback.innerHTML='<strong>Código restaurado.</strong><span>Você pode tentar novamente.</span>';els.consolePanel.hidden=true};
 els.hint.onclick=()=>{els.feedback.className='feedback neutral';els.feedback.innerHTML='<strong>Dica do Mentor OYAG</strong><span>'+esc(theory.hint||'Volte ao objetivo, divida o problema em partes menores e valide uma parte de cada vez.')+'</span>'};
 els.next.onclick=async()=>{
   if(isMastered){location.href='./curso.html';return}
   const tests=theory.evaluator?.tests||[];
   if(tests.length)return;
   els.next.disabled=true;els.next.textContent='Salvando progresso…';
   const saved=await recordProgress(100,true);
   if(saved){location.href='./curso.html';return}
   els.next.disabled=false;els.next.textContent='Marcar aula como concluída';
   els.feedback.className='feedback error';
   els.feedback.innerHTML='<strong>Não foi possível salvar agora.</strong><span>Tente novamente antes de sair da aula.</span>';
 };
}
init();
