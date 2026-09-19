const cfg=window.OYAG_CONFIG;
const sb=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:localStorage}});
const params=new URLSearchParams(location.search);
const slug=params.get('slug');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let lesson=null,moduleRow=null,theory={},starter='',quizPassed=new Set(),latestTestResults=[];

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
function renderQuiz(){
 const items=Array.isArray(theory.quiz)?theory.quiz:[];
 if(!items.length){els.quiz.innerHTML='<div class="checkpoint-status complete">Checkpoint orientado: revise o objetivo e o critério de domínio ✓</div>';els.checkpointStatus.hidden=true;quizPassed.add('auto');unlockLab();setProgress(35);return}
 els.quiz.innerHTML=items.map((item,i)=>'<fieldset class="question" data-q="'+i+'"><legend>'+(i+1)+'. '+esc(item.question)+'</legend><div class="answer-grid">'+(item.options||[]).map((o,j)=>'<button type="button" data-option="'+j+'">'+esc(o)+'</button>').join('')+'</div><p class="question-feedback" aria-live="polite"></p></fieldset>').join('');
 els.checkpointStatus.textContent='0 de '+items.length+' conceitos confirmados';
 els.quiz.querySelectorAll('.question').forEach(fs=>fs.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{
  const i=Number(fs.dataset.q),j=Number(btn.dataset.option),item=items[i],feedback=fs.querySelector('.question-feedback');
  fs.querySelectorAll('button').forEach(b=>b.classList.remove('correct','incorrect'));
  if(j===Number(item.correct)){btn.classList.add('correct');quizPassed.add(i);feedback.className='question-feedback ok';feedback.textContent=item.success||'Correto! Conceito confirmado.'}
  else{btn.classList.add('incorrect');feedback.className='question-feedback try';feedback.textContent=item.retry||'Ainda não. Revise a explicação e tente novamente.'}
  els.checkpointStatus.textContent=quizPassed.size+' de '+items.length+' conceitos confirmados';
  if(quizPassed.size===items.length){els.checkpointStatus.classList.add('complete');els.checkpointStatus.textContent='Teoria compreendida! Prática liberada ✓';unlockLab()}
  updateProgress();
 }));
}
function unlockLab(){
 const tests=theory.evaluator?.tests||[];
 if(tests.length&&starter){els.run.disabled=false;els.run.textContent='Executar e avaliar'}
 else{
   els.interactiveLab.hidden=true;els.structuredPractice.hidden=false;
   els.next.disabled=false;els.next.classList.add('unlocked');els.next.textContent='Aula publicada ✓ Voltar à trilha';
   setProgress(100);
 }
}
function renderRequirements(){
 const tests=theory.evaluator?.tests||[];
 if(!tests.length){els.requirements.innerHTML='<li class="done"><span></span>Objetivo da aula identificado</li><li class="done"><span></span>Atividade prática publicada</li><li><span></span>Laboratório automático será refinado em versão futura</li>';return}
 els.requirements.innerHTML=tests.map((t,i)=>'<li data-test-index="'+i+'"><span></span>'+esc(t.label||('Requisito '+(i+1)))+'</li>').join('');
}
function updateProgress(){
 const qItems=Array.isArray(theory.quiz)?theory.quiz.length:0;
 const quizPct=qItems?Math.min(35,(quizPassed.size/qItems)*35):35;
 const tests=theory.evaluator?.tests||[];
 const passed=latestTestResults.filter(Boolean).length;
 const testPct=tests.length?(passed/tests.length)*65:0;
 setProgress(quizPct+testPct);
}
function evaluateInWorker(source,tests){
 return new Promise(resolve=>{
  const workerCode='self.onmessage=e=>{const source=e.data.source,tests=e.data.tests,logs=[];try{const console={log:(...a)=>logs.push(a.map(x=>{try{return typeof x===\'string\'?x:JSON.stringify(x)}catch{return String(x)}}).join(\' \'))};const fetch=undefined,XMLHttpRequest=undefined,WebSocket=undefined,EventSource=undefined;const results=(function(){\"use strict\";'+source+';return tests.map(t=>{try{return !!eval(t.expression)}catch(e){return false}})})();self.postMessage({ok:true,results,logs})}catch(err){self.postMessage({ok:false,error:err.message||String(err),results:tests.map(()=>false),logs})}}';
  const blob=new Blob([workerCode],{type:'text/javascript'}),url=URL.createObjectURL(blob),worker=new Worker(url);
  const timer=setTimeout(()=>{worker.terminate();URL.revokeObjectURL(url);resolve({ok:false,error:'Tempo limite excedido.',results:tests.map(()=>false),logs:[]})},1400);
  worker.onmessage=e=>{clearTimeout(timer);worker.terminate();URL.revokeObjectURL(url);resolve(e.data)};
  worker.postMessage({source,tests});
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
 els.feedback.className='feedback '+(ok?'success':'error');
 els.feedback.innerHTML=ok?'<strong>Domínio comprovado!</strong><span>Seu código passou por todos os requisitos desta aula.</span>':'<strong>'+passed+' de '+tests.length+' requisitos atendidos.</strong><span>Revise o código e tente novamente.</span>';
 if(ok){els.next.disabled=false;els.next.classList.add('unlocked');els.next.textContent='Aula concluída ✓ Voltar à trilha';els.lessonStatus.textContent='Aula concluída'}
 updateProgress();els.run.disabled=false;els.run.textContent='Executar e avaliar';
}
async function init(){
 if(!slug){els.loading.textContent='Aula não informada.';return}
 const {data:{session}}=await sb.auth.getSession();
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
 els.lessonStatus.textContent=isOwner?'Prévia completa':'Em estudo';
 renderTheory();renderQuiz();renderRequirements();
 els.loading.hidden=true;els.app.hidden=false;
 document.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>document.querySelector('#'+b.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'}));
 els.run.onclick=runLab;els.reset.onclick=()=>{els.editor.value=starter;els.feedback.className='feedback neutral';els.feedback.innerHTML='<strong>Código restaurado.</strong><span>Você pode tentar novamente.</span>';els.consolePanel.hidden=true};
 els.hint.onclick=()=>{els.feedback.className='feedback neutral';els.feedback.innerHTML='<strong>Dica do Mentor OYAG</strong><span>'+esc(theory.hint||'Volte ao objetivo, divida o problema em partes menores e valide uma parte de cada vez.')+'</span>'};
 els.next.onclick=()=>location.href='./curso.html';
}
init();