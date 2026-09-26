let DB=null, charts={};
const PALETTE=['#2456e6','#e63946','#2a9d8f','#e9c46a','#9b5de5','#f15bb5','#00bbf9','#80ed99','#ff9f1c','#5f6c7b'];
const $=id=>document.getElementById(id);
const SECTIONS=[
 {id:'overview',t:'Overview'},
 {id:'states',t:'States'},
 {id:'india',t:'India Trends'},
 {id:'zones',t:'Zones'},
 {id:'ml',t:'ML Predictions'},
 {id:'clusters',t:'Clusters & Risk'},
 {id:'slopes',t:'Trends & Slopes'},
 {id:'quality',t:'Data Quality & Validation'},
 {id:'sources',t:'Sources'}];
async function load(){const r=await fetch('data.json');DB=await r.json();initFilters();renderAll(true);$('updated').textContent='Last updated: '+new Date().toLocaleString();}
function fStates(){const z=$('fZone').value;return DB.states.filter(r=>(($('fYear').value==='All')||r.year==$('fYear').value)&&(($('fState').value==='All')||r.stateUt===$('fState').value)&&((z==='All')||r.zone===z));}
function initFilters(){
 $('nav').innerHTML=SECTIONS.map((s,i)=>`<button data-s="${s.id}" class="${i===0?'active':''}">${s.t}</button>`).join('');
 $('nav').onclick=e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('sec-'+b.dataset.s)?.scrollIntoView({behavior:'smooth'});};
 const yrs=['All',...new Set(DB.states.map(r=>r.year))].sort();
 const sts=['All',...new Set(DB.states.map(r=>r.stateUt))].sort();
 const zns=['All',...new Set(DB.states.map(r=>r.zone).filter(Boolean))].sort();
 $('fYear').innerHTML=yrs.map(y=>`<option>${y}</option>`).join('');
 $('fState').innerHTML=sts.map(s=>`<option>${s}</option>`).join('');
 $('fZone').innerHTML=zns.map(z=>`<option>${z}</option>`).join('');
 ['fYear','fState','fZone'].forEach(id=>$(id).onchange=()=>renderAll());
 $('btnRefresh').onclick=()=>load();
 let timer=null;
 $('fAuto').onchange=e=>{if(e.target.checked){timer=setInterval(()=>renderAll(),5000);}else{clearInterval(timer);}};
}
function card(sec,id,title){return `<div class="card" id="card-${id}"><h3>${title}</h3><div class="tabs">
 <button data-t="chart" class="active">Chart</button><button data-t="table">Table</button><button data-t="png">PNG</button><button data-t="svg">SVG</button></div>
 <div class="cview"><canvas id="cv-${id}"></canvas></div><div class="tview" style="display:none;overflow:auto" id="tv-${id}"></div></div>`;}
