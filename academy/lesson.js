const cfg=window.OYAG_CONFIG;
const sb=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:localStorage}});
const params=new URLSearchParams(location.search);
const slug=params.get('slug');
const requestedCourse=params.get('course')||'';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let lesson=null,moduleRow=null,courseRow=null,theory={},starter='',quizPassed=new Set(),latestTestResults=[],session=null,currentProgress=null,isMastered=false,practicePassed=false,practiceStartedAt=0;

const $=s=>document.querySelector(s);
const els={
 loading:$('#loadingState'),app:$('#lessonApp'),title:$('#lessonTitle'),summary:$('#lessonSummary'),eyebrow:$('#lessonEyebrow'),
 objective:$('#objectiveText'),concepts:$('#conceptsGrid'),steps:$('#theorySteps'),exampleBlock:$('#exampleBlock'),
 exampleTitle:$('#exampleTitle'),exampleCode:$('#exampleCode'),exampleExplanation:$('#exampleExplanation'),quiz:$('#quizContainer'),
 checkpointStatus:$('#checkpointStatus'),practice:$('#practiceText'),instructions:$('#instructionsText'),interactiveLab:$('#interactiveLab'),
 structuredPractice:$('#structuredPractice'),editor:$('#codeEditor'),run:$('#runButton'),reset:$('#resetButton'),hint:$('#hintButton'),
 feedback:$('#feedback'),requirements:$('#requirementsList'),checkpointText:$('#checkpointText'),next:$('#nextButton'),
 progressText:$('#progressText'),progressBar:$('#progressBar'),consolePanel:$('#consolePanel'),consoleOutput:$('#consoleOutput'),
 modeLabel:$('#modeLabel'),lessonStatus:$('#lessonStatus'),levelLabel:$('#levelLabel'),moduleLabel:$('#moduleLabel'),passingScore:$('#passingScore'),
 courseTitle:$('#courseTitleLabel'),backToCourse:$('#backToCourse'),structuredPracticeTitle:$('#structuredPracticeTitle'),structuredPracticeIntro:$('#structuredPracticeIntro'),practiceRunner:$('#practiceRunner')
};

function setProgress(p){const n=Math.max(0,Math.min(100,Math.round(p)));els.progressText.textContent=n+'%';els.progressBar.style.width=n+'%'}
function renderTheory(){
 document.title=lesson.title+' | OYAG Academy';
 if(els.courseTitle)els.courseTitle.textContent=courseRow?.title||'OYAG Academy';
 if(els.backToCourse)els.backToCourse.href='./curso.html?course='+encodeURIComponent(courseRow?.slug||requestedCourse||'programacao-basico-ao-hard');
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
   practicePassed=true;
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
   renderPracticeRunner();
 }
}


