/* ETHONE legacy compatibility module: auth-cloud-save. */
function updateSyncIndicator(state){
  const dot=document.getElementById('sb-sync-dot');
  const label=document.getElementById('sb-sync-label');
  const colors={saving:'#fbbf24',saved:'#34d399',error:'#f87171',offline:'rgba(255,255,255,.2)'};
  const labels={saving:'Sync…',saved:'Synced ✓',error:'Offline',offline:'Local'};
  if(dot)dot.style.background=colors[state]||colors.offline;
  if(label)label.textContent=labels[state]||'—';
}

async function saveCloudState(){
  // Update sessionStorage cache
  if(_sbUser){try{sessionStorage.setItem('nexus_profiles_'+_sbUser.id,JSON.stringify(profiles));}catch(e){}}
  if(!_sbUser)return;
  for(const p of profiles){
    // Compress avatar image if too large (Supabase ~1MB per row limit)
    let avatarImg=p.avatarImg||null;
    if(avatarImg&&avatarImg.length>200000){
      try{
        avatarImg=await compressImage(avatarImg,400,400);
      }catch(e){console.warn('Avatar compress error',e);}
    }
    const payload={
      user_id:_sbUser.id,
      profile_name:p.name||'User',
      state:{
        ...p.state,
        avatarEmoji:p.avatarEmoji,
        avatarBg:p.avatarBg,
        avatarImg:avatarImg,
        avatarIdx:p.avatarIdx,
        password:p.password||null,
        themeIdx:p.themeIdx||0,
        bgTheme:p.bgTheme||'none',
        sidebarConfig:p.sidebarConfig||null,
        sidebarCompact:p.sidebarCompact||false,
        customAccent:p.customAccent||null,
        bannerImg:p.bannerImg||null,
        notifEnabled:p.state?.notifEnabled||false,
        xp:p.state?.xp||0,
        weatherCity:p.state?.weatherCity||null,
        weatherCache:p.state?.weatherCache||null,
        aiSessions:p.state?.aiSessions||[],
        overviewOrder:p.state?.overviewOrder||[],
        dailyFocus:p.state?.dailyFocus||null,
      },
      updated_at:new Date().toISOString()
    };
    if(p._dbId){
      const {error}=await sb.from('dashboard_data').update(payload).eq('id',p._dbId);
      if(error)console.error('saveCloudState update error:',error);
    } else {
      const {data,error}=await sb.from('dashboard_data').insert(payload).select().single();
      if(error)console.error('saveCloudState insert error:',error);
      if(data){p._dbId=data.id;p.id=data.id;}
    }
  }
}

function compressImage(base64,maxW,maxH){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      let w=img.width,h=img.height;
      if(w>maxW||h>maxH){
        const ratio=Math.min(maxW/w,maxH/h);
        w=Math.round(w*ratio);h=Math.round(h*ratio);
      }
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL('image/jpeg',0.95));
    };
    img.onerror=reject;
    img.src=base64;
  });
}