function tableHTML(rows,cols){return `<table><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??''}</td>`).join('')}</tr>`).join('')}</table>`;}
function wireCard(id,rows,cols,mkChart){
 const c=document.getElementById(`card-${id}`);const cv=document.getElementById(`cv-${id}`);
 c.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{
  c.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  const t=b.dataset.t;
  c.querySelector('.cview').style.display=t==='chart'?'block':'none';
  document.getElementById(`tv-${id}`).style.display=t==='table'?'block':'none';
  if(t==='table'){document.getElementById(`tv-${id}`).innerHTML=tableHTML(rows,cols);}
  if(t==='png'){const a=document.createElement('a');a.download=id+'.png';a.href=cv.toDataURL('image/png');a.click();}
  if(t==='svg'){const svg=toSVG(rows,cols);const a=document.createElement('a');a.download=id+'.svg';a.href=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));a.click();}
 });
 mkChart(cv);
}
function toSVG(rows,cols){const w=600,bh=22,h=60+rows.slice(0,20).length*bh;const vals=rows.slice(0,20).map(r=>+r[cols[1]]||0);const mx=Math.max(...vals,1);
 let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="white"/><text x="16" y="28" font-size="16" font-family="Arial">${cols[1]} by ${cols[0]}</text>`;
 vals.forEach((v,i)=>{const bw=(v/mx)*(w-220);s+=`<rect x="180" y="${48+i*bh}" width="${bw.toFixed(1)}" height="14" fill="${PALETTE[i%PALETTE.length]}"/><text x="8" y="${60+i*bh}" font-size="11" font-family="Arial">${String(rows[i][cols[0]]).slice(0,22)}</text><text x="${190+bw}" y="${60+i*bh}" font-size="11" font-family="Arial">${v}</text>`;});
 return s+'</svg>';}
function mkChart(cv,type,labels,datasets,extra={}){if(charts[cv.id])charts[cv.id].destroy();charts[cv.id]=new Chart(cv,{type,data:{labels,datasets},options:{responsive:true,plugins:{legend:{position:'bottom'}},...extra}});}
function renderAll(first=false){
 const rows=fStates();
 const sum=k=>rows.reduce((a,r)=>a+(+r[k]||0),0);
 const A=sum('accidents'),F=sum('fatalities'),I=sum('injured');
 $('kpis').innerHTML=[['Total Accidents',A],['Fatalities',F],['Injured',I],['Fatalities / 100 acc',(A?(100*F/A):0).toFixed(2)]].map(([l,v])=>`<div class="kpi"><div class="v">${Number(v).toLocaleString('en-IN')}</div><div class="l">${l}</div></div>`).join('');
 const byYear={};rows.forEach(r=>{byYear[r.year]=byYear[r.year]||{a:0,f:0,i:0};byYear[r.year].a+=+r.accidents||0;byYear[r.year].f+=+r.fatalities||0;byYear[r.year].i+=+r.injured||0;});
 const yrs=Object.keys(byYear).sort();
 const byState={};rows.forEach(r=>{byState[r.stateUt]=(byState[r.stateUt]||0)+(+r.accidents||0);});
 const top=Object.entries(byState).sort((a,b)=>b[1]-a[1]).slice(0,10);
 const byZone={};rows.forEach(r=>{if(r.zone)byZone[r.zone]=(byZone[r.zone]||0)+(+r.accidents||0);});
 const S=$('sections');S.innerHTML='';
 const defs=[
  ['overview','Overview',[['c-india','India trend (filtered years)',yrs.map(y=>({Year:y,Accidents:byYear[y].a})),['Year','Accidents'],'line'],
    ['c-top10','Top 10 states by accidents',top.map(([s,v])=>({State:s,Accidents:v})),['State','Accidents'],'hbar'],
    ['c-zone','Zone share of accidents',Object.entries(byZone).map(([z,v])=>({Zone:z,Accidents:v})),['Zone','Accidents'],'doughnut']]],
  ['states','States',[['c-st','Accidents by state (all filtered)',Object.entries(byState).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([s,v])=>({State:s,Accidents:v})),['State','Accidents'],'hbar']]],
  ['india','India Trends',[['c-in','India totals 2018-2024',DB.india.map(r=>({Year:r.year,Accidents:r.accidents,Fatalities:r.fatalities,Injured:r.injured})),['Year','Accidents'],'multi']]],
  ['zones','Zones',[['c-z','Zone totals (filtered)',Object.entries(byZone).map(([z,v])=>({Zone:z,Accidents:v})),['Zone','Accidents'],'bar']]],
  ['ml','ML Predictions',[['c-ml','Actual vs predicted (sample)',DB.mlPred.filter(r=>($('fState').value==='All'||r.state===$('fState').value)).slice(0,15).map(r=>({State:r.state+' '+r.year,Actual:r.actual,Baseline:r.baseline,RF:r.rf,GB:r.gb})),['State','Actual'],'mlmulti']]],
  ['clusters','Clusters & Risk',[['c-cl','Mean accidents by cluster state (top 15)',[...DB.clusters].sort((a,b)=>b.meanAccidents-a.meanAccidents).slice(0,15).map(r=>({State:r.state,MeanAccidents:Math.round(r.meanAccidents),Cluster:r.clusterId})),['State','MeanAccidents'],'hbar']]],
  ['slopes','Trends & Slopes',[['c-sl','State slopes per year (top 15)',[...DB.slopes].sort((a,b)=>b.slopePerYear-a.slopePerYear).slice(0,15).map(r=>({State:r.stateUt,Slope:Math.round(r.slopePerYear),Trend:r.trend})),['State','Slope'],'hbar']]],
  ['quality','Data Quality & Validation',[['c-va','Validation checks',DB.validation.map(r=>({Check:r.check,Result:r.result,Computed:r.computedValue,Published:r.publishedValue})),['Check','Computed'],'table']]],
  ['sources','Sources',[['c-so','Source provenance',DB.sources.map(r=>({Source:r.sourceName,Dataset:r.dataset,Coverage:r.yearCoverage,Status:r.verificationStatus})),['Source','Dataset'],'table']]]
 ];
 defs.forEach(([sid,title,cards])=>{
  const sec=document.createElement('section');sec.className='blk';sec.id='sec-'+sid;
  sec.innerHTML=`<h2>${title}</h2><div class="grid">${cards.map(c=>card(sid,c[0],c[1])).join('')}</div>`;S.appendChild(sec);
  cards.forEach(c=>{
   const [id,,rws,cols,kind]=c;
   wireCard(id,rws,cols,cv=>{
    const L=rws.map(r=>r[cols[0]]);const V=rws.map(r=>+r[cols[1]]||0);
    if(kind==='line')mkChart(cv,'line',L,[{label:cols[1],data:V,borderColor:PALETTE[0],backgroundColor:PALETTE[0]}]);
    else if(kind==='hbar')mkChart(cv,'bar',L,[{label:cols[1],data:V,backgroundColor:L.map((_,i)=>PALETTE[i%PALETTE.length])}],{indexAxis:'y'});
    else if(kind==='bar')mkChart(cv,'bar',L,[{label:cols[1],data:V,backgroundColor:PALETTE[2]}]);
    else if(kind==='doughnut')mkChart(cv,'doughnut',L,[{data:V,backgroundColor:PALETTE}]);
    else if(kind==='multi'){const keys=Object.keys(rws[0]||{}).filter(k=>k!==cols[0]);mkChart(cv,'line',L,keys.map((k,i)=>({label:k,data:rws.map(r=>+r[k]||0),borderColor:PALETTE[i%PALETTE.length]})));}
    else if(kind==='mlmulti'){mkChart(cv,'bar',rws.map(r=>r.State),[{label:'Actual',data:rws.map(r=>+r.Actual||0),backgroundColor:PALETTE[0]},{label:'Baseline',data:rws.map(r=>+r.Baseline||0),backgroundColor:PALETTE[3]},{label:'RF',data:rws.map(r=>+r.RF||0),backgroundColor:PALETTE[2]},{label:'GB',data:rws.map(r=>+r.GB||0),backgroundColor:PALETTE[1]}]);}
    else mkChart(cv,'bar',L,[{label:cols[1],data:V,backgroundColor:PALETTE[4]}]);
   });
  });
 });
}
load();
