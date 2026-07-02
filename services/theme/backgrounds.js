/* ETHONE legacy compatibility module: backgrounds. */
function startAmbientBg(){
  if(window.ETHONE_LIGHT_BOOT_MODE)return;
  // Don't start ambient if a custom bg theme is active
  const _activeBg=curP()?.bgTheme;
  if(_activeBg&&_activeBg!=='none')return;
  const canvas=document.getElementById('bg-canvas');
  if(!canvas||_ambientFrame)return;
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const ctx=canvas.getContext('2d');
  canvas.style.opacity='1';
  // Resize handler for ambient
  const _ambientResize=()=>{if(!_ambientFrame)return;canvas.width=window.innerWidth;canvas.height=window.innerHeight;};
  window.addEventListener('resize',_ambientResize);
  // Dust particles — tiny, slow, orange/white
  const pts=[];
  const N=90;
  for(let i=0;i<N;i++){
    pts.push({
      x:Math.random()*canvas.width,
      y:Math.random()*canvas.height,
      r:Math.random()*1.2+0.3,
      vx:(Math.random()-.5)*0.18,
      vy:(Math.random()-.5)*0.18,
      o:Math.random()*0.18+0.04,
      c:Math.random()<.3?'139,92,246':'245,245,247'
    });
  }
  // Orbs — slow pulsing radial gradients
  const orbs=[
    {x:.15,y:.2,r:.32,c:'139,92,246',s:0,sp:.0007},
    {x:.82,y:.75,r:.28,c:'124,58,237',s:2,sp:.0009},
    {x:.5,y:.55,r:.22,c:'139,92,246',s:4,sp:.0005},
  ];
  let t=0;
  const W=canvas.width,H=canvas.height;
  const draw=()=>{
    ctx.clearRect(0,0,W,H);
    // Orbs
    orbs.forEach(o=>{
      const pulse=0.5+0.5*Math.sin(t*o.sp*1000+o.s);
      const g=ctx.createRadialGradient(o.x*W,o.y*H,0,o.x*W,o.y*H,o.r*W);
      g.addColorStop(0,`rgba(${o.c},${0.045+pulse*0.025})`);
      g.addColorStop(1,`rgba(${o.c},0)`);
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    });
    // Dust
    pts.forEach(p=>{
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${p.c},${p.o})`;ctx.fill();
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<-5)p.x=W+5;if(p.x>W+5)p.x=-5;
      if(p.y<-5)p.y=H+5;if(p.y>H+5)p.y=-5;
    });
    t+=0.016;
    _ambientFrame=requestAnimationFrame(draw);
  };
  draw();
}
function stopAmbientBg(){
  if(_ambientFrame){cancelAnimationFrame(_ambientFrame);_ambientFrame=null;}
  const canvas=document.getElementById('bg-canvas');
  if(canvas)canvas.style.opacity='0';
}

function renderBgThemeBtns(){
  const p=curP();
  const cur=p?.bgTheme||'none';
  const container=document.getElementById('bg-theme-btns');
  if(!container)return;
  container.innerHTML=BG_THEMES.map(b=>`<button onclick="pickBgTheme('${b.id}')" style="padding:7px 16px;border-radius:var(--r-sm);border:1.5px solid ${b.id===cur?'var(--accent)':'var(--border2)'};background:${b.id===cur?'var(--accent-subtle)':'var(--surface2)'};color:${b.id===cur?'var(--accent)':'var(--muted)'};font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);transition:all .2s ease">${b.name}</button>`).join('');
}

function pickBgTheme(id){
  const p=curP();if(!p)return;
  p.bgTheme=id;
  saveStateNow();
  const c=document.getElementById('bg-canvas');
  if(c){c.width=window.innerWidth;c.height=window.innerHeight;}
  applyBgTheme(id);
  // Update sidebar transparency based on whether a bg is active
  const sb=document.getElementById('main-sidebar');
  if(sb)sb.style.background=(!id||id==='none')?'':'rgba(5,5,7,.5)';
  renderBgThemeBtns();
  toast('Background updated!','success');
}

function applyBgTheme(id){
  const canvas=document.getElementById('bg-canvas');if(!canvas)return;
  if(window.ETHONE_LIGHT_BOOT_MODE){canvas.style.opacity='0';return;}
  cancelAnimationFrame(_bgFrame);_bgParticles=[];
  // Stop ambient before applying custom theme
  if(_ambientFrame){cancelAnimationFrame(_ambientFrame);_ambientFrame=null;}
  if(!id||id==='none'){
    // Restart ambient on "none"
    startAmbientBg();
    return;
  }
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const ctx=canvas.getContext('2d');
  canvas.style.opacity='1';
  const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#3b82f6';
  const rgb=[parseInt(accent.slice(1,3),16),parseInt(accent.slice(3,5),16),parseInt(accent.slice(5,7),16)];

  if(id==='particles'){
    const N=55;
    for(let i=0;i<N;i++)_bgParticles.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*2+0.5,vx:(Math.random()-.5)*0.3,vy:(Math.random()-.5)*0.3,o:Math.random()*0.4+0.1});
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      _bgParticles.forEach((a,i)=>{
        _bgParticles.slice(i+1).forEach(b=>{
          const d=Math.hypot(a.x-b.x,a.y-b.y);
          if(d<130){ctx.beginPath();ctx.strokeStyle=`rgba(${rgb},${(1-d/130)*0.12})`;ctx.lineWidth=0.5;ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
        });
        ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fillStyle=`rgba(${rgb},${a.o})`;ctx.fill();
        a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>canvas.width)a.vx*=-1;if(a.y<0||a.y>canvas.height)a.vy*=-1;
      });
      _bgFrame=requestAnimationFrame(draw);
    };draw();
  } else if(id==='aurora'){
    let t=0;
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(let i=0;i<3;i++){
        const x=canvas.width*(0.3+i*0.2+Math.sin(t*0.3+i)*0.15);
        const y=canvas.height*(0.4+Math.sin(t*0.25+i*1.5)*0.2);
        const g=ctx.createRadialGradient(x,y,0,x,y,canvas.width*0.45);
        g.addColorStop(0,`rgba(${rgb},0.07)`);g.addColorStop(1,`rgba(${rgb},0)`);
        ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
      }
      t+=0.004;_bgFrame=requestAnimationFrame(draw);
    };draw();
  } else if(id==='grid'){
    const sz=44;let o=0;
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.strokeStyle=`rgba(${rgb},0.07)`;ctx.lineWidth=0.5;
      for(let x=(o%sz)-sz;x<canvas.width+sz;x+=sz){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
      for(let y=(o%sz)-sz;y<canvas.height+sz;y+=sz){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
      o+=0.2;_bgFrame=requestAnimationFrame(draw);
    };draw();
  } else if(id==='waves'){
    let t=0;
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(let w=0;w<4;w++){
        ctx.beginPath();
        for(let x=0;x<=canvas.width;x+=3){
          const y=canvas.height*(0.5+0.06*(w+1))+Math.sin(x*0.006+t*(0.3+w*0.1)+w*2)*60;
          x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.strokeStyle=`rgba(${rgb},${0.07-w*0.015})`;ctx.lineWidth=1.5;ctx.stroke();
      }
      t+=0.006;_bgFrame=requestAnimationFrame(draw);
    };draw();

  } else if(id==='meteors'){
    const meteors=[];
    const spawnMeteor=()=>{
      const angle=Math.PI/4;
      const startX=Math.random()*canvas.width*1.5;
      meteors.push({x:startX,y:-20,vx:Math.cos(angle)*8,vy:Math.sin(angle)*8,
        len:Math.random()*120+60,alpha:Math.random()*0.5+0.3,w:Math.random()*1.5+0.5,life:1});
    };
    for(let i=0;i<8;i++)setTimeout(spawnMeteor,i*400);
    let spawnT=0;
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      spawnT++;if(spawnT%90===0)spawnMeteor();
      for(let i=meteors.length-1;i>=0;i--){
        const m=meteors[i];
        const grad=ctx.createLinearGradient(m.x,m.y,m.x-m.vx*m.len/8,m.y-m.vy*m.len/8);
        grad.addColorStop(0,`rgba(${rgb},${m.alpha*m.life})`);
        grad.addColorStop(1,`rgba(${rgb},0)`);
        ctx.beginPath();ctx.moveTo(m.x,m.y);
        ctx.lineTo(m.x-m.vx*m.len/8,m.y-m.vy*m.len/8);
        ctx.strokeStyle=grad;ctx.lineWidth=m.w;ctx.stroke();
        m.x+=m.vx;m.y+=m.vy;m.life-=0.012;
        if(m.life<=0||m.x>canvas.width+100||m.y>canvas.height+100)meteors.splice(i,1);
      }
      _bgFrame=requestAnimationFrame(draw);
    };draw();

  } else if(id==='noise'){
    let t=0;
    const sz=5;
    const cols=Math.ceil(canvas.width/sz)+1,rows=Math.ceil(canvas.height/sz)+1;
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(let x=0;x<cols;x++){
        for(let y=0;y<rows;y++){
          // Smooth noise via sin/cos combination
          const n=(Math.sin(x*0.12+t)*Math.cos(y*0.09+t*0.6)+Math.sin((x+y)*0.07+t*0.4))*0.5+0.5;
          if(n>0.45){
            ctx.fillStyle=`rgba(${rgb},${(n-0.45)*0.12})`;
            ctx.fillRect(x*sz,y*sz,sz,sz);
          }
        }
      }
      t+=0.018;_bgFrame=requestAnimationFrame(draw);
    };draw();

  } else if(id==='hexagons'){
    const R=32,h=R*Math.sqrt(3);let t=0;
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const cols=Math.ceil(canvas.width/(R*3))+2;
      const rows=Math.ceil(canvas.height/h)+2;
      for(let row=0;row<rows;row++){
        for(let col=0;col<cols;col++){
          const cx=col*R*3+(row%2)*R*1.5-R;
          const cy=row*h-h/2;
          const pulse=Math.sin(t*0.5+(col+row)*0.4)*0.5+0.5;
          ctx.beginPath();
          for(let i=0;i<6;i++){
            const a=Math.PI/3*i-Math.PI/6;
            const px=cx+R*0.85*Math.cos(a),py=cy+R*0.85*Math.sin(a);
            i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
          }
          ctx.closePath();
          ctx.strokeStyle=`rgba(${rgb},${0.04+pulse*0.06})`;
          ctx.lineWidth=0.8;ctx.stroke();
        }
      }
      t+=0.008;_bgFrame=requestAnimationFrame(draw);
    };draw();

  } else if(id==='constellation'){
    const stars=[];
    for(let i=0;i<80;i++)stars.push({
      x:Math.random()*canvas.width,y:Math.random()*canvas.height,
      r:Math.random()*1.2+0.3,twinkle:Math.random()*Math.PI*2,speed:Math.random()*0.02+0.005
    });
    let t=0;
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // Draw connections
      for(let i=0;i<stars.length;i++){
        for(let j=i+1;j<stars.length;j++){
          const d=Math.hypot(stars[i].x-stars[j].x,stars[i].y-stars[j].y);
          if(d<110){
            const a=(1-d/110)*0.08;
            ctx.beginPath();ctx.moveTo(stars[i].x,stars[i].y);ctx.lineTo(stars[j].x,stars[j].y);
            ctx.strokeStyle=`rgba(${rgb},${a})`;ctx.lineWidth=0.6;ctx.stroke();
          }
        }
      }
      // Draw stars
      stars.forEach(s=>{
        s.twinkle+=s.speed;
        const glow=0.3+Math.sin(s.twinkle)*0.25;
        ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${rgb},${glow})`;ctx.fill();
      });
      t+=0.01;_bgFrame=requestAnimationFrame(draw);
    };draw();
  }
}

window.addEventListener('resize',()=>{
  const c=document.getElementById('bg-canvas');
  if(c&&c.style.opacity!=='0'){const p=curP();c.width=window.innerWidth;c.height=window.innerHeight;if(p?.bgTheme)applyBgTheme(p.bgTheme);}
});
