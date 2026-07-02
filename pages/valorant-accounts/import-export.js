/* ETHONE Valorant Accounts — import/export (JSON + CSV, CSV also covers Excel/Sheets via copy-paste-compatible files). */
(function(){
  "use strict";

  var EXPORT_FIELDS=["riotId","riotTag","password","inGameName","rank","region","authMethod","phone","email","ranked","notes","tags","lastLogin","lastModified","owner","skinValue"];

  function downloadBlob(content,filename,mime){
    var blob=new Blob([content],{type:mime});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;a.download=filename;a.click();
    URL.revokeObjectURL(url);
  }

  function csvEscape(v){
    v=v==null?"":String(v);
    if(/[",\n]/.test(v))return '"'+v.replace(/"/g,'""')+'"';
    return v;
  }
  function toCSV(accounts){
    var header=EXPORT_FIELDS.join(",");
    var rows=accounts.map(function(a){
      return EXPORT_FIELDS.map(function(f){
        var v=a[f];
        if(f==="tags")v=(a.tags||[]).join("|");
        return csvEscape(v);
      }).join(",");
    });
    return [header].concat(rows).join("\r\n");
  }
  function parseCSV(text){
    var rows=[],row=[],field="",inQuotes=false;
    for(var i=0;i<text.length;i++){
      var c=text[i],n=text[i+1];
      if(inQuotes){
        if(c==='"'&&n==='"'){field+='"';i++;}
        else if(c==='"'){inQuotes=false;}
        else field+=c;
      }else{
        if(c==='"')inQuotes=true;
        else if(c===","){row.push(field);field="";}
        else if(c==="\r"){/* skip */}
        else if(c==="\n"){row.push(field);rows.push(row);row=[];field="";}
        else field+=c;
      }
    }
    if(field.length||row.length){row.push(field);rows.push(row);}
    return rows.filter(function(r){return r.length>1||r[0]!=="";});
  }
  function csvToAccounts(text){
    var rows=parseCSV(text);
    if(!rows.length)return[];
    var header=rows[0].map(function(h){return h.trim();});
    return rows.slice(1).map(function(cells){
      var a=vaBlankAccount();
      header.forEach(function(h,i){
        var v=cells[i];
        if(v==null)return;
        if(h==="tags")a.tags=v.split("|").map(function(s){return s.trim();}).filter(Boolean);
        else if(h==="ranked")a.ranked=/^(oui|yes|true|1)$/i.test(v.trim());
        else if(h==="skinValue")a.skinValue=parseFloat(v)||0;
        else if(EXPORT_FIELDS.indexOf(h)>-1)a[h]=v;
      });
      return a;
    });
  }

  window.vaExportMenu=function(e){
    vaOpenDropdown(e.currentTarget,{
      title:"Exporter",
      searchable:false,
      items:[
        {value:"json",label:"Export JSON"},
        {value:"csv",label:"Export CSV (Excel / Sheets)"},
      ],
      onChange:function(v){
        var accounts=vaAccounts();
        if(!accounts.length){toast("Aucun compte à exporter","error");return;}
        var stamp=new Date().toISOString().slice(0,10);
        if(v==="json"){
          downloadBlob(JSON.stringify({valorantAccounts:accounts,exportedAt:new Date().toISOString(),version:1},null,2),"valorant-accounts-"+stamp+".json","application/json");
        }else{
          downloadBlob(toCSV(accounts),"valorant-accounts-"+stamp+".csv","text/csv");
        }
        toast("Export téléchargé","success");
      }
    });
  };

  window.vaImportFile=function(inputEl){
    var file=inputEl.files[0];if(!file)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var text=ev.target.result;
        var imported;
        if(file.name.toLowerCase().endsWith(".json")){
          var data=JSON.parse(text);
          imported=Array.isArray(data)?data:(data.valorantAccounts||[]);
          imported=imported.map(function(a){
            var b=vaBlankAccount();
            Object.keys(b).forEach(function(k){if(a[k]!==undefined)b[k]=a[k];});
            b.id=vaNewId();
            return b;
          });
        }else{
          imported=csvToAccounts(text);
        }
        if(!imported.length){toast("Aucune ligne valide trouvée","error");return;}
        if(!confirm("Importer "+imported.length+" compte(s) ? Ils seront ajoutés à la liste existante."))return;
        var list=vaAccounts();
        imported.forEach(function(a){list.push(a);});
        saveStateNow();
        toast(imported.length+" compte(s) importé(s)","success");
        vaRender();
      }catch(err){
        toast("Fichier invalide : "+err.message,"error");
      }finally{
        inputEl.value="";
      }
    };
    reader.readAsText(file);
  };
})();
