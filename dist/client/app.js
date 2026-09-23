const $ = s => document.querySelector(s);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blank = () => ({personal:{name:'',title:'',email:'',phone:'',location:'',linkedin:'',website:''},summary:'',education:[],experience:[],skills:{technical:'',soft:''},projects:[],certifications:[],awards:[],organizations:[],volunteer:[],languages:''});
const sectionInfo = [
  {key:'personal',name:'Personal information',icon:'◎',fields:[['name','Full name'],['title','Professional title'],['email','Email'],['phone','Phone'],['location','City / address'],['linkedin','LinkedIn URL'],['website','Portfolio / website']]},
  {key:'summary',name:'Professional summary',icon:'≡',fields:[['summary','Summary or career objective','textarea']]},
  {key:'experience',name:'Work experience',icon:'▣',fields:[['role','Job title'],['company','Company'],['start','Start date'],['end','End date'],['details','Responsibilities and achievements','textarea']]},
  {key:'education',name:'Education',icon:'◇',fields:[['school','School / university'],['degree','Degree or program'],['start','Year started'],['end','Graduation year'],['achievements','Achievements','textarea']]},
  {key:'skills',name:'Skills',icon:'✳',fields:[['technical','Technical skills (comma separated)','textarea'],['soft','Soft skills (comma separated)','textarea']]},
  {key:'projects',name:'Projects',icon:'⌘',fields:[['name','Project name'],['description','Description','textarea'],['technologies','Technologies used']]},
  {key:'certifications',name:'Certifications',icon:'✧',fields:[['name','Certification name'],['organization','Organization'],['date','Date']]},
  {key:'awards',name:'Awards',icon:'★',fields:[['name','Award'],['details','Details']]},
  {key:'organizations',name:'Organizations',icon:'♧',fields:[['name','Organization'],['details','Role or details']]},
  {key:'volunteer',name:'Volunteer experience',icon:'♡',fields:[['name','Organization / activity'],['details','What you did','textarea']]},
  {key:'languages',name:'Languages',icon:'◌',fields:[['languages','Languages (comma separated)']]}
];
const listSections = new Set(['experience','education','projects','certifications','awards','organizations','volunteer']);
let resume,cover,saved,activeSection='personal',pendingApply=null,toastTimer,printTarget='resume',aiInFlight=false;
try { resume = {...blank(),...JSON.parse(localStorage.getItem('cc-resume')||'{}')}; cover = JSON.parse(localStorage.getItem('cc-cover')||'{}'); saved = JSON.parse(localStorage.getItem('cc-saved')||'[]'); } catch {resume=blank();cover={};saved=[]}
resume.personal={...blank().personal,...resume.personal};resume.skills={...blank().skills,...resume.skills};
for(const key of listSections) if(!Array.isArray(resume[key]))resume[key]=[];
const coverFields=[['name','Your name'],['role','Target position'],['company','Company name'],['why','Why this company?','textarea'],['experience','Relevant experience','textarea'],['skills','Relevant skills','textarea'],['job','Job description','textarea'],['tone','Tone','select']];
function persist(){try{localStorage.setItem('cc-resume',JSON.stringify(resume));localStorage.setItem('cc-cover',JSON.stringify(cover));localStorage.setItem('cc-saved',JSON.stringify(saved));}catch{notify('Browser storage is full. Export your work before closing.')}}
function notify(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4800)}
function fieldHtml(key,label,type='text',value='',attrs=''){return `<div class="field ${type==='textarea'?'wide':''}"><label for="${escapeHtml(attrs)}">${escapeHtml(label)}</label>${type==='textarea'?`<textarea id="${escapeHtml(attrs)}" data-key="${escapeHtml(key)}" placeholder="Write in your own words...">${escapeHtml(value)}</textarea>`:`<input id="${escapeHtml(attrs)}" data-key="${escapeHtml(key)}" type="${key==='email'?'email':'text'}" value="${escapeHtml(value)}" placeholder="${escapeHtml(label)}">`}</div>`}
function renderSections(){const container=$('#sections');container.innerHTML=sectionInfo.map(s=>{
  const open=activeSection===s.key; let body='';
  if(listSections.has(s.key)){
    body=(resume[s.key]||[]).map((entry,i)=>`<div class="entry" data-index="${i}"><div class="entry-top"><strong>${escapeHtml(s.name)} ${i+1}</strong><span class="entry-actions"><button data-move="up" title="Move up" ${i===0?'disabled':''}>↑</button><button data-move="down" title="Move down" ${i===resume[s.key].length-1?'disabled':''}>↓</button><button data-remove title="Remove entry">✕</button></span></div><div class="field-grid">${s.fields.map(([key,label,type])=>fieldHtml(key,label,type,entry[key],`${s.key}-${i}-${key}`)).join('')}</div>${['experience','projects'].includes(s.key)?`<div class="ai-row"><span>Polish your ${s.key==='projects'?'project description':'experience details'}</span><button class="btn" data-ai="${s.key}" data-index="${i}">✦ Improve with AI</button></div>`:''}</div>`).join('')+`<button class="add-entry" data-add="${s.key}">+ Add ${s.key==='experience'?'experience':s.name.toLowerCase().replace(/s$/,'')}</button>`;
  }else if(s.key==='personal')body=`<div class="field-grid">${s.fields.map(([key,label,type])=>fieldHtml(key,label,type,resume.personal[key],`${s.key}-${key}`)).join('')}</div>`;
  else if(s.key==='skills')body=`<div class="field-grid">${s.fields.map(([key,label,type])=>fieldHtml(key,label,type,resume.skills[key],`${s.key}-${key}`)).join('')}</div><div class="ai-row"><span>Get skill ideas from your actual experience</span><button class="btn" data-ai="skills">✦ Suggest skills</button></div>`;
  else body=`<div class="field-grid">${s.fields.map(([key,label,type])=>fieldHtml(key,label,type,resume[s.key],`${s.key}-${key}`)).join('')}</div>${s.key==='summary'?`<div class="ai-row"><span>Rewrite using only your details</span><button class="btn" data-ai="summary">✦ Improve with AI</button></div>`:''}`;
  return `<div class="section-card ${open?'open':''}" data-section="${s.key}"><button class="section-header" aria-expanded="${open}"><span class="section-icon">${s.icon}</span>${s.name}<small>${open?'−':'+'}</small></button><div class="section-body">${body}</div></div>`}).join('');
}
function filled(v){return String(v||'').trim()}
function previewSection(title,inner){return inner?`<section class="paper-section"><h4>${title}</h4>${inner}</section>`:''}
function renderPreview(){const p=resume.personal;const contact=[p.email,p.phone,p.location,p.linkedin,p.website].filter(filled).map(x=>`<span>${escapeHtml(x)}</span>`).join('');
  const entry=(title,subtitle,details)=>`<div class="paper-entry"><div class="paper-entry-title">${escapeHtml(title||'Untitled')}</div>${subtitle?`<div class="paper-entry-sub">${escapeHtml(subtitle)}</div>`:''}${details?`<p>${escapeHtml(details)}</p>`:''}</div>`;
  const sections=[];
  if(filled(resume.summary))sections.push(previewSection('Profile',`<p>${escapeHtml(resume.summary)}</p>`));
  sections.push(previewSection('Experience',resume.experience.filter(x=>Object.values(x).some(filled)).map(x=>entry(x.role,[x.company,[x.start,x.end].filter(filled).join(' – ')].filter(filled).join(' · '),x.details)).join('')));
  sections.push(previewSection('Education',resume.education.filter(x=>Object.values(x).some(filled)).map(x=>entry(x.degree,[x.school,[x.start,x.end].filter(filled).join(' – ')].filter(filled).join(' · '),x.achievements)).join('')));
  const skills=[resume.skills.technical,resume.skills.soft].filter(filled).join(', ').split(/[,\n]/).map(x=>x.trim()).filter(Boolean);
  sections.push(previewSection('Skills',skills.map(x=>`<span>${escapeHtml(x)}</span>`).join('')?`<div class="paper-skills">${skills.map(x=>`<span>${escapeHtml(x)}</span>`).join('')}</div>`:''));
  sections.push(previewSection('Projects',resume.projects.filter(x=>Object.values(x).some(filled)).map(x=>entry(x.name,x.technologies,x.description)).join('')));
  sections.push(previewSection('Certifications',resume.certifications.filter(x=>Object.values(x).some(filled)).map(x=>entry(x.name,[x.organization,x.date].filter(filled).join(' · '),'')).join('')));
  for(const [key,title] of [['awards','Awards'],['organizations','Organizations'],['volunteer','Volunteer experience']])sections.push(previewSection(title,resume[key].filter(x=>Object.values(x).some(filled)).map(x=>entry(x.name,'',x.details)).join('')));
  if(filled(resume.languages))sections.push(previewSection('Languages',`<p>${escapeHtml(resume.languages)}</p>`));
  $('#resume-preview').innerHTML=`<header class="paper-head"><div class="paper-name">${escapeHtml(p.name||'Your Name')}</div><div class="paper-role">${escapeHtml(p.title||'Your professional title')}</div>${contact?`<div class="paper-contact">${contact}</div>`:''}</header>${sections.join('')||'<section class="paper-section"><h4>Start here</h4><p>Add your details on the left to build your resume.</p></section>'}`;
  const count=[p.name,p.email,resume.summary,resume.experience.length,resume.education.length,skills.length,resume.projects.length].filter(Boolean).length;
  $('#progress-bar').style.width=`${Math.round(count/7*100)}%`;$('#progress-label').textContent=count===0?'Getting started':count>=6?'Looking strong':`${count} of 7 essentials`;
}
function renderSaved(){const holder=$('#saved-documents');holder.innerHTML=saved.length?saved.map((d,i)=>`<div class="saved-item"><strong>${escapeHtml(d.name)}</strong><span>${escapeHtml(d.date)}</span><button data-load="${i}">Open</button><button data-delete="${i}" class="delete">Delete</button></div>`).join(''):'<p class="empty-docs">Your saved versions will appear here.</p>'}
function renderCover(){const holder=$('#cover-fields');holder.innerHTML=coverFields.map(([key,label,type])=>type==='select'?`<div class="field"><label for="cover-tone">Tone</label><select id="cover-tone" data-key="tone">${['Professional','Confident','Simple','Friendly'].map(t=>`<option ${cover.tone===t?'selected':''}>${t}</option>`).join('')}</select></div>`:fieldHtml(key,label,type,cover[key]|| (key==='name'?resume.personal.name:''),`cover-${key}`)).join('');$('#letter-text').value=cover.letter||'';$('#job-text').value=cover.job||''}
function switchView(view){if(view==='cover'&&!filled(cover.name)&&filled(resume.personal.name)){$('#cover-name').value=resume.personal.name;cover.name=resume.personal.name;persist()}for(const b of document.querySelectorAll('.nav-item'))b.classList.toggle('active',b.dataset.view===view);for(const v of document.querySelectorAll('.view'))v.classList.toggle('active',v.id===`${view}-view`);history.replaceState(null,'',`#${view}`);scrollTo({top:0,behavior:'smooth'})}
async function callAI(kind,text,context={}){
  if(aiInFlight)throw Error('Another AI request is still running. Wait for it to finish, then try again.');
  aiInFlight=true;
  try{
    const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,text,context})});
    let data;try{data=await response.json()}catch{throw Error('The AI service returned an unexpected response. Please try again.')}
    if(!response.ok)throw Error(data.error||'AI is unavailable right now. Please try again.');
    if(!data.result)throw Error('No suggestion came back. Please try again.');
    return data.result;
  }finally{aiInFlight=false}
}
async function suggest(kind,index,button){let text='',apply;
  if(kind==='summary'){text=resume.summary||[resume.personal.title,...resume.experience.map(x=>x.details),...resume.projects.map(x=>x.description)].filter(filled).join('\n');apply=v=>resume.summary=v}
  if(kind==='experience'){text=resume.experience[index]?.details||'';apply=v=>resume.experience[index].details=v}
  if(kind==='projects'){text=resume.projects[index]?.description||'';apply=v=>resume.projects[index].description=v}
  if(kind==='skills'){text=[resume.skills.technical,resume.skills.soft,...resume.experience.map(x=>x.details),...resume.projects.map(x=>x.description)].filter(filled).join('\n');apply=v=>resume.skills.technical=[resume.skills.technical,v].filter(filled).join(', ')}
  if(!filled(text)){notify('Add your own details first, then AI can improve them.');return}
  button.disabled=true;button.textContent='Thinking…';try{const result=await callAI(kind,text,{title:resume.personal.title,section:kind});pendingApply=apply;$('#suggestion-text').textContent=result;$('#suggestion-dialog').showModal()}catch(e){notify(e.message)}finally{button.disabled=false;button.textContent=kind==='skills'?'✦ Suggest skills':'✦ Improve with AI'}
}
function printDoc(target){if(target==='resume'&&!filled(resume.personal.name)){notify('Add your name before downloading the resume.');return}if(target==='cover'&&!filled($('#letter-text').value)){notify('Write or generate a cover letter first.');return}printTarget=target;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('printing',v.id===`${target}-view`));window.print()}
window.addEventListener('afterprint',()=>document.querySelectorAll('.view').forEach(v=>v.classList.remove('printing')));
$('#sections').addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;const card=button.closest('.section-card');const key=card?.dataset.section;const entry=button.closest('.entry');const index=Number(entry?.dataset.index);
  if(button.classList.contains('section-header')){activeSection=activeSection===key?'':key;renderSections();return}
  if(button.dataset.add){resume[key].push(Object.fromEntries(sectionInfo.find(s=>s.key===key).fields.map(([name])=>[name,''])));renderSections();renderPreview();persist();return}
  if(button.hasAttribute('data-remove')){resume[key].splice(index,1);renderSections();renderPreview();persist();return}
  if(button.dataset.move){const other=index+(button.dataset.move==='up'?-1:1);[resume[key][index],resume[key][other]]=[resume[key][other],resume[key][index]];renderSections();renderPreview();persist();return}
  if(button.dataset.ai)suggest(button.dataset.ai,Number(button.dataset.index),button)
});
$('#sections').addEventListener('input',e=>{const el=e.target;if(!el.dataset.key)return;const card=el.closest('.section-card');const key=card.dataset.section;const index=el.closest('.entry')?.dataset.index;if(index!==undefined)resume[key][Number(index)][el.dataset.key]=el.value;else if(key==='personal'||key==='skills')resume[key][el.dataset.key]=el.value;else resume[key]=el.value;renderPreview();persist()});
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
$('#template').addEventListener('change',e=>{$('#resume-preview').className=`paper ${e.target.value}`;try{localStorage.setItem('cc-template',e.target.value)}catch{}});
$('#save-resume').addEventListener('click',()=>{if(!filled(resume.personal.name)){notify('Add your name before saving a version.');return}saved.unshift({type:'resume',name:`${resume.personal.name} — resume`,date:new Date().toLocaleDateString(),data:structuredClone(resume)});saved=saved.slice(0,15);persist();renderSaved();notify('Resume version saved in this browser.')});
$('#saved-documents').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const i=Number(b.dataset.load??b.dataset.delete);if(b.hasAttribute('data-delete')){saved.splice(i,1);persist();renderSaved();notify('Saved version deleted.');return}const doc=saved[i];if(doc.type==='resume'){resume=structuredClone(doc.data);renderSections();renderPreview();switchView('resume')}else{cover=structuredClone(doc.data);renderCover();switchView('cover')}persist();notify('Saved version opened.')});
$('#print-resume').addEventListener('click',()=>printDoc('resume'));$('#print-letter').addEventListener('click',()=>printDoc('cover'));
$('#cover-fields').addEventListener('input',e=>{if(e.target.dataset.key){cover[e.target.dataset.key]=e.target.value;persist()}});
$('#letter-text').addEventListener('input',e=>{cover.letter=e.target.value;persist()});$('#job-text').addEventListener('input',e=>{cover.job=e.target.value;persist()});
$('#save-letter').addEventListener('click',()=>{if(!filled(cover.letter)){notify('Write or generate a letter before saving.');return}saved.unshift({type:'cover',name:`${cover.company||'Application'} — cover letter`,date:new Date().toLocaleDateString(),data:structuredClone(cover)});saved=saved.slice(0,15);persist();renderSaved();notify('Cover letter saved in this browser.')});
$('#generate-letter').addEventListener('click',async e=>{const b=e.currentTarget;cover.name=cover.name||resume.personal.name;if(!filled(cover.name)||!filled(cover.role)||!filled(cover.company)){notify('Enter your name, position, and company first.');return}if(!filled(cover.experience)&&!filled(cover.skills)&&!filled(resume.summary)){notify('Add relevant experience or skills so the letter can be specific.');return}b.disabled=true;b.textContent='Generating your letter…';try{const context={...cover,resume:{summary:resume.summary,skills:resume.skills,experience:resume.experience,projects:resume.projects}};cover.letter=await callAI('cover',JSON.stringify(context),context);$('#letter-text').value=cover.letter;persist();notify('Cover letter generated. Review and edit your draft.')}catch(err){notify(err.message)}finally{b.disabled=false;b.innerHTML='<span>✦</span> Generate with Gemini'}});
$('#improve-letter').addEventListener('click',async e=>{const text=$('#letter-text').value;if(!filled(text)){notify('Write or generate a letter first.');return}const b=e.currentTarget;b.disabled=true;try{const result=await callAI('letter-improve',text,{tone:cover.tone||'Professional'});pendingApply=v=>{cover.letter=v;$('#letter-text').value=v};$('#suggestion-text').textContent=result;$('#suggestion-dialog').showModal()}catch(err){notify(err.message)}finally{b.disabled=false}});
$('#analyze-job').addEventListener('click',async e=>{const text=$('#job-text').value;if(text.trim().length<40){notify('Paste a fuller job description to analyze.');return}const b=e.currentTarget;b.disabled=true;b.textContent='Analyzing the role…';try{const result=await callAI('analyze',text,{title:resume.personal.title});const el=$('#analysis-result');el.classList.remove('empty-state');el.textContent=result;notify('Analysis complete.')}catch(err){notify(err.message)}finally{b.disabled=false;b.textContent='✦ Analyze with Gemini'}});
$('#close-dialog').addEventListener('click',()=>$('#suggestion-dialog').close());$('#discard-suggestion').addEventListener('click',()=>$('#suggestion-dialog').close());$('#apply-suggestion').addEventListener('click',()=>{if(pendingApply)pendingApply($('#suggestion-text').textContent);pendingApply=null;renderSections();renderPreview();persist();$('#suggestion-dialog').close();notify('Suggestion applied. You can still edit the wording.')});
renderSections();renderPreview();renderCover();renderSaved();try{const t=localStorage.getItem('cc-template');if(['modern','classic','minimal'].includes(t)){$('#template').value=t;$('#resume-preview').className=`paper ${t}`}}catch{}switchView(['resume','cover','analyze'].includes(location.hash.slice(1))?location.hash.slice(1):'resume');
fetch('/api/health').then(r=>r.json()).then(data=>{$('#ai-status').textContent=data.aiConfigured?'Gemini connected':'Gemini setup needed'}).catch(()=>{$('#ai-status').textContent='AI status unavailable'});
