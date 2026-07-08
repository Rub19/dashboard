/* ETHONE legacy compatibility module: auth-cloud-load. */
async function loadCloudState(){
  if(!_sbUser)return;
  const {data,error}=await sb.from('dashboard_data').select('*').eq('user_id',_sbUser.id).order('created_at',{ascending:true});
  if(error)console.error('loadCloudState error:',error);
  if(data&&data.length){
    profiles=data.map(d=>{
      const s=d.state||{};
      const idx=s.avatarIdx||0;
      const av=AVATARS[idx]||AVATARS[0];
      return {
        id:d.id,
        _dbId:d.id,
        name:d.profile_name,
        avatarEmoji:s.avatarEmoji||av.e,
        avatarBg:s.avatarBg||av.b,
        avatarImg:s.avatarImg||null,
        avatarIdx:idx,
        password:s.password||null,
        themeIdx:s.themeIdx||0,
        bgTheme:s.bgTheme||'none',
        sidebarConfig:s.sidebarConfig||null,
        sidebarCompact:s.sidebarCompact||false,
        customAccent:s.customAccent||null,
        bannerImg:s.bannerImg||null,
        theme:s.theme||null,
        workspaces:s.workspaces||null,
        activeWorkspaceId:s.activeWorkspaceId||null,
        experimentalFlags:s.experimentalFlags||null,
        devDebug:s.devDebug||false,
        state:{
          items:s.items||[],
          todos:s.todos||[],
          note:s.note||'',
          notes:s.notes||[],
          activity:s.activity||[],
          username:s.username||d.profile_name,
          connections:s.connections||{},
          gaming:s.gaming||{},
          pinned:s.pinned||[],
          habits:s.habits||[],
          kanban:s.kanban||[],
          events:s.events||[],
          manualBadges:s.manualBadges||{},
          pomoHistory:s.pomoHistory||[],
          notifEnabled:s.notifEnabled||false,
          notifPrefs:s.notifPrefs||{tasks:true,habits:true,events:true,ai:true,system:true,quietStart:'',quietEnd:''},
          automationRules:s.automationRules||[],
          bio:s.bio||'',
          socials:s.socials||{},
          goals:s.goals||[],
          journal:s.journal||[],
          countdowns:s.countdowns||[],
          banner:s.banner||null,
          themeIdx:s.themeIdx||0,
          xp:s.xp||0,
          weatherCity:s.weatherCity||null,
          weatherCache:s.weatherCity&&s.weatherCache?.city===s.weatherCity?s.weatherCache:null,
          aiSessions:s.aiSessions||[],
          overviewOrder:s.overviewOrder||[],
          dailyFocus:s.dailyFocus||null,
          valorantAccounts:s.valorantAccounts||[],
          valorantAccountsView:s.valorantAccountsView||{columnOrder:null,columnWidths:{},hiddenColumns:[],pinnedColumns:[],activeFilterView:'all',sort:[],groupBy:null,knownTags:[],customColumns:[],dropdownDefs:{},lockedColumns:[],columnLabels:{}},
          databases:s.databases||[],
          databasesView:s.databasesView||{lastOpenedId:null,order:null,favorites:[]},
          backupSnapshots:s.backupSnapshots||[],
          backupHistory:s.backupHistory||[],
          backupMeta:s.backupMeta||null,
        }
      };
    });
  } else {
    // New user (no cloud rows yet) — try localStorage backup first, but ONLY if
    // it was saved by THIS SAME Supabase user id. Different login methods for the
    // same email (e.g. password account vs "Continue with Google") are separate
    // Supabase auth users unless identities are linked, so a fresh Google login
    // lands here with zero cloud rows. Without this check we'd silently adopt
    // whatever profiles were last cached locally by a DIFFERENT account on this
    // browser and re-insert every one of them as new rows under the new user id
    // (this is exactly how the account got duplicated before this fix).
    try{
      const backupOwner=localStorage.getItem('myspace_profiles_backup_owner');
      const backup=localStorage.getItem('myspace_profiles_backup');
      if(backup&&backupOwner===_sbUser.id){
        const parsed=JSON.parse(backup);
        if(parsed&&parsed.length){profiles=parsed;await saveCloudState();return;}
      }
    }catch(e){}
    // Create default profile
    const meta=_sbUser.user_metadata||{};
    const username=meta.username||_sbUser.email?.split('@')[0]?.replace('@dashboard.local','')||'User';
    profiles=[{
      id:Date.now(),
      name:username,
      avatarEmoji:AVATARS[0].e,
      avatarBg:AVATARS[0].b,
      avatarImg:null,
      avatarIdx:0,
      state:defState(username)
    }];
    await saveCloudState();
  }
}
