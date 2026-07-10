/* ETHONE legacy compatibility module: import-export. */
//  IMPORT / EXPORT JSON
// ===================================================
function exportData(){
  const data={profiles,exportedAt:new Date().toISOString(),version:2};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='myspace-backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Data exported!','success');
  if(typeof addActivity==='function')addActivity('Data exported','var(--accent2)','system');
}
function importData(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async ev=>{
    try{
      const data=JSON.parse(ev.target.result);
      if(!data.profiles||!Array.isArray(data.profiles))throw new Error('Invalid format');
      if(!confirm('This will replace ALL your current data. Continue?'))return;
      profiles=data.profiles;
      // Reassign existing _dbId to avoid creating duplicates
      if(_sbUser){
        const {data:existing}=await sb.from('dashboard_data').select('id').eq('user_id',_sbUser.id);
        if(existing&&existing.length){
          // Supprime les anciens profiles cloud
          await sb.from('dashboard_data').delete().eq('user_id',_sbUser.id);
          // Reset _dbId to force an insert
          profiles.forEach(p=>{delete p._dbId;});
        }
      }
      toast('Importing...','info');
      await saveCloudState();
      toast('Data imported and saved! ','success');
      setTimeout(()=>{
        document.getElementById('main-sidebar').style.display='none';
        document.getElementById('main-content').style.display='none';
        goToProfileScreen();
      },1000);
    }catch(err){toast('Invalid file : '+err.message,'error');}
  };
  reader.readAsText(file);
  e.target.value='';
}

// ===================================================
