/* No writes to the spreadsheet. Filter state lives in this browser tab only. */
const SHEET_ID='1MDk_TjY9ZMwzDi8F-m8RVogtO2TKBF2aDm5L9EwOOfc';
const $=id=>document.getElementById(id);
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const split=v=>String(v||'').split(/,\s*|\n/).map(s=>s.trim()).filter(Boolean);
const safeUrl=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const links=v=>String(v||'').match(/https?:\/\/[^\s,]+/g)||[];
let data=window.INITIAL_DATA, mode='snapshot',selectedTags=new Set(),state={flow:'',block:'',query:'',sort:'program'},lastUpdate='';
try{const s=JSON.parse(sessionStorage.getItem('pr-navigator')||'null');if(s){state={...state,...s.state};selectedTags=new Set(s.tags||[]);}}catch{}
const persist=()=>{try{sessionStorage.setItem('pr-navigator',JSON.stringify({state,tags:[...selectedTags]}));}catch{}};
function currentFlows(){return data.flows;}
function parseDate(s){if(!s)return Infinity;const m=s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);if(m)return Date.UTC(+m[3],+m[2]-1,+m[1]);const d=Date.parse(s);return Number.isFinite(d)?d:Infinity;}
function dateLabel(s){const n=parseDate(s);if(!Number.isFinite(n))return s||'Дата не назначена';return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(n);}
function scheduleRows(){return data.schedule;}
function options(el,items,placeholder,value){el.replaceChildren();el.add(new Option(placeholder,''));items.forEach(i=>el.add(new Option(i.label,i.value)));el.value=value;if(el.selectedIndex<0)el.value='';}
function buildFilters(){const fs=currentFlows();options($('flow'),fs.map(f=>({label:/^\d+$/.test(f.code)?`Поток ${f.code}`:f.code,value:f.code})),'Вся программа',state.flow);state.flow=$('flow').value;const blocks=[...new Set(data.lessons.map(l=>l.block))];options($('block'),blocks.map(b=>({label:b,value:b})),'Все блоки',state.block);state.block=$('block').value;$('search').value=state.query;$('sort').value=state.sort;renderTagOptions();render();}
function allTags(){return [...new Set(data.lessons.flatMap(l=>l.tags))].sort((a,b)=>a.localeCompare(b,'ru'));}
function renderTagOptions(){const q=$('tag-search').value.toLocaleLowerCase('ru');const tags=allTags().filter(t=>t.toLocaleLowerCase('ru').includes(q));$('tag-list').replaceChildren();if(!tags.length){$('tag-list').textContent='Такой темы пока нет';return;}tags.forEach(tag=>{const label=document.createElement('label');label.className='tag-option';const box=document.createElement('input');box.type='checkbox';box.checked=selectedTags.has(tag);box.addEventListener('change',()=>{box.checked?selectedTags.add(tag):selectedTags.delete(tag);render();});const span=document.createElement('span');span.textContent=tag;label.append(box,span);$('tag-list').append(label);});}
function filteredLessons(){const scheduled=scheduleRows().filter(r=>r.flow===state.flow);let rows=state.flow?scheduled.map(r=>{const lesson=data.lessons.find(l=>l.code===r.code);return lesson?{...lesson,...r,format:r.format||lesson.format}:null;}).filter(Boolean):data.lessons.map(l=>({...l,date:'',postTelegram:'',postVk:'',comment:''}));const q=state.query.trim().toLocaleLowerCase('ru');rows=rows.filter(l=>(!state.block||l.block===state.block)&&(!selectedTags.size||l.tags.some(t=>selectedTags.has(t)))&&(!q||`${l.code} ${l.title} ${l.block} ${l.tags.join(' ')}`.toLocaleLowerCase('ru').includes(q)));if(state.sort==='date')rows.sort((a,b)=>parseDate(a.date)-parseDate(b.date));return rows;}
function renderFlow(){
  const flow=currentFlows().find(f=>f.code===state.flow);
  if(!flow){
    $('flow-card').innerHTML='<div class="flow-meta"><h3>Все уроки акселератора</h3><p class="overview-help">Настройте фильтры слева, чтоб найти информацию по своему потоку или интересующему инструменту.</p><p class="overview-help"><strong>Важно(!)</strong> Программы для СНГ отличаются от основного набора Акселератора. Содержание для своего региона можете посмотреть, выбрав нужный в фильтре.</p></div>';
    return;
  }
  const counts={telegram:0,vk:0};
  const channel=[...new Set(links([flow.channel,flow.vkChannel].filter(Boolean).join('\n')))].map(value=>{
    const url=safeUrl(value);if(!url)return '';
    const host=new URL(url).hostname.toLowerCase().replace(/^www\./,'');
    const type=['t.me','telegram.me','telegram.org'].includes(host)?'telegram':['vk.com','vk.ru'].includes(host)?'vk':null;
    if(!type)return '';
    counts[type]++;
    const label=type==='telegram'?'Открыть Телеграм канал':'Открыть группу ВК';
    return `<a class="channel-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}${counts[type]>1?' '+counts[type]:''}</a>`;
  }).join('');
  const kamNames=String(flow.kam||'').split(/\r?\n/).map(name=>name.trim()).filter(Boolean);
  const kamList=(kamNames.length?kamNames:['Не заполнено']).map(name=>`<span class="kam-name">${escapeHtml(name)}</span>`).join('');
  $('flow-card').innerHTML=`<div class="flow-badge">${escapeHtml(/^\d+$/.test(flow.code)?'№ '+flow.code:flow.code)}</div><div class="flow-meta"><div class="small-label">НАЗВАНИЕ TELEGRAM / ВК КАНАЛА</div><h3>${escapeHtml(flow.name||'Не заполнено')}</h3><div class="meta-line"><span>Старт: ${escapeHtml(flow.start||'Не заполнено')}</span><div class="kam-group"><span class="kam-label">${kamNames.length>1?'КАМы':'КАМ'}:</span><div class="kam-names">${kamList}</div></div></div>${channel?'<div class="channel-links">'+channel+'</div>':''}</div>`;
}
function tagHtml(l){return l.tags.map(t=>`<span class="tag ${selectedTags.has(t)?'active':''}">${escapeHtml(t)}</span>`).join('');}
function render(){persist();renderFlow();const rows=filteredLessons();$('count').textContent=rows.length;$('result-description').textContent=state.flow?'Расписание выбранного потока':'Вся программа, без привязки к конкретному потоку';$('selected-tags').replaceChildren();selectedTags.forEach(tag=>{const b=document.createElement('button');b.textContent=tag+' ×';b.setAttribute('aria-label','Убрать тему '+tag);b.onclick=()=>{selectedTags.delete(tag);renderTagOptions();render();};$('selected-tags').append(b);});if(!rows.length){$('lessons').innerHTML=`<div class="empty"><h3>${state.flow&&!scheduleRows().some(r=>r.flow===state.flow)?'Расписание ещё не заполнено':'По этим условиям уроков нет'}</h3><div>Попробуйте другой блок или уберите выбранные темы.</div><button id="empty-reset">Сбросить фильтры</button></div>`;$('empty-reset').onclick=reset;return;}
$('lessons').innerHTML='<div class="table-wrap"><table><thead><tr><th>Урок и инструменты</th><th>Публикация</th><th>Пост в Telegram</th><th>Пост в ВК</th></tr></thead><tbody>'+rows.map((l,i)=>`${!state.flow&&(i===0||rows[i-1].block!==l.block)?blockHeading(l.block):''}<tr><td class="title-cell"><div class="lesson-title">${escapeHtml(l.title)}</div><div class="block-name">${state.flow?escapeHtml(l.block)+' · ':''}${escapeHtml(l.format||'Формат не указан')}</div><div class="tags">${tagHtml(l)}</div></td><td><span class="date ${l.date?'':'unknown'}">${escapeHtml(dateLabel(l.date))}</span></td><td class="post-cell">${postLinks(l.postTelegram,'Открыть пост')||'<span class="missing-post">'+(state.flow?'Нет ссылки':'—')+'</span>'}</td><td class="post-cell">${postLinks(l.postVk,'Открыть пост')||'<span class="missing-post">'+(state.flow?'Нет ссылки':'—')+'</span>'}</td></tr>`).join('')+'</tbody></table></div>';}
function blockHeading(block){
  const text=data.lessons.find(l=>l.block===block&&l.outcomes)?.outcomes||'';
  const points=text.trim().split(/\n\s*\n|\r?\n/).map(p=>p.trim()).filter(Boolean);
  return `<tr class="programme-block"><td colspan="4"><h3>${escapeHtml(block)}</h3>${points.length?`<details class="block-description"><summary>Описание и цели блока</summary><ul>${points.map(p=>`<li>${escapeHtml(p.replace(/^[•●–-]\s+/,''))}</li>`).join('')}</ul></details>`:''}</td></tr>`;
}
function postLinks(value,label){return [...new Set(links(value))].map(safeUrl).filter(Boolean).map((url,i)=>`<a class="post-link" aria-describedby="post-access-tip" href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}${i?' '+(i+1):''}</a>`).join('');}
function showDetail(l){const post=postLinks(l.postTelegram,'Пост в Telegram')+postLinks(l.postVk,'Пост в ВК');$('detail-content').innerHTML=`<span class="block-badge">${escapeHtml(l.block)}</span><h2>${escapeHtml(l.title)}</h2><p class="format">${escapeHtml(l.format||'Формат не указан')}</p><div class="date">Публикация: ${escapeHtml(dateLabel(l.date))}</div><h3>Темы и инструменты</h3><div class="tags">${tagHtml(l)}</div>${l.comment?'<h3>Комментарий</h3><div class="outcomes">'+escapeHtml(l.comment)+'</div>':''}<div class="detail-links">${post}</div>`;$('detail').showModal();}
function reset(){state={flow:'',block:'',query:'',sort:'program'};selectedTags.clear();$('tag-search').value='';buildFilters();}
function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}return rows;}
function normalize(raw){const outcomes={};const lessons=raw.program.filter(r=>/^B\d+-U\d+$/.test(r[0])).map(r=>{if(r[5])outcomes[r[1]]=r[5];return{code:r[0],block:r[1],title:r[2],format:r[3]||'',tags:split(r[4]),outcomes:r[5]||''};});lessons.forEach(l=>l.outcomes=outcomes[l.block]||'');const flows=raw.flows.filter(r=>r[0]).map(r=>({code:r[0],name:r[1],start:r[2],status:r[3],channel:r[4],vkChannel:r[5]||'',kam:r[6]}));const schedule=raw.schedule.filter(r=>r[0]&&r[1]).map(r=>({flow:r[0],code:r[1],format:r[4],date:r[5]||'',postTelegram:r[6]||'',postVk:r[7]||'',comment:r[8]||''}));if(!lessons.length||!flows.length)throw Error('Не удалось прочитать структуру таблицы');return{lessons,flows,schedule,snapshot:false};}
async function fetchRange(gid,range){const url=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}&range=${encodeURIComponent(range)}&_=${Date.now()}`;const response=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Таблица недоступна');const text=await response.text();if(/^\s*</.test(text))throw Error('Требуется доступ к таблице');return parseCSV(text);}
async function refresh(){const btn=$('refresh');btn.disabled=true;btn.textContent='Загружаю…';$('notice').hidden=true;try{let raw;if(window.google?.script?.run){raw=await new Promise((resolve,reject)=>google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).getNavigatorData());}else{const [program,flows,schedule]=await Promise.all([fetchRange(761826260,'A4:F203'),fetchRange(622974925,'A4:G203'),fetchRange(956595678,'A4:I1003')]);raw={program,flows,schedule};}data=normalize(raw);mode='live';selectedTags=new Set([...selectedTags].filter(t=>allTags().includes(t)));lastUpdate=new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date());$('updated').textContent='Обновлено в '+lastUpdate;buildFilters();}catch(e){$('updated').textContent='Google-таблица недоступна';$('notice').textContent='Не удалось обновить расписание. Показана сохранённая копия данных от 23 октября. Попробуйте обновить данные ещё раз.';$('notice').hidden=false;}finally{btn.disabled=false;btn.textContent='↻ Обновить данные';}}
$('flow').onchange=()=>{state.flow=$('flow').value;render();};$('block').onchange=()=>{state.block=$('block').value;render();};$('search').oninput=()=>{state.query=$('search').value;render();};$('sort').onchange=()=>{state.sort=$('sort').value;render();};$('tag-search').oninput=renderTagOptions;$('reset').onclick=reset;$('refresh').onclick=refresh;$('detail').querySelector('.close').onclick=()=>$('detail').close();$('detail').onclick=e=>{if(e.target===$('detail')){const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail').close();}};
buildFilters();$('updated').textContent='Данные таблицы · 23 октября';
refresh();

const postTip=document.createElement('div');
postTip.id='post-access-tip';postTip.className='post-access-tip';postTip.setAttribute('role','tooltip');postTip.textContent='Чтобы увидеть пост, нужно быть участником канала';postTip.hidden=true;document.body.append(postTip);
function hidePostTip(){postTip.hidden=true;}
function showPostTip(link){postTip.hidden=false;const r=link.getBoundingClientRect(),t=postTip.getBoundingClientRect();postTip.style.left=Math.max(10,Math.min(r.left+r.width/2-t.width/2,window.innerWidth-t.width-10))+'px';postTip.style.top=(r.top>t.height+16?r.top-t.height-8:r.bottom+8)+'px';}
document.addEventListener('pointerover',e=>{const link=e.target.closest('.post-link');if(link)showPostTip(link);});
document.addEventListener('pointerout',e=>{if(e.target.closest('.post-link')&&!e.relatedTarget?.closest?.('.post-link'))hidePostTip();});
document.addEventListener('focusin',e=>{const link=e.target.closest('.post-link');if(link)showPostTip(link);});
document.addEventListener('focusout',e=>{if(e.target.closest('.post-link'))hidePostTip();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hidePostTip();});
document.addEventListener('click',hidePostTip);document.addEventListener('scroll',hidePostTip,true);window.addEventListener('resize',hidePostTip);