function editDistance(a,b){
 a=String(a||'');b=String(b||'');
 const prev=Array.from({length:b.length+1},(_,i)=>i),cur=new Array(b.length+1);
 for(let i=1;i<=a.length;i++){cur[0]=i;for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=b.length;j++)prev[j]=cur[j]}
 return prev[b.length];
}
function setPracticePassed(message){
 practicePassed=true;
 const req=els.requirements?.querySelector('[data-practice-req]');if(req)req.classList.add('done');
 if(!isMastered){
   els.next.disabled=false;els.next.classList.add('unlocked');els.next.textContent='Concluir aula e registrar domínio';
   setProgress(Math.max(90,Number(currentProgress?.best_score||0)));
 }
 const status=els.practiceRunner?.querySelector('[data-practice-status]');
 if(status){status.className='practice-status success';status.textContent=message||'Prática validada ✓'}
 updateProgress();
}
function renderPracticeRunner(){
 els.interactiveLab.hidden=true;
 els.structuredPractice.hidden=false;
 const mode=theory.practice_mode||'structured',cfg=theory.practice_config||{};
 if(els.structuredPracticeTitle)els.structuredPracticeTitle.textContent=mode==='typing'?'Desafio de digitação':mode==='shortcut'?'Desafio de atalho':'Prática na ferramenta';
 if(els.structuredPracticeIntro)els.structuredPracticeIntro.textContent=mode==='typing'?'Digite o texto sem colar e alcance os critérios mínimos.':mode==='shortcut'?'Ative a captura e execute a combinação solicitada.':'Execute a tarefa na ferramenta indicada e valide seu próprio resultado com o checklist.';
 if(isMastered){practicePassed=true}
 if(mode==='typing'){
   const target=String(cfg.target_text||theory.practice||'Pratique com atenção e precisão.');
   const minAccuracy=Number(cfg.min_accuracy||90),targetWpm=Number(cfg.target_wpm||15);
   els.practiceRunner.innerHTML='<div class="typing-target"><small>Texto-alvo</small><p>'+esc(target)+'</p></div><div class="practice-metrics"><span>Meta: <strong>'+esc(targetWpm)+' PPM</strong></span><span>Precisão: <strong>'+esc(minAccuracy)+'%</strong></span></div><label for="typingInput">Digite aqui</label><textarea id="typingInput" class="typing-input" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea><div class="practice-actions"><button type="button" class="primary" id="validateTyping">Avaliar digitação</button></div><p class="practice-status" data-practice-status>Comece a digitar para iniciar a medição.</p>';
   const input=els.practiceRunner.querySelector('#typingInput');
   input.addEventListener('paste',e=>{e.preventDefault();const s=els.practiceRunner.querySelector('[data-practice-status]');s.className='practice-status error';s.textContent='Colar está desativado nesta prática.'});
   input.addEventListener('input',()=>{if(!practiceStartedAt)practiceStartedAt=Date.now()},{once:true});
   els.practiceRunner.querySelector('#validateTyping').onclick=()=>{
     const typed=input.value,elapsed=Math.max(1,(Date.now()-(practiceStartedAt||Date.now()))/60000);
     const words=typed.trim()?typed.trim().split(/\s+/).length:0,wpm=Math.round(words/elapsed);
     const maxLen=Math.max(target.length,typed.length,1),accuracy=Math.max(0,Math.round((1-editDistance(target,typed))/maxLen*100));
     const status=els.practiceRunner.querySelector('[data-practice-status]');
     status.textContent='Resultado: '+wpm+' PPM · '+accuracy+'% de precisão.';
     if(accuracy>=minAccuracy&&wpm>=targetWpm){setPracticePassed('Meta atingida: '+wpm+' PPM · '+accuracy+'% de precisão ✓')}
     else{status.className='practice-status error';status.textContent+=' Revise e tente novamente até atingir as duas metas.'}
   };
 }else if(mode==='shortcut'){
   const combo=String(cfg.shortcut||'Ctrl/Cmd+A'),purpose=String(cfg.purpose||'Executar o atalho');
   const expected=(combo.match(/\+([A-Za-z])$/)||[])[1]?.toLowerCase()||'a';
   els.practiceRunner.innerHTML='<div class="shortcut-card"><span>'+esc(purpose)+'</span><strong>'+esc(combo)+'</strong><small>Use Ctrl no Windows/Linux ou Cmd no macOS.</small></div><button type="button" class="primary" id="shortcutCapture">Ativar captura do atalho</button><p class="practice-status" data-practice-status>A captura ainda não foi ativada.</p>';
   const btn=els.practiceRunner.querySelector('#shortcutCapture'),status=els.practiceRunner.querySelector('[data-practice-status]');
   let active=false;
   const handler=e=>{
     if(!active)return;
     if(e.ctrlKey||e.metaKey)e.preventDefault();
     const ok=(e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()===expected;
     if(ok){active=false;document.removeEventListener('keydown',handler,true);btn.textContent='Atalho reconhecido ✓';setPracticePassed('Atalho '+combo+' reconhecido corretamente ✓')}
     else{status.className='practice-status error';status.textContent='Combinação recebida, mas ainda não corresponde a '+combo+'. Tente novamente.'}
   };
   btn.onclick=()=>{active=true;status.className='practice-status';status.textContent='Captura ativa. Execute '+combo+' agora.';document.addEventListener('keydown',handler,true)};
 }else{
   const checklist=Array.isArray(cfg.checklist)&&cfg.checklist.length?cfg.checklist:[
     'Executei a atividade proposta na ferramenta indicada.',
     'Revisei o resultado comparando com o objetivo da aula.',
     'Consigo explicar o que fiz e repetir o processo.'
   ];
   const prompt=cfg.reflection_prompt||'Em uma frase, descreva o que você fez.';
   els.practiceRunner.innerHTML='<div class="practice-checklist">'+checklist.map((item,i)=>'<label><input type="checkbox" data-practice-check="'+i+'"><span>'+esc(item)+'</span></label>').join('')+'</div><label for="practiceReflection">'+esc(prompt)+'</label><textarea id="practiceReflection" class="practice-reflection" maxlength="500" placeholder="Registre sua verificação em poucas palavras."></textarea><div class="practice-actions"><button type="button" class="primary" id="validateStructured">Validar prática</button></div><p class="practice-status" data-practice-status>Conclua os itens e registre sua revisão.</p>';
   els.practiceRunner.querySelector('#validateStructured').onclick=()=>{
     const checks=[...els.practiceRunner.querySelectorAll('[data-practice-check]')],reflection=els.practiceRunner.querySelector('#practiceReflection').value.trim(),status=els.practiceRunner.querySelector('[data-practice-status]');
     if(checks.every(c=>c.checked)&&reflection.length>=12)setPracticePassed('Checklist concluído e prática validada ✓');
     else{status.className='practice-status error';status.textContent='Marque todos os itens e escreva uma breve revisão com pelo menos 12 caracteres.'}
   };
 }
 if(isMastered){
   setPracticePassed('Esta prática já foi concluída anteriormente ✓');
   els.next.textContent='Aula concluída ✓ Voltar à trilha';
 }
}

function renderRequirements(){
 const tests=theory.evaluator?.tests||[];
 if(!tests.length){
   els.requirements.innerHTML='<li class="done"><span></span>Objetivo da aula identificado</li><li data-practice-req class="'+(practicePassed?'done':'')+'"><span></span>Atividade prática validada</li><li class="'+(isMastered?'done':'')+'"><span></span>Conclusão registrada na trilha</li>';
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
 const testPct=tests.length?(currentScore/100)*65:(practicePassed?65:0);
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
   practicePassed=true;
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

async function verifyLabProgress(source){
 if(!lesson?.id||!session?.access_token)return null;
 const r=await fetch(cfg.supabaseUrl+'/functions/v1/academy-verify-lab',{
  method:'POST',
  cache:'no-store',
  headers:{
   apikey:cfg.supabasePublishableKey,
   authorization:'Bearer '+session.access_token,
   'content-type':'application/json'
  },
  body:JSON.stringify({lesson_id:lesson.id,source:String(source||'')})
 });
 const data=await r.json().catch(()=>({}));
 if(!r.ok||!data?.ok){
   console.error('ACADEMY_LAB_VERIFY',data);
   return null;
 }
 return data;
}

async function runLab(){
 const tests=theory.evaluator?.tests||[];
 els.run.disabled=true;els.run.textContent='Avaliando…';
 const source=els.editor.value;
 const result=await evaluateInWorker(source,tests);
 latestTestResults=result.results||tests.map(()=>false);
 latestTestResults.forEach((ok,i)=>{const li=els.requirements.querySelector('[data-test-index="'+i+'"]');if(li)li.classList.toggle('done',!!ok)});
 els.consolePanel.hidden=!(result.logs&&result.logs.length);els.consoleOutput.textContent=(result.logs||[]).join('\n');
 const passed=latestTestResults.filter(Boolean).length,localOk=tests.length>0&&passed===tests.length;
 const score=tests.length?Math.round((passed/tests.length)*100):0;
 els.feedback.className='feedback '+(localOk?'neutral':'error');
 els.feedback.innerHTML=localOk
   ?'<strong>Testes locais aprovados.</strong><span>Validando a conclusão com o servidor…</span>'
   :'<strong>'+passed+' de '+tests.length+' requisitos atendidos.</strong><span>Revise o código e tente novamente.</span>';

 let saved=null;
 if(localOk){
   const verified=await verifyLabProgress(source);
   if(verified?.passed&&verified?.progress){
     saved=verified.progress;
     currentProgress={
       ...(currentProgress||{}),
       status:saved.status||currentProgress?.status,
       best_score:Number(saved.best_score||currentProgress?.best_score||0),
       theory_confirmed_at:currentProgress?.theory_confirmed_at||new Date().toISOString(),
       mastered_at:saved.status==='mastered'?(currentProgress?.mastered_at||new Date().toISOString()):currentProgress?.mastered_at
     };
     isMastered=saved.status==='mastered'||Number(saved.best_score||0)>=Number(lesson.passing_score||100);
     els.feedback.className='feedback success';
     els.feedback.innerHTML='<strong>Domínio comprovado!</strong><span>Seu código foi validado no ambiente seguro e a conclusão foi registrada.</span>';
     setProgress(100);
   }else{
     els.feedback.className='feedback error';
     els.feedback.innerHTML='<strong>A validação segura não confirmou a conclusão.</strong><span>Revise o código e execute novamente.</span>';
   }
 }else{
   await recordProgress(0,true);
 }

 if(isMastered&&saved){
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
 if(!session){location.replace('../login.html?next='+encodeURIComponent('/academy/lesson.html?slug='+slug+(requestedCourse?'&course='+requestedCourse:'')));return}
 const {data:roleRow}=await sb.from('platform_roles').select('role').eq('user_id',session.user.id).maybeSingle();
 const isOwner=roleRow?.role==='owner'||roleRow?.role==='platform_admin';
 els.modeLabel.textContent=isOwner?'Modo proprietário':'Aluno';
 const {data,error}=await sb.rpc('academy_get_lesson',{p_slug:slug});
 if(error||!data){
   els.loading.innerHTML='<strong>Aula indisponível.</strong><p>Este nível ainda não está liberado para sua conta.</p><a class="primary" href="./curso.html?course='+encodeURIComponent(requestedCourse||'programacao-basico-ao-hard')+'">Voltar à trilha</a>';
   return;
 }
 lesson=data;moduleRow=data.module||{};courseRow=data.course||{};theory=data.theory||{};
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
   const courseUrl='./curso.html?course='+encodeURIComponent(courseRow?.slug||requestedCourse||'programacao-basico-ao-hard');
   if(isMastered){location.href=courseUrl;return}
   const tests=theory.evaluator?.tests||[];
   if(tests.length)return;
   if(!practicePassed){els.feedback.className='feedback error';els.feedback.innerHTML='<strong>Prática ainda não validada.</strong><span>Conclua o exercício prático antes de registrar domínio.</span>';return}
   els.next.disabled=true;els.next.textContent='Salvando progresso…';
   const saved=await recordProgress(100,true);
   if(saved){location.href=courseUrl;return}
   els.next.disabled=false;els.next.textContent='Concluir aula e registrar domínio';
   els.feedback.className='feedback error';
   els.feedback.innerHTML='<strong>Não foi possível salvar agora.</strong><span>Tente novamente antes de sair da aula.</span>';
 };
}
init();
