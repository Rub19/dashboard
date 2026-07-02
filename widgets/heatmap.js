/* ETHONE legacy compatibility module: heatmap. */
//  ACTIVITY HEATMAP (GitHub-style)
// ══════════════════════════════════════════════════════════════
function renderStatsHeatmap(){
  const p=curP();if(!p)return;
  const el=document.getElementById('stats-heatmap');if(!el)return;
  const activity=p.state.activity||[];
  const todos=p.state.todos||[];
  const items=p.state.items||[];
  const pomo=p.state.pomoHistory||[];
  const habits=p.state.habits||[];

  // Build activity map: date→count
  const actMap={};
  const addDate=(ts,weight=1)=>{
    if(!ts)return;
    const d=new Date(ts).toLocaleDateString('en-CA');
    actMap[d]=(actMap[d]||0)+weight;
  };
  activity.forEach(a=>addDate(a.ts,1));
  todos.filter(t=>t.done&&t.doneDate).forEach(t=>addDate(t.doneDate,2));
  pomo.forEach(h=>addDate(h.ts,1));
  items.forEach(i=>addDate(i.date?new Date(i.date).toLocaleDateString('en-CA'):null,1));

  // Last 26 weeks (6 months)
  const today=new Date();
  const weeks=26;
  const totalDays=weeks*7;
  const startDate=new Date(today);
  startDate.setDate(today.getDate()-totalDays+1);
  // Align to Sunday
  while(startDate.getDay()!==0)startDate.setDate(startDate.getDate()-1);

  const maxCount=Math.max(...Object.values(actMap),1);
  const getLevel=(count)=>!count?0:count<maxCount*.25?1:count<maxCount*.5?2:count<maxCount*.75?3:4;

  // Month labels
  const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let monthHtml='<div style="display:flex;margin-left:22px;margin-bottom:3px">';
  let lastMonth=-1;let weekIdx=0;
  // Build weeks
  let weeksData=[];let d=new Date(startDate);
  for(let w=0;w<weeks;w++){
    let week=[];
    for(let day=0;day<7;day++){
      const ds=d.toLocaleDateString('en-CA');
      const count=actMap[ds]||0;
      const level=getLevel(count);
      const isFuture=d>today;
      week.push({ds,count,level,isFuture,month:d.getMonth(),date:new Date(d)});
      d.setDate(d.getDate()+1);
    }
    weeksData.push(week);
  }

  // Month labels row
  let monthLabelHtml='<div style="display:flex;margin-left:24px;margin-bottom:3px;gap:2px">';
  let prevMonth=-1;
  weeksData.forEach(week=>{
    const m=week[0].month;
    if(m!==prevMonth){monthLabelHtml+=`<div class="heatmap-month-label" style="flex:1;min-width:11px">${monthNames[m]}</div>`;prevMonth=m;}
    else monthLabelHtml+=`<div style="flex:1;min-width:11px"></div>`;
  });
  monthLabelHtml+='</div>';

  // Day labels
  const dayLabels=['','Mo','','We','','Fr',''];
  const dayLabelHtml=`<div class="heatmap-days">${dayLabels.map(l=>`<div class="heatmap-day-label">${l}</div>`).join('')}</div>`;

  // Cells
  let cellsHtml='';
  weeksData.forEach(week=>{
    cellsHtml+=`<div class="heatmap-week">`;
    week.forEach(({ds,count,level,isFuture})=>{
      if(isFuture){cellsHtml+=`<div class="heatmap-cell" style="opacity:.3"></div>`;return;}
      cellsHtml+=`<div class="heatmap-cell" data-count="${count}" data-level="${level}" title="${ds}: ${count} action${count!==1?'s':''}"></div>`;
    });
    cellsHtml+=`</div>`;
  });

  // Total count
  const totalActs=Object.values(actMap).reduce((a,b)=>a+b,0);
  const totalEl=document.getElementById('stats-heatmap-total');
  if(totalEl)totalEl.textContent=`${totalActs} activities · last 6 months`;

  el.innerHTML=monthLabelHtml+`<div style="display:flex;gap:2px">${dayLabelHtml}<div class="heatmap-grid">${cellsHtml}</div></div>`;
}

// ══════════════════════════════════════════════════════════════
